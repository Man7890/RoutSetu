import { PrismaClient } from "@prisma/client";
import type { Destination, Trip } from "../../shared/types.ts";
import { SEED_DESTINATIONS } from "../../shared/seed.ts";

export interface StoredEvent {
  id: string;
  destinationId: string;
  previousCrowdScore: number;
  newCrowdScore: number;
  triggerType: string;
  alternativeId: string | null;
  visitorsRedistributed: number;
  co2AvoidedKg: number;
  pressureReducedPct: number;
  createdAt: string;
}

export interface Repo {
  kind: "prisma" | "memory";
  listDestinations(): Promise<Destination[]>;
  updateVisitors(id: string, visitors: number, crowdScore: number, source: "SIMULATION" | "USER_REPORT" | "API"): Promise<void>;
  saveTrip(trip: Trip): Promise<void>;
  getTrip(id: string): Promise<Trip | null>;
  addEvent(ev: Omit<StoredEvent, "id" | "createdAt">): Promise<StoredEvent>;
  listEvents(limit?: number): Promise<StoredEvent[]>;
}

type DbDest = Omit<Destination, "tags" | "localOpportunities"> & { tags: string; localOpportunities: string };
const fromDb = (d: DbDest): Destination => ({
  ...d,
  tags: JSON.parse(d.tags),
  localOpportunities: JSON.parse(d.localOpportunities),
});
export const toDb = (d: Destination): DbDest => ({
  ...d,
  tags: JSON.stringify(d.tags),
  localOpportunities: JSON.stringify(d.localOpportunities),
});

function prismaRepo(db: PrismaClient): Repo {
  return {
    kind: "prisma",
    async listDestinations() {
      const rows = await db.destination.findMany({ orderBy: { popularityScore: "desc" } });
      return rows.map(fromDb);
    },
    async updateVisitors(id, visitors, crowdScore, source) {
      const d = await db.destination.update({ where: { id }, data: { currentVisitors: visitors, crowdScore } });
      await db.crowdSnapshot.create({
        data: { destinationId: id, visitorCount: visitors, crowdScore, capacityUtilization: visitors / d.capacity, source },
      });
    },
    async saveTrip(trip) {
      const p = trip.preferences;
      const data = {
        name: trip.name,
        origin: p.origin,
        destinationRegion: p.destinationRegion,
        startDate: p.startDate,
        endDate: trip.endDate,
        travelers: p.travelers,
        budget: p.budget,
        ecoPriority: p.ecoPriority,
        crowdTolerance: p.crowdTolerance,
        payload: JSON.stringify(trip),
      };
      await db.$transaction([
        db.trip.upsert({ where: { id: trip.id }, create: { id: trip.id, ...data }, update: data }),
        db.itineraryItem.deleteMany({ where: { tripId: trip.id } }),
        db.impactMetric.deleteMany({ where: { tripId: trip.id } }),
        db.itineraryItem.createMany({
          data: trip.items.map((i) => ({
            id: `${trip.id}_${i.id}`,
            tripId: trip.id,
            destinationId: i.destinationId,
            date: i.date,
            startTime: i.startTime,
            endTime: i.endTime,
            durationMinutes: i.durationMinutes,
            sequence: i.sequence,
            originalDestinationId: i.originalDestinationId ?? null,
            wasDiverted: i.wasDiverted,
            diversionReason: i.diversionReason ?? null,
          })),
        }),
        db.impactMetric.createMany({
          data: (["traditional", "optimized"] as const).map((k) => ({
            tripId: trip.id,
            kind: k.toUpperCase(),
            distanceKm: trip.impact[k].distanceKm,
            estimatedCO2Kg: trip.impact[k].estimatedCO2Kg,
            environmentalPressure: trip.impact[k].environmentalPressure,
            crowdExposure: trip.impact[k].crowdExposure,
            redistributedVisitors: k === "optimized" ? trip.impact.redistributedVisitors : 0,
          })),
        }),
      ]);
    },
    async getTrip(id) {
      const t = await db.trip.findUnique({ where: { id } });
      return t ? (JSON.parse(t.payload) as Trip) : null;
    },
    async addEvent(ev) {
      const e = await db.simulationEvent.create({ data: ev });
      return { ...e, createdAt: e.createdAt.toISOString() };
    },
    async listEvents(limit = 50) {
      const rows = await db.simulationEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit });
      return rows.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }));
    },
  };
}

function memoryRepo(): Repo {
  const dests = SEED_DESTINATIONS.map((d) => ({ ...d }));
  const trips = new Map<string, Trip>();
  const events: StoredEvent[] = [];
  return {
    kind: "memory",
    async listDestinations() {
      return dests.map((d) => ({ ...d }));
    },
    async updateVisitors(id, visitors, crowdScore) {
      const d = dests.find((x) => x.id === id);
      if (d) Object.assign(d, { currentVisitors: visitors, crowdScore });
    },
    async saveTrip(trip) {
      trips.set(trip.id, trip);
    },
    async getTrip(id) {
      return trips.get(id) ?? null;
    },
    async addEvent(ev) {
      const e = { ...ev, id: `ev_${Math.random().toString(36).slice(2, 10)}`, createdAt: new Date().toISOString() };
      events.unshift(e);
      return e;
    },
    async listEvents(limit = 50) {
      return events.slice(0, limit);
    },
  };
}

export async function createRepo(): Promise<Repo> {
  try {
    const db = new PrismaClient();
    const count = await db.destination.count();
    if (count === 0) throw new Error("Database is empty — run `npm run setup` to seed it.");
    console.log(`[repo] Using SQLite via Prisma (${count} destinations)`);
    return prismaRepo(db);
  } catch (err) {
    console.warn(`[repo] Prisma unavailable, falling back to in-memory seed data: ${(err as Error).message.split("\n")[0]}`);
    return memoryRepo();
  }
}
