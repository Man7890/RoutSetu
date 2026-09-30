import type {
  Alternative,
  CrowdStatus,
  Destination,
  Diversion,
  ImpactComparison,
  ImpactSummary,
  Interest,
  ItineraryItem,
  LoadBar,
  Pace,
  TripPreferences,
  Weather,
} from "./types";
import { HUBS } from "./seed";

/* ---------- Constants (transparent estimation assumptions) ---------- */
export const ASSUMPTIONS = {
  roadFactor: 1.35,
  avgSpeedKmh: 38,
  co2KgPerVehicleKm: 0.171,
  travelersPerVehicle: 4,
  costPerVehicleKm: 14,
  congestionDelayPerPoint: 1.2,
  congestionStartsAt: 50,
  idleKmPerPointAbove70: 0.25,
  targetUtilization: 70,
};

const HUB = HUBS.jagdalpur;
type LatLon = { lat: number; lon: number };
const ll = (d: Destination): LatLon => ({ lat: d.latitude, lon: d.longitude });

/* ---------- Geo ---------- */
export function haversineKm(a: LatLon, b: LatLon) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export const roadKm = (a: LatLon, b: LatLon) => haversineKm(a, b) * ASSUMPTIONS.roadFactor;
export const driveMinutes = (km: number) => (km / ASSUMPTIONS.avgSpeedKmh) * 60;

/* ---------- Crowd ---------- */
export function crowdStatus(score: number): CrowdStatus {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}
export const STATUS_COLORS: Record<CrowdStatus, string> = {
  LOW: "#2E8B57",
  MODERATE: "#E0A72F",
  HIGH: "#E07832",
  CRITICAL: "#D64545",
};
export const ALT_COLOR = "#3B82F6";

/** Crowd score above which RouteSetu diverts. Higher tolerance → higher threshold (80–95). */
export function diversionThreshold(crowdTolerance: number) {
  return Math.round(Math.min(95, Math.max(80, 80 + crowdTolerance * 0.15)));
}
export function congestionDelayMinutes(crowd: number) {
  return Math.max(0, crowd - ASSUMPTIONS.congestionStartsAt) * ASSUMPTIONS.congestionDelayPerPoint;
}
export function idleKm(crowd: number) {
  return Math.max(0, crowd - 70) * ASSUMPTIONS.idleKmPerPointAbove70;
}
export function pressureOf(d: Pick<Destination, "crowdScore" | "environmentalSensitivity">, crowd = d.crowdScore) {
  return crowd * (0.5 + d.environmentalSensitivity / 200);
}
export const vehiclesFor = (travelers: number) => Math.max(1, Math.ceil(travelers / ASSUMPTIONS.travelersPerVehicle));

/* ---------- Matching ---------- */
export function experienceSimilarity(a: Destination, b: Destination) {
  const A = new Set(a.tags);
  const B = new Set(b.tags);
  const inter = [...A].filter((t) => B.has(t)).length;
  const union = new Set([...A, ...B]).size || 1;
  const jaccard = inter / union;
  const cat = a.category === b.category ? 1 : 0;
  return 0.5 * cat + 0.5 * jaccard;
}
export function interestMatch(d: Destination, interests: Interest[]) {
  if (!interests.length) return 0.5;
  const hits = d.tags.filter((t) => interests.includes(t)).length;
  return Math.min(1, hits / Math.min(interests.length, 3));
}
export function weatherScore(weather: Record<string, Weather | undefined>, id: string) {
  return (weather[id]?.suitability ?? 75) / 100;
}
export function weatherLabel(score: number): Weather["suitabilityLabel"] {
  if (score >= 80) return "Excellent";
  if (score >= 62) return "Good";
  if (score >= 45) return "Fair";
  return "Poor";
}

/* ---------- Load balancing: alternative scoring ---------- */
export interface AltContext {
  interests: Interest[];
  ecoPriority: number;
  threshold: number;
  excludeIds?: string[];
  weather?: Record<string, Weather | undefined>;
  prev?: LatLon;
  next?: LatLon;
  travelers?: number;
}

