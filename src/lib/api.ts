import type {
  Alternative,
  CommandStats,
  CrowdStatus,
  Destination,
  Diversion,
  ImpactComparison,
  SimulationResult,
  Trip,
  TripPreferences,
  Weather,
} from "@shared/types";
import { offline } from "./offline";

let onStatus: (online: boolean) => void = () => {};
export const setApiStatusListener = (fn: (online: boolean) => void) => {
  onStatus = fn;
};

/** fetch → API → on network/5xx failure use local fallback so the app never breaks. */
async function request<T>(path: string, init: RequestInit | undefined, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (res.status >= 500) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error ?? `HTTP ${res.status}`), { client: true });
    onStatus(true);
    return data as T;
  } catch (err) {
    if ((err as { client?: boolean }).client) throw err;
    console.warn(`[api] ${path} failed, using offline fallback`, err);
    onStatus(false);
    return fallback();
  }
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export interface DestinationDetail {
  destination: Destination;
  status: CrowdStatus;
  weather?: Weather;
  alternatives: Alternative[];
  trend: { time: string; crowd: number; balanced: number }[];
}

export const api = {
  destinations: () =>
    request<{ destinations: Destination[]; updatedAt: string }>("/destinations", undefined, () => offline.destinations()),
  destination: (id: string, tolerance = 60) =>
    request<DestinationDetail>(`/destinations/${id}?tolerance=${tolerance}`, undefined, () => offline.destination(id, tolerance)),
  osm: (id: string) =>
    request<{ places: { name: string; kind: string; lat: number; lon: number }[] }>(`/destinations/${id}/osm`, undefined, () => ({ places: [] })),
  weather: () => request<{ weather: Record<string, Weather> }>("/weather", undefined, () => ({ weather: offline.weather() })),
  geocode: (q: string) =>
    request<{ results: { name: string; displayName: string; lat: number; lon: number; source: string }[] }>(
      `/geocode?q=${encodeURIComponent(q)}`,
      undefined,
      () => ({ results: [] }),
    ),
  generate: (prefs: TripPreferences) => request<{ trip: Trip }>("/itinerary/generate", post(prefs), () => offline.generate(prefs)),
  optimize: (trip: Trip) =>
    request<{ trip: Trip; newDiversions: Diversion[] }>("/itinerary/optimize", post(trip), () => offline.optimize(trip)),
  surge: (body: { destinationId: string; surgePercent?: number; targetCrowd?: number; crowdTolerance?: number; trip?: Trip | null }) =>
    request<SimulationResult>("/simulation/crowd-surge", post({ ...body, trip: body.trip ?? undefined }), () =>
      offline.surge({ ...body, trip: body.trip ?? undefined }),
    ),
  reset: () => request<{ ok: boolean; destinations: Destination[] }>("/simulation/reset", post({}), () => offline.reset()),
  report: (destinationId: string, crowdScore: number) =>
    request<{ destination: Destination }>("/crowd/report", post({ destinationId, crowdScore }), () => offline.report(destinationId, crowdScore)),
  stats: () => request<CommandStats>("/stats", undefined, () => offline.stats()),
  trip: (id: string) =>
    request<{ trip: Trip }>(`/trips/${id}`, undefined, () => {
      throw Object.assign(new Error("Trip unavailable offline"), { client: true });
    }),
  impact: (tripId: string) =>
    request<{ impact: ImpactComparison; diversions: Diversion[] }>(`/impact/${tripId}`, undefined, () => {
      throw new Error("offline");
    }),
};
