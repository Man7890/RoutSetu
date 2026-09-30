import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { Trip, TripPreferences, SimulationResult, CommandStats, Destination } from "../../shared/types.ts";
import {
  compareImpact,
  crowdStatus,
  diversionThreshold,
  generateOptimized,
  generateTraditional,
  hourlyTrend,
  idleKm,
  optimizeItinerary,
  redistribute,
  scoreAlternatives,
  addDays,
  vehiclesFor,
  ASSUMPTIONS,
} from "../../shared/engine.ts";
import type { Repo } from "../lib/repo.ts";
import type { LiveCrowd } from "../lib/live.ts";
import { getWeatherFor } from "../lib/weather.ts";
import { geocode, nearbyOsm } from "../lib/geo.ts";

const interests = z.enum(["nature", "waterfalls", "wildlife", "culture", "adventure", "heritage", "food", "photography", "rural"]);

const prefsSchema = z.object({
  name: z.string().max(80).optional(),
  origin: z.string().min(1).max(120),
  destinationRegion: z.string().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(7),
  travelers: z.number().int().min(1).max(40),
  budget: z.number().min(0).max(10_000_000),
  interests: z.array(interests).max(9),
  pace: z.enum(["relaxed", "balanced", "packed"]),
  ecoPriority: z.number().min(0).max(100),
  crowdTolerance: z.number().min(0).max(100),
});

const itemSchema = z.object({
  id: z.string(),
  destinationId: z.string(),
  day: z.number().int(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.number(),
  travelMinutes: z.number(),
  travelKm: z.number(),
  sequence: z.number().int(),
  originalDestinationId: z.string().nullable().optional(),
  wasDiverted: z.boolean(),
  diversionReason: z.string().nullable().optional(),
});

const tripInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  preferences: prefsSchema,
  items: z.array(itemSchema).max(40),
  traditionalItems: z.array(itemSchema).max(40),
  diversions: z.array(z.any()).optional(),
  createdAt: z.string().optional(),
});

const surgeSchema = z.object({
  destinationId: z.string(),
  surgePercent: z.number().min(-100).max(100).optional(),
  targetCrowd: z.number().min(0).max(100).optional(),
  crowdTolerance: z.number().min(0).max(100).optional(),
  trip: tripInputSchema.optional(),
});

const reportSchema = z.object({ destinationId: z.string(), crowdScore: z.number().min(0).max(100) });

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

function tripName(p: TripPreferences) {
  return p.name?.trim() || `${p.days}-day ${p.destinationRegion.split(/[,/]/)[0].trim()} eco trip`;
}

