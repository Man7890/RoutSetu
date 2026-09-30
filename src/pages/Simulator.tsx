import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { SimulationResult } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/Layout";
import { SimBadge, StatusBadge } from "@/components/StatusBadge";
import { SurgeControl } from "@/components/SurgeControl";
import { SmartDiversionCard } from "@/components/SmartDiversionCard";
import { WhyRecommendation } from "@/components/WhyRecommendation";
import { LocalImpact } from "@/components/LocalImpact";
import { LoadDistribution } from "@/components/charts/LoadDistribution";
import { CrowdMap } from "@/components/CrowdMap";
import { api } from "@/lib/api";
import { useDestMap, useStore } from "@/store/useStore";
import { fmtMinutes } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function Simulator() {
  const t = useT();
  const destinations = useStore((s) => s.destinations);
  const weather = useStore((s) => s.weather);
  const trip = useStore((s) => s.trip);
  const setTrip = useStore((s) => s.setTrip);
  const stored = useStore((s) => s.lastSimulation);
  const pool = useDestMap();
  const [result, setResult] = useState<SimulationResult | null>(stored);
  const [applied, setApplied] = useState(false);
  const options = [...destinations].sort((a, b) => b.popularityScore - a.popularityScore);

  const best = result?.alternatives[0];
  const bestDest = best ? pool.get(best.destinationId) : undefined;
  const orig = result ? pool.get(result.destination.id) ?? result.destination : undefined;
  const autoApplied = !!result?.diversions?.length;

  async function apply() {
    if (trip && !autoApplied) {
      const r = await api.optimize(trip);
      setTrip(r.trip);
      toast.success(r.newDiversions.length ? "Diversion applied to your itinerary" : "Your itinerary is already balanced");
    } else {
      toast.success(`${result?.visitorsRedistributed ?? 0} simulated visitors redirected across alternatives`);
    }
    setApplied(true);
  }

  return (
    <div className="container">
      <PageHeader
        eyebrow={t("simEyebrow")}
        title={t("simTitle")}
        subtitle={t("simSub")}
        actions={<SimBadge />}
      />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <SurgeControl
              options={options}
              onResult={(r) => {
                setResult(r);
                setApplied(!!r.diversions?.length);
              }}
            />
          </Card>
          {trip ? (
            <Card className="p-4 text-sm">
              Surges re-plan <b>{trip.name}</b> when "Re-plan my itinerary" is on.{" "}
              <Link to="/itinerary" className="font-semibold text-eco hover:underline">
                View itinerary →
              </Link>
            </Card>
          ) : (
            <Card className="p-4 text-sm text-muted-foreground">
              Tip: <Link to="/plan" className="font-semibold text-eco hover:underline">plan a trip</Link> first to see your itinerary re-plan automatically.
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="overflow-hidden">
                  <CrowdMap destinations={destinations} weather={weather} className="h-[420px]" />
                </Card>
              </motion.div>
            ) : (
              <motion.div key={result.event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <Card className={result.overloaded ? "border-status-critical/40 bg-status-critical/5" : "border-status-moderate/40"}>
                  <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <motion.div animate={result.overloaded ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 1.2 }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-status-critical text-white">
                        <AlertTriangle className="h-6 w-6" />
                      </motion.div>
                      <div>
                        <div className="text-sm font-extrabold tracking-wide text-status-critical">{result.overloaded ? t("surgeDetected") : t("increaseLogged")}</div>
                        <div className="text-xl font-extrabold">{result.destination.name}</div>
                        <div className="text-2xl font-extrabold tabular-nums">
                          <span className="text-muted-foreground">{result.event.previousCrowdScore}%</span> → <span className="text-status-critical">{result.event.newCrowdScore}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm sm:max-w-[240px] sm:text-right">
                      {result.overloaded ? (
                        <span className="flex items-center gap-1.5 font-semibold text-eco sm:justify-end">
                          <CheckCircle2 className="h-4 w-4 shrink-0" /> {t("lbActivated")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Below the {result.threshold}% diversion threshold — no diversion needed yet. Try a bigger surge.</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {result.overloaded && !best && (
                  <Card className="p-6 text-sm text-muted-foreground">
                    No comparable destination is below the diversion threshold right now — try resetting the simulation.
                  </Card>
                )}
                {result.overloaded && best && bestDest && orig && (
                  <>
                    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                      <Card className="p-6">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-2xl border-2 border-status-critical/40 bg-status-critical/5 p-4">
                            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("original")}</div>
                            <div className="mt-1 text-lg font-extrabold">{orig.name}</div>
                            <div className="text-3xl font-extrabold text-status-critical">{result.destination.crowdScore}%</div>
                            <StatusBadge score={result.destination.crowdScore} pulse />
                          </motion.div>
                          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, y: [0, 6, 0] }} transition={{ delay: 0.4, y: { repeat: Infinity, duration: 1.6 } }}>
                            <ArrowDown className="h-8 w-8 text-eco" />
                          </motion.div>
                          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.7, type: "spring" }} className="w-full rounded-2xl border-2 border-status-low/40 bg-status-low/5 p-4">
                            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("optimized")}</div>
                            <div className="mt-1 text-lg font-extrabold">{bestDest.name}</div>
                            <div className="text-3xl font-extrabold text-status-low">{best.crowdScore}%</div>
                            <div className="mt-1 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                              <span className="rounded-full bg-card px-2 py-0.5">{best.experienceMatch}% match</span>
                              <span className="rounded-full bg-card px-2 py-0.5">{best.timeSavedMinutes >= 0 ? `${fmtMinutes(best.timeSavedMinutes)} saved` : `${fmtMinutes(best.timeSavedMinutes)} extra`}</span>
                              <span className="rounded-full bg-card px-2 py-0.5">−{best.pressureReducedPct}% pressure</span>
                            </div>
                          </motion.div>
                        </div>
                      </Card>
                      <SmartDiversionCard original={orig} originalCrowd={result.destination.crowdScore} alternative={best} altDestination={bestDest} onApply={apply} applied={applied} />
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t("redistribution")}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          ~{result.visitorsRedistributed.toLocaleString("en-IN")} simulated visitors re-routed to bring {orig.name} toward 70% utilisation.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <LoadDistribution bars={result.redistribution} />
                      </CardContent>
                    </Card>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <Card className="p-6">
                        <WhyRecommendation name={bestDest.name} alternative={best} />
                      </Card>
                      <div className="space-y-6">
                        <LocalImpact destination={bestDest} />
                        <Card>
                          <CardHeader>
                            <CardTitle>{t("otherAlts")}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {result.alternatives.slice(1).map((a) => {
                              const d = pool.get(a.destinationId);
                              return d ? (
                                <Link key={a.destinationId} to={`/destination/${d.id}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-muted">
                                  <span>
                                    <span className="font-semibold">{d.name}</span>
                                    <span className="block text-xs text-muted-foreground">
                                      Score {a.score} · {a.experienceMatch}% match
                                    </span>
                                  </span>
                                  <StatusBadge score={a.crowdScore} />
                                </Link>
                              ) : null;
                            })}
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {result.trip && (
                      <Card className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
                        <div className="text-sm">
                          <b>Your itinerary was re-planned.</b> CO₂ vs traditional: −{result.trip.impact.co2SavedKg} kg · crowd exposure −{result.trip.impact.crowdExposureReducedPct}%
                        </div>
                        <Button asChild>
                          <Link to="/itinerary">
                            {t("seeUpdated")} <ArrowRight />
                          </Link>
                        </Button>
                      </Card>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
