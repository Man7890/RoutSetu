import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Leaf, Users } from "lucide-react";
import type { CommandStats } from "@shared/types";
import { ASSUMPTIONS } from "@shared/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/Layout";
import { ImpactRing } from "@/components/ImpactRing";
import { SimBadge } from "@/components/StatusBadge";
import { ImpactCompareChart } from "@/components/charts/ImpactCompareChart";
import { api } from "@/lib/api";
import { useDestMap, useStore } from "@/store/useStore";

export default function Impact() {
  const trip = useStore((s) => s.trip);
  const lastSim = useStore((s) => s.lastSimulation);
  const pool = useDestMap();
  const [stats, setStats] = useState<CommandStats | null>(null);
  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  const altIds = useMemo(() => {
    const s = new Set<string>();
    trip?.diversions.forEach((d) => s.add(d.newDestinationId));
    stats?.activeDiversions.forEach((a) => {
      const d = [...pool.values()].find((x) => x.name === a.to);
      if (d) s.add(d.id);
    });
    return [...s];
  }, [trip, stats, pool]);
  const localOpps = altIds.reduce((n, id) => n + (pool.get(id)?.localOpportunities.length ?? 0), 0);

  const imp = trip?.impact;
  const peakReduction = lastSim?.redistribution.length
    ? Math.round(((lastSim.redistribution[0].before - lastSim.redistribution[0].after) / lastSim.redistribution[0].before) * 100)
    : imp?.crowdExposureReducedPct ?? 0;

  return (
    <div className="container">
      <PageHeader
        eyebrow="Impact report"
        title="What load balancing achieves"
        subtitle={trip ? `Your trip “${trip.name}” plus regional simulation results.` : "Regional simulation results. Plan a trip to add your personal impact."}
        actions={<SimBadge label="Estimates · prototype simulation" />}
      />

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Users className="h-5 w-5 text-status-alt" /> Tourism impact
        </h2>
        <Card className="grid gap-8 p-8 sm:grid-cols-2 lg:grid-cols-3">
          <ImpactRing value={stats?.visitorsRedistributed ?? 0} max={Math.max(600, (stats?.visitorsRedistributed ?? 0) * 1.2)} suffix="" label="Visitors redistributed" sub="Regional, simulated" color="#3B82F6" />
          <ImpactRing value={Math.max(0, peakReduction)} label="Crowd concentration reduction" sub={lastSim ? `At ${lastSim.destination.name}` : "Your trip's crowd exposure"} color="#5BA7D1" />
          <ImpactRing value={imp?.redistributedVisitors ?? 0} max={Math.max(10, (imp?.redistributedVisitors ?? 0) * 2)} suffix="" label="Your travellers diverted" sub="From overloaded stops" color="#12372A" />
        </Card>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Leaf className="h-5 w-5 text-eco" /> Environmental impact
        </h2>
        <Card className="grid gap-8 p-8 sm:grid-cols-2 lg:grid-cols-4">
          <ImpactRing value={Math.max(0, imp?.co2SavedKg ?? 0)} max={Math.max(20, (imp?.co2SavedKg ?? 0) * 1.5)} suffix=" kg" decimals={1} label="Trip CO₂ saved" sub="vs traditional plan" />
          <ImpactRing value={stats?.co2AvoidedKg ?? 0} max={Math.max(150, (stats?.co2AvoidedKg ?? 0) * 1.2)} suffix=" kg" label="Regional CO₂ avoided" sub="Congestion idling avoided" />
          <ImpactRing value={Math.max(0, imp?.distanceDeltaKm ?? 0)} max={Math.max(50, (imp?.distanceDeltaKm ?? 0) * 1.5)} suffix=" km" label="Distance optimized" sub="Route re-ordering" color="#5BA7D1" />
          <ImpactRing value={Math.max(0, imp?.pressureReducedPct ?? stats?.pressureReductionPct ?? 0)} label="Environmental pressure reduction" sub={imp ? "Your trip" : "Regional peak"} color="#E0A72F" />
        </Card>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Building2 className="h-5 w-5 text-status-moderate" /> Community impact
        </h2>
        <Card className="grid gap-8 p-8 sm:grid-cols-2">
          <ImpactRing value={altIds.length} max={Math.max(6, altIds.length)} suffix="" label="Alternative destinations promoted" color="#2E8B57" />
          <ImpactRing value={localOpps} max={Math.max(15, localOpps)} suffix="" label="Local opportunities supported" sub="Homestays, guides, crafts, food" color="#E0A72F" />
        </Card>
      </section>

      {imp ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Traditional vs RouteSetu itinerary</CardTitle>
            </CardHeader>
            <CardContent>
              <ImpactCompareChart impact={imp} />
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {(
              [
                ["Traditional itinerary", imp.traditional, "border-status-high/30"],
                ["RouteSetu itinerary", imp.optimized, "border-eco/40"],
              ] as const
            ).map(([title, s, cls]) => (
              <Card key={title} className={`p-5 ${cls}`}>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</div>
                <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Distance</dt>
                  <dd className="text-right font-bold">{s.distanceKm} km</dd>
                  <dt className="text-muted-foreground">Estimated CO₂</dt>
                  <dd className="text-right font-bold">{s.estimatedCO2Kg} kg</dd>
                  <dt className="text-muted-foreground">Overcrowding exposure</dt>
                  <dd className="text-right font-bold">{s.crowdExposureLabel}</dd>
                  <dt className="text-muted-foreground">Environmental pressure</dt>
                  <dd className="text-right font-bold">{s.environmentalPressure}/100</dd>
                  <dt className="text-muted-foreground">High-pressure stops</dt>
                  <dd className="text-right font-bold">{s.highPressureStops}</dd>
                </dl>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="mt-10 flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-muted-foreground">Generate an itinerary to see a personal before/after comparison.</p>
          <Button asChild>
            <Link to="/plan">Plan a trip</Link>
          </Button>
        </Card>
      )}

      <Card className="mt-10 p-6 text-sm text-muted-foreground">
        <b className="text-foreground">How these are estimated.</b> CO₂ uses {ASSUMPTIONS.co2KgPerVehicleKm} kg per vehicle-km with {ASSUMPTIONS.travelersPerVehicle} travellers per vehicle, plus an idling/parking-search allowance at crowded sites. Distances use straight-line × {ASSUMPTIONS.roadFactor}. Crowd values come from the prototype live simulation — not real visitor counts. <Link to="/about" className="font-semibold text-eco hover:underline">Full methodology →</Link>
      </Card>
    </div>
  );
}
