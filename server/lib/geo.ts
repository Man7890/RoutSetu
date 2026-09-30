import type { Destination } from "../../shared/types.ts";
import { HUBS } from "../../shared/seed.ts";
import { TTLCache, USER_AGENT, fetchJson } from "./cache.ts";

export interface GeoResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  source: "NOMINATIM" | "LOCAL";
}

const geoCache = new TTLCache<GeoResult[]>(24 * 60 * 60 * 1000);
let lastNominatim = 0;

const CITIES = [
  { name: "Raipur", lat: 21.2514, lon: 81.6296 },
  { name: "Bilaspur", lat: 22.0797, lon: 82.1409 },
  { name: "Durg", lat: 21.1904, lon: 81.2849 },
  { name: "Bhilai", lat: 21.2092, lon: 81.4285 },
  { name: "Kondagaon", lat: 19.5914, lon: 81.6639 },
  { name: "Kanker", lat: 20.2719, lon: 81.4918 },
  { name: "Dantewada", lat: 18.8954, lon: 81.3494 },
  { name: "Narayanpur", lat: 19.7148, lon: 81.2475 },
  { name: "Bijapur", lat: 18.8437, lon: 80.7718 },
  { name: "Sukma", lat: 18.3912, lon: 81.6588 },
];

function localSearch(q: string, dests: Destination[]): GeoResult[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const hubs = [...Object.values(HUBS), ...CITIES.filter((c) => !Object.values(HUBS).some((h) => h.name === c.name))].map((h) => ({
    name: h.name,
    displayName: `${h.name}, Chhattisgarh`,
    lat: h.lat,
    lon: h.lon,
    type: "city",
  }));
  const ds = dests.map((d) => ({ name: d.name, displayName: `${d.name}, ${d.region}, ${d.state}`, lat: d.latitude, lon: d.longitude, type: d.category }));
  return [...hubs, ...ds]
    .filter((x) => x.displayName.toLowerCase().includes(s) || s.includes(x.name.toLowerCase().split(",")[0]))
    .slice(0, 5)
    .map((x) => ({ ...x, source: "LOCAL" as const }));
}

/** Server-side Nominatim geocoding: cached, throttled to ≤1 req/s, with local fallback. */
export async function geocode(q: string, dests: Destination[]): Promise<GeoResult[]> {
  const key = q.trim().toLowerCase();
  const hit = geoCache.get(key);
  if (hit) return hit;
  const wait = Math.max(0, lastNominatim + 1100 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&countrycodes=in`;
    const rows = await fetchJson<{ name: string; display_name: string; lat: string; lon: string; type: string }[]>(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      timeoutMs: 6000,
    });
    const out: GeoResult[] = rows.map((r) => ({
      name: r.name || r.display_name.split(",")[0],
      displayName: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      type: r.type,
      source: "NOMINATIM",
    }));
    const final = out.length ? out : localSearch(q, dests);
    geoCache.set(key, final);
    return final;
  } catch (err) {
    console.warn(`[geocode] Nominatim unavailable, using local search: ${(err as Error).message}`);
    return localSearch(q, dests);
  }
}

const osmCache = new TTLCache<{ name: string; kind: string; lat: number; lon: number }[]>(6 * 60 * 60 * 1000, 100);

/** Optional Overpass enrichment: tourism-tagged OSM objects near a destination. Never required for core features. */
export async function nearbyOsm(d: Destination) {
  const hit = osmCache.get(d.id);
  if (hit) return hit;
  const q = `[out:json][timeout:20];(node["tourism"](around:15000,${d.latitude},${d.longitude});way["tourism"](around:15000,${d.latitude},${d.longitude}););out center tags 40;`;
  try {
    const res = await fetchJson<{ elements: { tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }[] }>(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(q)}`,
        timeoutMs: 12000,
      },
    );
    const out = res.elements
      .filter((e) => e.tags?.name)
      .map((e) => ({
        name: e.tags!.name,
        kind: e.tags!.tourism ?? "tourism",
        lat: e.lat ?? e.center?.lat ?? 0,
        lon: e.lon ?? e.center?.lon ?? 0,
      }))
      .slice(0, 12);
    osmCache.set(d.id, out);
    return out;
  } catch (err) {
    console.warn(`[overpass] unavailable: ${(err as Error).message}`);
    return [];
  }
}