export function apiRouter(repo: Repo, live: LiveCrowd) {
  const r = Router();

  const withWeather = async (dests: Destination[]) => getWeatherFor(dests);

  function buildTrip(prefs: TripPreferences, weather: Awaited<ReturnType<typeof withWeather>>, id?: string, createdAt?: string): Trip {
    const pool = live.list();
    const traditionalItems = generateTraditional(prefs, pool);
    const { items, diversions } = generateOptimized(prefs, pool, weather);
    return {
      id: id ?? `trip_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: tripName(prefs),
      preferences: prefs,
      items,
      traditionalItems,
      diversions,
      impact: compareImpact(traditionalItems, items, pool, prefs, diversions.length),
      createdAt: createdAt ?? new Date().toISOString(),
      endDate: addDays(prefs.startDate, prefs.days - 1),
    };
  }

  r.get("/health", (_req, res) => res.json({ ok: true, repo: repo.kind, updatedAt: live.updatedAt }));

  r.get(
    "/destinations",
    wrap(async (_req, res) => {
      res.json({ destinations: live.list(), updatedAt: live.updatedAt, simulated: true });
    }),
  );

  r.get(
    "/destinations/:id",
    wrap(async (req, res) => {
      const d = live.get(req.params.id);
      if (!d) return res.status(404).json({ error: "Destination not found" });
      const pool = live.list();
      const weather = await withWeather(pool);
      const tolerance = Number(req.query.tolerance ?? 60);
      const threshold = diversionThreshold(tolerance);
      const alternatives = scoreAlternatives(d, pool, { interests: d.tags, ecoPriority: 60, threshold, weather }).slice(0, 4);
      res.json({
        destination: d,
        status: crowdStatus(d.crowdScore),
        weather: weather[d.id],
        alternatives,
        trend: hourlyTrend(d, threshold),
      });
    }),
  );

  r.get(
    "/destinations/:id/osm",
    wrap(async (req, res) => {
      const d = live.get(req.params.id);
      if (!d) return res.status(404).json({ error: "Destination not found" });
      res.json({ places: await nearbyOsm(d) });
    }),
  );

  r.get(
    "/crowd",
    wrap(async (_req, res) => {
      const list = live.list().map((d) => ({
        destinationId: d.id,
        crowdScore: d.crowdScore,
        currentVisitors: d.currentVisitors,
        capacity: d.capacity,
        capacityUtilization: Math.round((d.currentVisitors / d.capacity) * 100),
        status: crowdStatus(d.crowdScore),
        source: "SIMULATION",
      }));
      res.json({ crowd: list, updatedAt: live.updatedAt, label: "Prototype Live Simulation" });
    }),
  );

  r.post(
    "/crowd/report",
    wrap(async (req, res) => {
      const body = reportSchema.parse(req.body);
      const d = await live.report(body.destinationId, body.crowdScore);
      res.json({ destination: d, status: crowdStatus(d.crowdScore) });
    }),
  );

  r.get(
    "/weather",
    wrap(async (_req, res) => {
      res.json({ weather: await withWeather(live.list()) });
    }),
  );

  r.get(
    "/weather/:destinationId",
    wrap(async (req, res) => {
      const d = live.get(req.params.destinationId);
      if (!d) return res.status(404).json({ error: "Destination not found" });
      const all = await withWeather(live.list());
      res.json({ weather: all[d.id] });
    }),
  );

  r.get(
    "/geocode",
    wrap(async (req, res) => {
      const q = z.string().min(2).max(120).parse(req.query.q);
      res.json({ results: await geocode(q, live.list()) });
    }),
  );

  r.post(
    "/itinerary/generate",
    wrap(async (req, res) => {
      const prefs = prefsSchema.parse(req.body);
      const weather = await withWeather(live.list());
      const trip = buildTrip(prefs, weather);
      await repo.saveTrip(trip);
      res.json({ trip, weather });
    }),
  );

  r.post(
    "/itinerary/optimize",
    wrap(async (req, res) => {
      const input = tripInputSchema.parse(req.body);
      const pool = live.list();
      const weather = await withWeather(pool);
      const { items, diversions } = optimizeItinerary(input.items, input.preferences, pool, weather);
      const allDiversions = [...(input.diversions ?? []), ...diversions];
      const trip: Trip = {
        id: input.id ?? `trip_${Date.now().toString(36)}`,
        name: input.name ?? tripName(input.preferences),
        preferences: input.preferences,
        items,
        traditionalItems: input.traditionalItems,
        diversions: allDiversions,
        impact: compareImpact(input.traditionalItems, items, pool, input.preferences, allDiversions.length),
        createdAt: input.createdAt ?? new Date().toISOString(),
        endDate: addDays(input.preferences.startDate, input.preferences.days - 1),
      };
      await repo.saveTrip(trip);
      res.json({ trip, newDiversions: diversions });
    }),
  );

  r.get(
    "/trips/:id",
    wrap(async (req, res) => {
      const t = await repo.getTrip(req.params.id);
      if (!t) return res.status(404).json({ error: "Trip not found" });
      res.json({ trip: t });
    }),
  );

  r.get(
    "/impact/:tripId",
    wrap(async (req, res) => {
      const t = await repo.getTrip(req.params.tripId);
      if (!t) return res.status(404).json({ error: "Trip not found" });
      res.json({ tripId: t.id, impact: t.impact, diversions: t.diversions, assumptions: ASSUMPTIONS });
    }),
  );

  r.post(
    "/simulation/crowd-surge",
    wrap(async (req, res) => {
      const body = surgeSchema.parse(req.body);
      if (body.surgePercent == null && body.targetCrowd == null) body.surgePercent = 25;
      const { before, after } = await live.applySurge(body.destinationId, {
        points: body.surgePercent,
        target: body.targetCrowd,
      });
      const pool = live.list();
      const weather = await withWeather(pool);
      const tolerance = body.trip?.preferences.crowdTolerance ?? body.crowdTolerance ?? 60;
      const threshold = diversionThreshold(tolerance);
      const overloaded = after.crowdScore >= threshold;
      const excludeIds = body.trip ? body.trip.items.map((i) => i.destinationId) : [];
      const alternatives = scoreAlternatives(after, pool, {
        interests: body.trip?.preferences.interests ?? after.tags,
        ecoPriority: body.trip?.preferences.ecoPriority ?? 60,
        threshold,
        excludeIds,
        weather,
      }).slice(0, 4);
      const { bars, visitorsRedistributed, pressureReducedPct } = overloaded
        ? redistribute(after, alternatives, pool)
        : { bars: [], visitorsRedistributed: 0, pressureReducedPct: 0 };

      const best = alternatives[0] ? pool.find((d) => d.id === alternatives[0].destinationId) : undefined;
      const co2 = best
        ? (visitorsRedistributed / ASSUMPTIONS.travelersPerVehicle) *
          Math.max(0, idleKm(after.crowdScore) - idleKm(best.crowdScore)) *
          ASSUMPTIONS.co2KgPerVehicleKm
        : 0;
      const ev = await repo.addEvent({
        destinationId: after.id,
        previousCrowdScore: before,
        newCrowdScore: after.crowdScore,
        triggerType: body.targetCrowd != null ? "CRITICAL_PRESET" : "MANUAL_SURGE",
        alternativeId: overloaded && best ? best.id : null,
        visitorsRedistributed,
        co2AvoidedKg: Math.round(co2 * 10) / 10,
        pressureReducedPct,
      });

      const result: SimulationResult = {
        event: ev,
        destination: after,
        status: crowdStatus(after.crowdScore),
        threshold,
        overloaded,
        alternatives,
        redistribution: bars,
        visitorsRedistributed,
      };

      if (body.trip) {
        const t = body.trip;
        const { items, diversions } = optimizeItinerary(t.items, t.preferences, pool, weather);
        const allDiversions = [...(t.diversions ?? []), ...diversions];
        const trip: Trip = {
          id: t.id ?? `trip_${Date.now().toString(36)}`,
          name: t.name ?? tripName(t.preferences),
          preferences: t.preferences,
          items,
          traditionalItems: t.traditionalItems,
          diversions: allDiversions,
          impact: compareImpact(t.traditionalItems, items, pool, t.preferences, allDiversions.length),
          createdAt: t.createdAt ?? new Date().toISOString(),
          endDate: addDays(t.preferences.startDate, t.preferences.days - 1),
        };
        await repo.saveTrip(trip);
        result.trip = trip;
        result.diversions = diversions;
      }
      res.json(result);
    }),
  );

  r.post(
    "/simulation/reset",
    wrap(async (_req, res) => {
      await live.reset();
      res.json({ ok: true, destinations: live.list() });
    }),
  );

  r.get(
    "/simulation/events",
    wrap(async (_req, res) => {
      res.json({ events: await repo.listEvents(30) });
    }),
  );

  r.get(
    "/stats",
    wrap(async (_req, res) => {
      const pool = live.list();
      const events = await repo.listEvents(100);
      const name = (id: string | null) => pool.find((d) => d.id === id)?.name ?? id ?? "—";
      const diversions = events.filter((e) => e.alternativeId);
      const stats: CommandStats = {
        monitored: pool.length,
        critical: pool.filter((d) => crowdStatus(d.crowdScore) === "CRITICAL").length,
        high: pool.filter((d) => crowdStatus(d.crowdScore) === "HIGH").length,
        lowAlternatives: pool.filter((d) => crowdStatus(d.crowdScore) === "LOW").length,
        visitorsRedistributed: events.reduce((s, e) => s + e.visitorsRedistributed, 0),
        co2AvoidedKg: Math.round(events.reduce((s, e) => s + e.co2AvoidedKg, 0) * 10) / 10,
        pressureReductionPct: diversions.length
          ? Math.round(diversions.reduce((s, e) => s + e.pressureReducedPct, 0) / diversions.length)
          : 0,
        events: events.slice(0, 12),
        activeDiversions: diversions.slice(0, 8).map((e) => {
          const to = pool.find((d) => d.id === e.alternativeId);
          return {
            id: e.id,
            from: name(e.destinationId),
            to: name(e.alternativeId),
            fromCrowd: e.newCrowdScore,
            toCrowd: to?.crowdScore ?? 0,
            visitors: e.visitorsRedistributed,
            createdAt: e.createdAt,
          };
        }),
      };
      res.json(stats);
    }),
  );

  r.get("/assumptions", (_req, res) => res.json({ assumptions: ASSUMPTIONS, vehiclesFor: vehiclesFor(4) }));

  return r;
}
