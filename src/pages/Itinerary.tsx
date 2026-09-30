import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Award, Bookmark, CalendarDays, Clock, CloudSun, Download, Leaf, Loader2, MapPinned, RefreshCw, Route, Sparkles, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Destination, ItineraryItem, Trip } from "@shared/types";
import { diversionThreshold } from "@shared/engine";
import { HUBS } from "@shared/seed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/Layout";
import { CrowdMeter } from "@/components/CrowdMeter";
import { SimBadge, StatusBadge } from "@/components/StatusBadge";
import { CrowdMap } from "@/components/CrowdMap";
import { SmartDiversionCard } from "@/components/SmartDiversionCard";
import { WhyRecommendation } from "@/components/WhyRecommendation";
import { LocalImpact } from "@/components/LocalImpact";
import { SurgeControl } from "@/components/SurgeControl";
import { ImpactCompareChart } from "@/components/charts/ImpactCompareChart";
import { ShareTripDialog, ecoScoreOf } from "@/components/ShareTripDialog";
import { DestVisual, ecoImpactLabel } from "@/components/DestVisual";
import { CountUp } from "@/components/CountUp";
import { api } from "@/lib/api";
import { useDestMap, useStore } from "@/store/useStore";
import { cn, fmtDate, fmtINR, fmtMinutes } from "@/lib/utils";