export function scoreAlternatives(original: Destination, pool: Destination[], ctx: AltContext): Alternative[] {
  const weather = ctx.weather ?? {};
  const prev = ctx.prev ?? HUB;
  const next = ctx.next ?? HUB;
  const origLeg = roadKm(prev, ll(original)) + roadKm(ll(original), next);
  const origCo2 = origLeg + idleKm(original.crowdScore);
  const origPressure = pressureOf(original) || 1;
  const eco = ctx.ecoPriority / 100;
  const W = {
    exp: 0.3,
    crowd: 0.22,
    dist: 0.12,
    weather: 0.08,
    env: 0.06 + 0.08 * eco,
    local: 0.1,
    cost: 0.04,
    time: 0.04,
  };
  const maxRaw = W.exp + W.crowd + W.dist + W.weather + W.env + W.local;
  const minRaw = -(W.cost + W.time);

  return pool
    .filter((c) => c.id !== original.id && !(ctx.excludeIds ?? []).includes(c.id) && c.crowdScore < ctx.threshold - 10)
    .map((c) => {
      const sim = experienceSimilarity(original, c);
      const exp = 0.7 * sim + 0.3 * interestMatch(c, ctx.interests);
      const crowd = 1 - c.crowdScore / 100;
      const fromOrig = roadKm(ll(original), ll(c));
      const dist = Math.max(0, 1 - fromOrig / 90);
      const wx = weatherScore(weather, c.id);
      const env = 0.5 * (c.ecoScore / 100) + 0.5 * (1 - c.environmentalSensitivity / 100);
      const local = c.localEconomyScore / 100;
      const cost = Math.min(1, c.averageCost / 500);
      const altLeg = roadKm(prev, ll(c)) + roadKm(ll(c), next);
      const extraKm = altLeg - origLeg;
      const time = Math.min(1, Math.max(0, driveMinutes(extraKm)) / 120);
      const raw =
        W.exp * exp + W.crowd * crowd + W.dist * dist + W.weather * wx + W.env * env + W.local * local - W.cost * cost - W.time * time;
      const score = Math.round(((raw - minRaw) / (maxRaw - minRaw)) * 100);

      const timeSaved = Math.round(
        congestionDelayMinutes(original.crowdScore) - congestionDelayMinutes(c.crowdScore) - driveMinutes(extraKm),
      );
      const altCo2 = altLeg + idleKm(c.crowdScore);
      const co2ImpactPct = Math.round(((altCo2 - origCo2) / (origCo2 || 1)) * 100);
      const pressureReducedPct = Math.round(((origPressure - pressureOf(c)) / origPressure) * 100);
      const crowdReductionPct = Math.round(((original.crowdScore - c.crowdScore) / (original.crowdScore || 1)) * 100);
      const expPct = Math.round(exp * 100);

      const reasons: string[] = [
        `${expPct}% experience similarity`,
        `${crowdReductionPct}% lower crowd density`,
        extraKm >= 0 ? `${Math.round(extraKm)} km additional travel` : `${Math.round(-extraKm)} km shorter route`,
      ];
      const wxO = weatherScore(weather, original.id);
      if (wx > wxO + 0.03) reasons.push("Better weather conditions");
      else if (wx >= 0.62) reasons.push(`${weatherLabel(wx * 100)} weather conditions`);
      if (c.localEconomyScore >= 70) reasons.push("High local economic opportunity");
      if (pressureReducedPct > 0) reasons.push("Lower environmental pressure");

      return {
        destinationId: c.id,
        score: Math.max(0, Math.min(100, score)),
        experienceMatch: expPct,
        crowdScore: c.crowdScore,
        extraDistanceKm: Math.round(extraKm * 10) / 10,
        distanceFromOriginalKm: Math.round(fromOrig * 10) / 10,
        timeSavedMinutes: timeSaved,
        pressureReducedPct,
        co2ImpactPct,
        crowdReductionPct,
        weatherLabel: weatherLabel(wx * 100),
        breakdown: {
          experienceMatch: Math.round(exp * 100),
          crowdAvailability: Math.round(crowd * 100),
          distance: Math.round(dist * 100),
          weather: Math.round(wx * 100),
          environment: Math.round(env * 100),
          localEconomy: Math.round(local * 100),
          travelCost: Math.round(cost * 100),
          travelTime: Math.round(time * 100),
        },
        reasons,
      } satisfies Alternative;
    })
    .filter((a) => a.experienceMatch >= 30)
    .sort((a, b) => b.score - a.score);
}

