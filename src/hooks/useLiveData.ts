import { useEffect } from "react";
import { api, setApiStatusListener } from "@/lib/api";
import { useStore } from "@/store/useStore";

/** Polls the simulated live crowd feed and loads weather once. Mounted once at app root. */
export function useLiveData(intervalMs = 8000) {
  const setDestinations = useStore((s) => s.setDestinations);
  const setWeather = useStore((s) => s.setWeather);
  const setApiOnline = useStore((s) => s.setApiOnline);

  useEffect(() => {
    setApiStatusListener(setApiOnline);
    let alive = true;
    const load = () =>
      api
        .destinations()
        .then((r) => alive && setDestinations(r.destinations, r.updatedAt))
        .catch(() => {});
    load();
    api
      .weather()
      .then((r) => alive && setWeather(r.weather))
      .catch(() => {});
    const t = setInterval(load, intervalMs);
    const w = setInterval(() => api.weather().then((r) => alive && setWeather(r.weather)).catch(() => {}), 15 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(w);
    };
  }, [intervalMs, setDestinations, setWeather, setApiOnline]);
}