function StopCard({ item, d, original }: { item: ItineraryItem; d: Destination; original?: Destination }) {
  const weather = useStore((s) => s.weather[d.id]);
  const eco = ecoImpactLabel(d);
  return (
    <motion.div
      layout
      key={`${item.id}-${d.id}`}
      initial={{ opacity: 0, x: 40, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
    >
      <Card className={cn("overflow-hidden p-0", item.wasDiverted && "ring-2 ring-status-alt/50")}>
        <div className="grid sm:grid-cols-[140px_1fr]">
          <DestVisual d={d} className="h-24 sm:h-full">
            <div className="absolute bottom-2 left-3 rounded-full bg-black/30 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">
              {item.startTime}–{item.endTime}
            </div>
          </DestVisual>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link to={`/destination/${d.id}`} className="font-bold text-forest hover:underline dark:text-mint">
                  {d.name}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="capitalize">{d.category}</span>
                  <span className="flex items-center gap-1">
                    <Route className="h-3 w-3" /> {item.travelKm} km · {fmtMinutes(item.travelMinutes)} drive
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmtMinutes(item.durationMinutes)} visit
                  </span>
                </div>
              </div>
              <StatusBadge score={d.crowdScore} pulse={d.crowdScore >= 85} />
            </div>
            {item.wasDiverted && original && (
              <div className="flex items-center gap-2 rounded-xl bg-sky-soft px-3 py-1.5 text-xs font-semibold text-[#1F6E99] dark:bg-sky/15 dark:text-sky">
                <Sparkles className="h-3.5 w-3.5" /> Diverted from {original.name} ({original.crowdScore}% crowd)
              </div>
            )}
            <CrowdMeter value={d.crowdScore} size="sm" />
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Info label="Crowd" value={`${d.crowdScore}%`} />
              <Info label="Weather" value={weather?.suitabilityLabel ?? "—"} sub={weather ? `${weather.temperature}°C` : undefined} />
              <Info label="Eco impact" value={eco.label} color={eco.color} />
              <Info label="Recommended" value={`${String(d.bestStartHour).padStart(2, "0")}:00–${String(d.bestEndHour).padStart(2, "0")}:00`} />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function Info({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-bold" style={color ? { color } : undefined}>
        {value} {sub && <span className="font-normal text-muted-foreground">· {sub}</span>}
      </div>
    </div>
  );
}

function Badges({ trip }: { trip: Trip }) {
  const pool = useDestMap();
  const eco = ecoScoreOf(trip, pool);
  const local = Math.round(trip.items.reduce((s, i) => s + (pool.get(i.destinationId)?.localEconomyScore ?? 0), 0) / (trip.items.length || 1));
  const badges = [
    { on: trip.diversions.length > 0, title: "Crowd Dodger", text: "Accepted a smart diversion" },
    { on: trip.impact.co2SavedKg > 0, title: "Low-Carbon Explorer", text: "Beat the traditional plan on CO₂" },
    { on: local >= 65, title: "Local Champion", text: "High local-economy stops" },
    { on: trip.impact.optimized.highPressureStops <= 1, title: "Gentle Footprint", text: "≤1 high-pressure stop" },
  ];
  const score = Math.min(100, Math.round(eco * 0.6 + badges.filter((b) => b.on).length * 10));
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eco Traveler Score</div>
          <div className="metric">
            <CountUp value={score} />
            <span className="text-base text-muted-foreground">/100</span>
          </div>
        </div>
        <Award className="h-10 w-10 text-status-moderate" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {badges.map((b) => (
          <div key={b.title} className={cn("rounded-xl border p-2.5 text-xs transition-opacity", b.on ? "border-eco/30 bg-mint-soft dark:bg-white/5" : "opacity-45")}>
            <div className="font-bold">{b.title}</div>
            <div className="text-muted-foreground">{b.text}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Itinerary() {
  const { trip, setTrip, saveTrip, savedTrips, prefs } = useStore();
  const pool = useDestMap();
  const destinations = useStore((s) => s.destinations);
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = params.get("trip");
    if (id && id !== trip?.id) {
      const local = savedTrips.find((t) => t.id === id);
      if (local) setTrip(local);
      else api.trip(id).then((r) => setTrip(r.trip)).catch(() => toast.error("Couldn't load that shared trip"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const days = useMemo(() => {
    if (!trip) return [];
    const m = new Map<number, ItineraryItem[]>();
    trip.items.forEach((i) => m.set(i.day, [...(m.get(i.day) ?? []), i]));
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [trip]);

  if (!trip) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <CalendarDays className="h-12 w-12 text-eco" />
        <h1 className="text-3xl font-extrabold">No itinerary yet</h1>
        <p className="max-w-md text-muted-foreground">Plan a trip and RouteSetu will build a crowd-aware, eco-balanced itinerary.</p>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/plan">Plan my trip</Link>
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await api.generate(prefs).finally(() => setBusy(false));
              setTrip(r.trip);
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Load demo trip
          </Button>
        </div>
      </div>
    );
  }

  const imp = trip.impact;
  const lastDiv = trip.diversions[trip.diversions.length - 1];
  const threshold = diversionThreshold(trip.preferences.crowdTolerance);
  const route: [number, number][] = [];
  days.forEach(([, items]) => {
    route.push([HUBS.jagdalpur.lat, HUBS.jagdalpur.lon]);
    items.forEach((i) => {
      const d = pool.get(i.destinationId);
      if (d) route.push([d.latitude, d.longitude]);
    });
  });
  route.push([HUBS.jagdalpur.lat, HUBS.jagdalpur.lon]);
  const stops = trip.items.map((i) => pool.get(i.destinationId)).filter((d): d is Destination => !!d);
  const overBudget = imp.optimized.estimatedCost > trip.preferences.budget;
  const isSaved = savedTrips.some((t) => t.id === trip.id);

  async function reoptimize() {
    if (!trip) return;
    setBusy(true);
    try {
      const r = await api.optimize(trip);
      setTrip(r.trip);
      toast[r.newDiversions.length ? "success" : "info"](
        r.newDiversions.length ? "RouteSetu detected a crowd surge and optimized your itinerary." : "All stops are below your diversion threshold — no changes needed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <PageHeader
        eyebrow={`${trip.preferences.days}-day itinerary · ${fmtDate(trip.preferences.startDate)} → ${fmtDate(trip.endDate)}`}
        title={trip.name}
        subtitle={`${trip.preferences.origin} → ${trip.preferences.destinationRegion} · ${trip.preferences.travelers} travelers · ${trip.preferences.pace} pace`}
        actions={
          <>
            <Button variant="outline" onClick={reoptimize} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Re-check crowds
            </Button>
            <Button
              variant={isSaved ? "secondary" : "outline"}
              onClick={() => {
                saveTrip(trip);
                toast.success("Trip saved to this browser");
              }}
            >
              <Bookmark /> {isSaved ? "Saved" : "Save"}
            </Button>
            <ShareTripDialog trip={trip} />
            <Button variant="outline" onClick={() => window.print()} className="no-print">
              <Download /> PDF
            </Button>
          </>
        }
      />

      <AnimatePresence>
        {lastDiv && pool.get(lastDiv.newDestinationId) && pool.get(lastDiv.originalDestinationId) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
            <Card className="border-status-alt/30 bg-gradient-to-r from-sky-soft to-mint-soft p-5 dark:from-sky/10 dark:to-eco/10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-status-alt text-white">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-forest dark:text-mint">RouteSetu detected a crowd surge and optimized your itinerary.</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-status-critical line-through decoration-2">{pool.get(lastDiv.originalDestinationId)!.name}</span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-semibold text-status-low">{pool.get(lastDiv.newDestinationId)!.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{lastDiv.reason}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-card px-3 py-1">{lastDiv.alternative.crowdReductionPct}% less crowded</span>
                  <span className="rounded-full bg-card px-3 py-1">
                    {lastDiv.alternative.timeSavedMinutes >= 0 ? `${fmtMinutes(lastDiv.alternative.timeSavedMinutes)} saved` : `${fmtMinutes(lastDiv.alternative.timeSavedMinutes)} extra`}
                  </span>
                  <span className="rounded-full bg-card px-3 py-1">{lastDiv.alternative.experienceMatch}% experience match</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="rounded-full bg-forest px-3 py-1 text-white dark:bg-mint dark:text-forest">Why?</button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogTitle className="sr-only">Why this recommendation</DialogTitle>
                      <WhyRecommendation name={pool.get(lastDiv.newDestinationId)!.name} alternative={lastDiv.alternative} />
                      <div className="mt-4">
                        <LocalImpact destination={pool.get(lastDiv.newDestinationId)!} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { icon: Route, label: "Distance", value: imp.optimized.distanceKm, suffix: " km", sub: `${imp.distanceDeltaKm >= 0 ? "−" : "+"}${Math.abs(imp.distanceDeltaKm)} km vs traditional` },
          { icon: Leaf, label: "Est. CO₂", value: imp.optimized.estimatedCO2Kg, suffix: " kg", decimals: 1, sub: `${imp.co2SavedKg >= 0 ? "−" : "+"}${Math.abs(imp.co2SavedKg)} kg vs traditional` },
          { icon: MapPinned, label: "Crowd exposure", value: imp.optimized.crowdExposure, suffix: "%", sub: imp.optimized.crowdExposureLabel },
          { icon: Clock, label: "Time saved", value: Math.max(0, imp.timeSavedMinutes), suffix: " min", sub: "incl. congestion delays" },
          { icon: Wallet, label: "Est. cost", value: imp.optimized.estimatedCost, prefix: "₹", sub: overBudget ? `Over budget (${fmtINR(trip.preferences.budget)})` : `Within ${fmtINR(trip.preferences.budget)}` },
        ].map((m) => (
          <Card key={m.label} className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <m.icon className="h-4 w-4 text-eco" /> {m.label}
            </div>
            <div className="mt-1 text-2xl font-extrabold text-forest dark:text-mint">
              <CountUp value={m.value} decimals={m.decimals} suffix={m.suffix} prefix={m.prefix} />
            </div>
            <div className={cn("text-xs", m.label === "Est. cost" && overBudget ? "text-status-high" : "text-muted-foreground")}>{m.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-8">
          {days.map(([day, items]) => (
            <section key={day}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-forest px-3 py-1 text-sm font-bold text-white dark:bg-mint dark:text-forest">Day {day}</span>
                <span className="text-sm text-muted-foreground">{fmtDate(items[0].date)}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CloudSun className="h-3.5 w-3.5" /> Start from Jagdalpur hub
                </span>
              </div>
              <div className="relative space-y-3 border-l-2 border-dashed border-eco/30 pl-4 sm:pl-6">
                <AnimatePresence initial={false}>
                  {items.map((it) => {
                    const d = pool.get(it.destinationId);
                    return d ? <StopCard key={`${it.id}-${d.id}`} item={it} d={d} original={it.originalDestinationId ? pool.get(it.originalDestinationId) : undefined} /> : null;
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden p-0">
            <CrowdMap
              destinations={destinations}
              weather={useStore.getState().weather}
              fitIds={stops.map((s) => s.id)}
              route={route}
              alternativeIds={trip.items.filter((i) => i.wasDiverted).map((i) => i.destinationId)}
              tolerance={trip.preferences.crowdTolerance}
              className="h-72"
            />
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>What-if crowd surge</CardTitle>
                <SimBadge label="Simulation" />
              </div>
            </CardHeader>
            <CardContent>
              <SurgeControl options={stops} defaultId={stops.find((s) => s.id === "chitrakote-falls")?.id ?? stops[0]?.id} compact />
            </CardContent>
          </Card>
          {lastDiv && pool.get(lastDiv.newDestinationId) && pool.get(lastDiv.originalDestinationId) && (
            <SmartDiversionCard
              original={pool.get(lastDiv.originalDestinationId)!}
              originalCrowd={lastDiv.originalCrowd}
              alternative={lastDiv.alternative}
              altDestination={pool.get(lastDiv.newDestinationId)!}
              onApply={() => {}}
              applied
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Before vs after load balancing</CardTitle>
            </CardHeader>
            <CardContent>
              <ImpactCompareChart impact={imp} height={220} />
              <p className="mt-2 text-xs text-muted-foreground">
                Traditional = popularity-ranked, crowd-unaware plan with the same interests. All figures are estimates. Diversion threshold: {threshold}%.
              </p>
            </CardContent>
          </Card>
          <Badges trip={trip} />
        </aside>
      </div>
    </div>
  );
}