/* ---------- Itinerary generation ---------- */
export const STOPS_PER_DAY: Record<Pace, number> = { relaxed: 2, balanced: 3, packed: 4 };

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
export const fmtTime = (mins: number) => `${pad(mins / 60)}:${pad(mins % 60)}`;
export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

type ItemMeta = Pick<ItineraryItem, "originalDestinationId" | "wasDiverted" | "diversionReason" | "id">;

function uid(prefix = "it") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function selectDestinations(prefs: TripPreferences, pool: Destination[]) {
  const n = Math.min(pool.length, prefs.days * STOPS_PER_DAY[prefs.pace]);
  return [...pool]
    .map((d) => ({ d, s: 0.35 * interestMatch(d, prefs.interests) + 0.65 * (d.popularityScore / 100) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.d);
}

function nearestNeighborOrder(stops: Destination[]) {
  const left = [...stops];
  const out: Destination[] = [];
  let cur: LatLon = HUB;
  while (left.length) {
    let bi = 0;
    let bd = Infinity;
    left.forEach((d, i) => {
      const k = haversineKm(cur, ll(d));
      if (k < bd) {
        bd = k;
        bi = i;
      }
    });
    const [pick] = left.splice(bi, 1);
    out.push(pick);
    cur = ll(pick);
  }
  return out;
}

/** Build a timed day-by-day schedule from an ordered list of destinations. */
export function schedule(
  ordered: Destination[],
  prefs: TripPreferences,
  meta?: Map<number, ItemMeta>,
  perDay = STOPS_PER_DAY[prefs.pace],
): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  let day = 1;
  let clock = 0;
  let cur: LatLon = HUB;
  ordered.forEach((d, i) => {
    const dayIdx = Math.floor(i / perDay) + 1;
    if (dayIdx !== day || i === 0) {
      day = dayIdx;
      cur = HUB;
      clock = Math.max(6 * 60 + 30, Math.min(8 * 60, d.bestStartHour * 60 - 45));
    }
    const km = roadKm(cur, ll(d));
    const travel = Math.round(driveMinutes(km));
    let start = clock + travel;
    if (start > 12 * 60 + 45 && start < 14 * 60) start += 45; // lunch
    start = Math.ceil(start / 5) * 5;
    const dur = d.averageVisitMinutes;
    const m = meta?.get(i);
    items.push({
      id: m?.id ?? uid(),
      destinationId: d.id,
      day,
      date: addDays(prefs.startDate, day - 1),
      startTime: fmtTime(start),
      endTime: fmtTime(start + dur),
      durationMinutes: dur,
      travelMinutes: travel,
      travelKm: Math.round(km * 10) / 10,
      sequence: i + 1,
      originalDestinationId: m?.originalDestinationId ?? null,
      wasDiverted: m?.wasDiverted ?? false,
      diversionReason: m?.diversionReason ?? null,
    });
    clock = start + dur;
    cur = ll(d);
  });
  return items;
}

/** Traditional planner: popularity-ranked order, no crowd awareness, no route optimisation. */
export function generateTraditional(prefs: TripPreferences, pool: Destination[]) {
  const picked = selectDestinations(prefs, pool).sort((a, b) => b.popularityScore - a.popularityScore);
  return schedule(picked, prefs);
}

/** Crowd-aware planner: same experience set, diverts overloaded stops, optimises route order. */
export function generateOptimized(
  prefs: TripPreferences,
  pool: Destination[],
  weather: Record<string, Weather | undefined> = {},
) {
  const picked = selectDestinations(prefs, pool);
  const base = schedule(nearestNeighborOrder(picked), prefs);
  return optimizeItinerary(base, prefs, pool, weather);
}

/** Replace any stop above the diversion threshold with the best alternative, then re-route and re-time. */
export function optimizeItinerary(
  items: ItineraryItem[],
  prefs: TripPreferences,
  pool: Destination[],
  weather: Record<string, Weather | undefined> = {},
  forceIds: string[] = [],
): { items: ItineraryItem[]; diversions: Diversion[] } {
  const byId = new Map(pool.map((d) => [d.id, d]));
  const threshold = diversionThreshold(prefs.crowdTolerance);
  const diversions: Diversion[] = [];
  const used = new Set(items.map((i) => i.destinationId));
  const working = items.map((it) => ({ ...it }));

  working.forEach((it, idx) => {
    const d = byId.get(it.destinationId);
    if (!d) return;
    if (d.crowdScore < threshold && !forceIds.includes(d.id)) return;
    const prevItem = working[idx - 1];
    const nextItem = working[idx + 1];
    const prevD = prevItem && prevItem.day === it.day ? byId.get(prevItem.destinationId) : undefined;
    const nextD = nextItem && nextItem.day === it.day ? byId.get(nextItem.destinationId) : undefined;
    const alts = scoreAlternatives(d, pool, {
      interests: prefs.interests,
      ecoPriority: prefs.ecoPriority,
      threshold,
      excludeIds: [...used],
      weather,
      prev: prevD ? ll(prevD) : undefined,
      next: nextD ? ll(nextD) : undefined,
      travelers: prefs.travelers,
    });
    const best = alts[0];
    if (!best) return;
    const nd = byId.get(best.destinationId)!;
    const reason = `${d.name} reached ${d.crowdScore}% crowd (${crowdStatus(d.crowdScore)}), above your ${threshold}% diversion threshold.`;
    diversions.push({
      itemId: it.id,
      originalDestinationId: d.id,
      newDestinationId: nd.id,
      originalCrowd: d.crowdScore,
      newCrowd: nd.crowdScore,
      reason,
      alternative: best,
    });
    used.delete(d.id);
    used.add(nd.id);
    it.originalDestinationId = it.originalDestinationId ?? d.id;
    it.destinationId = nd.id;
    it.wasDiverted = true;
    it.diversionReason = reason;
  });

  // Re-route each day with nearest-neighbour and re-time.
  const days = [...new Set(working.map((w) => w.day))].sort((a, b) => a - b);
  const out: ItineraryItem[] = [];
  days.forEach((day) => {
    const dayItems = working.filter((w) => w.day === day);
    const dests = nearestNeighborOrder(dayItems.map((w) => byId.get(w.destinationId)).filter((d): d is Destination => !!d));
    const meta = new Map<number, ItemMeta>();
    dests.forEach((d, i) => meta.set(i, dayItems.find((w) => w.destinationId === d.id)!));
    const dayPrefs = { ...prefs, startDate: addDays(prefs.startDate, day - 1) };
    schedule(dests, dayPrefs, meta, Math.max(1, dests.length)).forEach((it) =>
      out.push({ ...it, day, sequence: out.length + 1 }),
    );
  });
  return { items: out, diversions };
}

/* ---------- Impact ---------- */
export function computeImpact(items: ItineraryItem[], pool: Destination[], prefs: TripPreferences): ImpactSummary {
  const byId = new Map(pool.map((d) => [d.id, d]));
  const vehicles = vehiclesFor(prefs.travelers);
  let km = 0;
  let idle = 0;
  let minutes = 0;
  let cost = 0;
  let pressure = 0;
  let crowdSum = 0;
  let high = 0;
  const days = [...new Set(items.map((i) => i.day))];
  items.forEach((it) => {
    const d = byId.get(it.destinationId);
    if (!d) return;
    km += it.travelKm;
    idle += idleKm(d.crowdScore);
    minutes += it.travelMinutes + it.durationMinutes + congestionDelayMinutes(d.crowdScore);
    cost += d.averageCost * prefs.travelers;
    pressure += pressureOf(d);
    crowdSum += d.crowdScore;
    if (d.crowdScore >= 70) high++;
  });
  days.forEach((day) => {
    const last = [...items].filter((i) => i.day === day).sort((a, b) => a.sequence - b.sequence).pop();
    const d = last && byId.get(last.destinationId);
    if (d) {
      const back = roadKm(ll(d), HUB);
      km += back;
      minutes += driveMinutes(back);
    }
  });
  const n = items.length || 1;
  const exposure = Math.round(crowdSum / n);
  cost += km * ASSUMPTIONS.costPerVehicleKm * vehicles;
  return {
    distanceKm: Math.round(km),
    estimatedCO2Kg: Math.round((km + idle) * ASSUMPTIONS.co2KgPerVehicleKm * vehicles * 10) / 10,
    environmentalPressure: Math.round(pressure / n),
    crowdExposure: exposure,
    crowdExposureLabel: crowdStatus(exposure),
    highPressureStops: high,
    totalMinutes: Math.round(minutes),
    estimatedCost: Math.round(cost / 10) * 10,
  };
}

export function compareImpact(
  traditional: ItineraryItem[],
  optimized: ItineraryItem[],
  pool: Destination[],
  prefs: TripPreferences,
  diversionCount: number,
): ImpactComparison {
  const t = computeImpact(traditional, pool, prefs);
  const o = computeImpact(optimized, pool, prefs);
  const pct = (a: number, b: number) => (a ? Math.round(((a - b) / a) * 100) : 0);
  return {
    traditional: t,
    optimized: o,
    co2SavedKg: Math.round((t.estimatedCO2Kg - o.estimatedCO2Kg) * 10) / 10,
    distanceDeltaKm: t.distanceKm - o.distanceKm,
    pressureReducedPct: pct(t.environmentalPressure, o.environmentalPressure),
    crowdExposureReducedPct: pct(t.crowdExposure, o.crowdExposure),
    timeSavedMinutes: t.totalMinutes - o.totalMinutes,
    redistributedVisitors: diversionCount * prefs.travelers,
  };
}

/* ---------- Regional redistribution ---------- */
export function redistribute(original: Destination, alternatives: Alternative[], pool: Destination[]) {
  const byId = new Map(pool.map((d) => [d.id, d]));
  const target = ASSUMPTIONS.targetUtilization / 100;
  const overflow = Math.max(0, original.currentVisitors - Math.round(original.capacity * target));
  const alts = alternatives
    .slice(0, 3)
    .map((a) => byId.get(a.destinationId)!)
    .filter(Boolean);
  const room = alts.map((d) => Math.max(0, Math.round(d.capacity * target) - d.currentVisitors));
  const totalRoom = room.reduce((s, r) => s + r, 0);
  const movable = Math.min(overflow, totalRoom);
  const moved = room.map((r) => (totalRoom ? Math.round((movable * r) / totalRoom) : 0));
  const movedTotal = moved.reduce((s, m) => s + m, 0);
  const bars: LoadBar[] = [
    {
      destinationId: original.id,
      name: original.name,
      before: original.crowdScore,
      after: Math.round(((original.currentVisitors - movedTotal) / original.capacity) * 100),
    },
    ...alts.map((d, i) => ({
      destinationId: d.id,
      name: d.name,
      before: d.crowdScore,
      after: Math.round(((d.currentVisitors + moved[i]) / d.capacity) * 100),
    })),
  ];
  const peak = (key: "before" | "after") =>
    Math.max(...bars.map((b) => pressureOf(byId.get(b.destinationId) ?? original, b[key])));
  const peakBefore = peak("before");
  const pressureReducedPct = peakBefore ? Math.round(((peakBefore - peak("after")) / peakBefore) * 100) : 0;
  return { bars, visitorsRedistributed: movedTotal, pressureReducedPct };
}

/* ---------- Simulated hourly trend ---------- */
const CURVE: [number, number][] = [
  [6, 18],
  [8, 27],
  [10, 51],
  [12, 72],
  [14, 89],
  [16, 94],
  [18, 71],
];
export function hourlyTrend(d: Destination, threshold = 85) {
  const scale = Math.min(1.08, (d.crowdScore + 8) / 94);
  return CURVE.map(([h, v]) => {
    const crowd = Math.min(100, Math.round(v * scale));
    const balanced = crowd > threshold - 10 ? Math.round(threshold - 10 + (crowd - threshold + 10) * 0.25) : crowd;
    return { time: `${pad(h)}:00`, crowd, balanced };
  });
}
