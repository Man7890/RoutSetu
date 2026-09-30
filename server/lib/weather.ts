import type { Destination, Weather } from "../../shared/types.ts";
import { weatherLabel } from "../../shared/engine.ts";
import { TTLCache, fetchJson } from "./cache.ts";

const cache = new TTLCache<Record<string, Weather>>(15 * 60 * 1000);

const CODES: [number[], string][] = [
  [[0], "Clear sky"],
  [[1, 2], "Partly cloudy"],
  [[3], "Overcast"],
  [[45, 48], "Fog"],
  [[51, 53, 55, 56, 57], "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain"],
  [[71, 73, 75, 77, 85, 86], "Snow"],
  [[95, 96, 99], "Thunderstorm"],
];
export const conditionFor = (code: number) => CODES.find(([c]) => c.includes(code))?.[1] ?? "Clear sky";

export function suitability(t: number, rain: number, wind: number, precip: number, code: number) {
  let s = 100 - rain * 0.45 - Math.max(0, Math.abs(t - 25) - 5) * 3 - Math.max(0, wind - 20) * 1.5 - precip * 5;
  if (code >= 95) s -= 25;
  return Math.round(Math.max(15, Math.min(100, s)));
}

interface OMResponse {
  current: { time: string; temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; precipitation: number; weather_code: number };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[]; wind_speed_10m: number[] };
}

function toWeather(id: string, r: OMResponse): Weather {
  const idx = Math.max(0, r.hourly.time.findIndex((t) => t >= r.current.time.slice(0, 13)));
  const rain = r.hourly.precipitation_probability[idx] ?? 0;
  const c = r.current;
  const s = suitability(c.temperature_2m, rain, c.wind_speed_10m, c.precipitation, c.weather_code);
  return {
    destinationId: id,
    temperature: Math.round(c.temperature_2m),
    humidity: Math.round(c.relative_humidity_2m),
    rainProbability: rain,
    windSpeed: Math.round(c.wind_speed_10m),
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    condition: conditionFor(c.weather_code),
    suitability: s,
    suitabilityLabel: weatherLabel(s),
    hourly: r.hourly.time.slice(idx, idx + 12).map((t, i) => ({
      time: t.slice(11, 16),
      temperature: Math.round(r.hourly.temperature_2m[idx + i]),
      rainProbability: r.hourly.precipitation_probability[idx + i] ?? 0,
    })),
    source: "OPEN_METEO",
    fetchedAt: new Date().toISOString(),
  };
}

/** Deterministic, plausible mock weather used whenever Open-Meteo is unreachable. */
export function fallbackWeather(d: Destination): Weather {
  let h = 0;
  for (const ch of d.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const month = new Date().getMonth();
  const monsoon = month >= 5 && month <= 8;
  const temp = 24 + (h % 8) - (monsoon ? 1 : 0);
  const rain = monsoon ? 35 + (h % 40) : 5 + (h % 20);
  const wind = 6 + (h % 12);
  const code = rain > 55 ? 61 : rain > 30 ? 2 : 0;
  const s = suitability(temp, rain, wind, 0, code);
  const now = new Date();
  return {
    destinationId: d.id,
    temperature: temp,
    humidity: monsoon ? 82 : 55,
    rainProbability: rain,
    windSpeed: wind,
    precipitation: 0,
    weatherCode: code,
    condition: conditionFor(code),
    suitability: s,
    suitabilityLabel: weatherLabel(s),
    hourly: Array.from({ length: 12 }, (_, i) => {
      const hr = (now.getHours() + i) % 24;
      return {
        time: `${String(hr).padStart(2, "0")}:00`,
        temperature: Math.round(temp + 4 * Math.sin(((hr - 9) / 24) * 2 * Math.PI)),
        rainProbability: Math.max(0, Math.min(100, rain + ((i * 7 + h) % 15) - 7)),
      };
    }),
    source: "FALLBACK",
    fetchedAt: now.toISOString(),
  };
}

/** Fetch weather for many destinations in a single Open-Meteo call (cached 15 min, falls back to mock). */
export async function getWeatherFor(dests: Destination[]): Promise<Record<string, Weather>> {
  const key = dests.map((d) => d.id).sort().join(",");
  const hit = cache.get(key);
  if (hit) return hit;
  const lat = dests.map((d) => d.latitude.toFixed(4)).join(",");
  const lon = dests.map((d) => d.longitude.toFixed(4)).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&forecast_days=2&timezone=auto`;
  let out: Record<string, Weather>;
  try {
    const res = await fetchJson<OMResponse | OMResponse[]>(url, { timeoutMs: 6000 });
    const arr = Array.isArray(res) ? res : [res];
    out = Object.fromEntries(dests.map((d, i) => [d.id, arr[i] ? toWeather(d.id, arr[i]) : fallbackWeather(d)]));
  } catch (err) {
    console.warn(`[weather] Open-Meteo unavailable, using fallback: ${(err as Error).message}`);
    out = Object.fromEntries(dests.map((d) => [d.id, fallbackWeather(d)]));
    cache.set(key, out);
    return out;
  }
  cache.set(key, out);
  return out;
}
