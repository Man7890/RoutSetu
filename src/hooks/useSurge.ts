import { useState } from "react";
import { toast } from "sonner";
import type { SimulationResult } from "@shared/types";
import { api } from "@/lib/api";
import { useStore } from "@/store/useStore";

export function useSurge() {
  const trip = useStore((s) => s.trip);
  const prefs = useStore((s) => s.prefs);
  const setTrip = useStore((s) => s.setTrip);
  const upsertDestination = useStore((s) => s.upsertDestination);
  const setDestinations = useStore((s) => s.setDestinations);
  const setSimulation = useStore((s) => s.setSimulation);
  const [loading, setLoading] = useState(false);

  async function run(destinationId: string, opts: { surgePercent?: number; targetCrowd?: number }, applyToTrip: boolean): Promise<SimulationResult | null> {
    setLoading(true);
    try {
      const r = await api.surge({
        destinationId,
        ...opts,
        crowdTolerance: trip?.preferences.crowdTolerance ?? prefs.crowdTolerance,
        trip: applyToTrip ? trip : null,
      });
      upsertDestination(r.destination);
      setSimulation(r);
      if (r.trip) setTrip(r.trip);
      if (r.overloaded && r.diversions?.length) toast.success("RouteSetu detected a crowd surge and optimized your itinerary.");
      else if (r.overloaded) toast.warning(`${r.destination.name} is overloaded — load balancing activated.`);
      else toast(`${r.destination.name} now at ${r.destination.crowdScore}% — below the ${r.threshold}% diversion threshold.`);
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    try {
      const r = await api.reset();
      setDestinations(r.destinations, new Date().toISOString());
      setSimulation(null);
      toast.success("Simulation reset to baseline crowd levels");
    } finally {
      setLoading(false);
    }
  }

  return { run, reset, loading };
}
