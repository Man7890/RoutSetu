/**
 * Browser-side fallback used only when the RouteSetu API is unreachable.
 * Mirrors the server engine with seeded data so the demo never breaks.
 */
import type { CommandStats, Destination, SimulationResult, Trip, TripPreferences, Weather } from "@shared/types";
import { SEED_DESTINATIONS, crowdFromVisitors } from "@shared/seed";
import {
  addDays,
  compareImpact,
  crowdStatus,
  diversionThreshold,
  generateOptimized,
  generateTraditional,
  hourlyTrend,
  optimizeItinerary,
  redistribute,
  scoreAlternatives,
  weatherLabel,
} from "@shared/engine";

const dests: Destination[] = SEED_DESTINATIONS.map((d) => ({ ...d }));
const events: SimulationResult["event"][] = [];
let redistributed = 438;
let co2 = 86;

const list = () => dests.map((d) => ({ ...d }));

export const offline = {
  destinations: () => ({ destinations: list(), updatedAt: new Date().toISOString(), simulated: true }),
  weather(): Record<string, Weather> {
    return Object.fromEntries(
      dests.map((d) => {
        const s = 70 + (d.id.length % 20);
        return [
          d.id,
          {
            destinationId: d.id,
            temperature: 26,
            humidity: 70,
            rainProbability: 20,
            windSpeed: 9,
            precipitation: 0,
            weatherCode: 2,
            condition: "Partly cloudy",
            suitability: s,
            suitabilityLabel: weatherLabel(s),
            hourly: [],
            source: "FALLBACK",
            fetchedAt: new Date().toISOString(),
          } satisfies Weather,
        ];
      }),
    );
  },
  destination(id: string, tolerance = 60) {
    const d = dests.find((x) => x.id === id);
    if (!d) throw new Error("Destination not found");
    const threshold = diversionThreshold(tolerance);
    return {
      destination: { ...d },
      status: crowdStatus(d.crowdScore),
      weather: this.weather()[id],
      alternatives: scoreAlternatives(d, list(), { interests: d.tags, ecoPriority: 60, threshold }).slice(0, 4),
      trend: hourlyTrend(d, threshold),
    };
  },
  generate(prefs: TripPreferences): { trip: Trip } {
    const pool = list();
    const traditionalItems = generateTraditional(prefs, pool);
    const { items, diversions } = generateOptimized(prefs, pool);
    return {
      trip: {
        id: `trip_${Date.now().toString(36)}`,
        name: prefs.name || `${prefs.days}-day Bastar eco trip`,
        preferences: prefs,
        items,
        traditionalItems,
        diversions,
        impact: compareImpact(traditionalItems, items, pool, prefs, diversions.length),
        createdAt: new Date().toISOString(),
        endDate: addDays(prefs.startDate, prefs.days - 1),
      },
    };
  },
  optimize(trip: Trip) {
    const pool = list();
    const { items, diversions } = optimizeItinerary(trip.items, trip.preferences, pool);
    const all = [...trip.diversions, ...diversions];
    return {
      trip: { ...trip, items, diversions: all, impact: compareImpact(trip.traditionalItems, items, pool, trip.preferences, all.length) },
      newDiversions: diversions,
    };
  },
  surge(body: { destinationId: string; surgePercent?: number; targetCrowd?: number; crowdTolerance?: number; trip?: Trip }): SimulationResult {
    const d = dests.find((x) => x.id === body.destinationId);
    if (!d) throw new Error("Destination not found");
    const before = d.crowdScore;
    const target = body.targetCrowd ?? before + (body.surgePercent ?? 25);
    d.currentVisitors = Math.max(0, Math.min(d.capacity, Math.round((target / 100) * d.capacity)));
    d.crowdScore = crowdFromVisitors(d.currentVisitors, d.capacity);
    const pool = list();
    const tolerance = body.trip?.preferences.crowdTolerance ?? body.crowdTolerance ?? 60;
    const threshold = diversionThreshold(tolerance);
    const overloaded = d.crowdScore >= threshold;
    const alternatives = scoreAlternatives(d, pool, {
      interests: body.trip?.preferences.interests ?? d.tags,
      ecoPriority: body.trip?.preferences.ecoPriority ?? 60,
      threshold,
      excludeIds: body.trip?.items.map((i) => i.destinationId),
    }).slice(0, 4);
    const { bars, visitorsRedistributed } = overloaded ? redistribute(d, alternatives, pool) : { bars: [], visitorsRedistributed: 0 };
    redistributed += visitorsRedistributed;
    co2 += Math.round(visitorsRedistributed * 0.25);
    const event = {
      id: `ev_${Date.now()}`,
      destinationId: d.id,
      previousCrowdScore: before,
      newCrowdScore: d.crowdScore,
      triggerType: "MANUAL_SURGE",
      createdAt: new Date().toISOString(),
    };
    events.unshift(event);
    const result: SimulationResult = {
      event,
      destination: { ...d },
      status: crowdStatus(d.crowdScore),
      threshold,
      overloaded,
      alternatives,
      redistribution: bars,
      visitorsRedistributed,
    };
    if (body.trip) {
      const o = this.optimize(body.trip);
      result.trip = o.trip;
      result.diversions = o.newDiversions;
    }
    return result;
  },
  reset() {
    dests.forEach((d) => {
      d.currentVisitors = d.baseVisitors;
      d.crowdScore = crowdFromVisitors(d.baseVisitors, d.capacity);
    });
    return { ok: true, destinations: list() };
  },
  stats(): CommandStats {
    return {
      monitored: dests.length,
      critical: dests.filter((d) => crowdStatus(d.crowdScore) === "CRITICAL").length,
      high: dests.filter((d) => crowdStatus(d.crowdScore) === "HIGH").length,
      lowAlternatives: dests.filter((d) => crowdStatus(d.crowdScore) === "LOW").length,
      visitorsRedistributed: redistributed,
      co2AvoidedKg: co2,
      pressureReductionPct: 20,
      events,
      activeDiversions: [],
    };
  },
};
