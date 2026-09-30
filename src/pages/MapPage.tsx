import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, SlidersHorizontal, X } from "lucide-react";
import type { CrowdStatus } from "@shared/types";
import { crowdStatus, diversionThreshold, scoreAlternatives } from "@shared/engine";
import { Button } from "@/components/ui/button";
import { CrowdMap, MapLegend } from "@/components/CrowdMap";
import { CrowdMeter } from "@/components/CrowdMeter";
import { SimBadge, StatusBadge } from "@/components/StatusBadge";
import { CategoryIcon } from "@/components/DestVisual";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { useT, type TKey } from "@/lib/i18n";

const FILTERS: ("ALL" | CrowdStatus)[] = ["ALL", "LOW", "MODERATE", "HIGH", "CRITICAL"];

export default function MapPage() {
  const t = useT();
  const destinations = useStore((s) => s.destinations);
  const weather = useStore((s) => s.weather);
  const tolerance = useStore((s) => s.prefs.crowdTolerance);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const threshold = diversionThreshold(tolerance);

  const shown = useMemo(() => destinations.filter((d) => filter === "ALL" || crowdStatus(d.crowdScore) === filter), [destinations, filter]);
  const selected = destinations.find((d) => d.id === selectedId);
  const alts = useMemo(
    () => (selected ? scoreAlternatives(selected, destinations, { interests: selected.tags, ecoPriority: 60, threshold, weather }).slice(0, 3) : []),
    [selected, destinations, threshold, weather],
  );
  const altIds = selected && selected.crowdScore >= 70 ? alts.map((a) => a.destinationId) : [];

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <CrowdMap
        destinations={shown}
        weather={weather}
        selectedId={selectedId}
        onSelect={setSelectedId}
        alternativeIds={altIds}
        tolerance={tolerance}
        className="h-full w-full"
        flyToSelected
        fitIds={destinations.map((d) => d.id)}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-col gap-3 md:inset-x-auto md:left-4 md:top-4 md:w-80">
        <div className="glass pointer-events-auto rounded-3xl p-4 shadow-lift">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold">{t("mapTitle")}</h1>
              <SimBadge className="mt-1" />
            </div>
            <Button size="icon" variant="ghost" onClick={() => setPanelOpen((o) => !o)} aria-label="Toggle filters">
              <SlidersHorizontal />
            </Button>
          </div>
          <AnimatePresence initial={false}>
            {panelOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <fieldset className="mt-3">
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("crowdFilter")}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map((f) => (
                      <label key={f} className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold capitalize", filter === f ? "border-forest bg-forest text-white dark:border-mint dark:bg-mint dark:text-forest" : "bg-card")}>
                        <input type="radio" name="crowd-filter" className="sr-only" checked={filter === f} onChange={() => setFilter(f)} />
                        {t(`f_${f}` as TKey)} {f !== "ALL" && `(${destinations.filter((d) => crowdStatus(d.crowdScore) === f).length})`}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <MapLegend className="mt-3" />
                <div className="mt-3 max-h-[32vh] space-y-1 overflow-y-auto pr-1 md:max-h-[45vh]">
                  {shown.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={cn("flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted", selectedId === d.id && "bg-muted")}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryIcon category={d.category} className="h-4 w-4 shrink-0 text-eco" />
                        <span className="truncate font-medium">{d.name}</span>
                      </span>
                      <span className="shrink-0 text-xs font-bold tabular-nums">{d.crowdScore}%</span>
                    </button>
                  ))}
                  {!shown.length && <p className="px-2 py-3 text-sm text-muted-foreground">No destinations in this band right now.</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="glass absolute bottom-3 left-3 right-3 z-[500] max-h-[55vh] overflow-y-auto rounded-3xl p-5 shadow-lift md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-96 md:max-h-[calc(100%-2rem)]"
          >
            <button className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-muted" onClick={() => setSelectedId(null)} aria-label="Close details">
              <X className="h-4 w-4" />
            </button>
            <div className="pr-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{selected.category}</div>
              <h2 className="text-xl font-extrabold">{selected.name}</h2>
            </div>
            <CrowdMeter className="mt-4" value={selected.crowdScore} threshold={threshold} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Capacity use" value={`${selected.currentVisitors.toLocaleString("en-IN")} / ${selected.capacity.toLocaleString("en-IN")}`} />
              <Stat label="Env. sensitivity" value={`${selected.environmentalSensitivity}/100`} />
              <Stat label="Weather" value={weather[selected.id] ? `${weather[selected.id].temperature}°C · ${weather[selected.id].condition}` : "—"} />
              <Stat label="Best visit" value={`${String(selected.bestStartHour).padStart(2, "0")}:00–${String(selected.bestEndHour).padStart(2, "0")}:00`} />
            </div>
            {alts.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("altDest")}</div>
                <div className="space-y-2">
                  {alts.map((a) => {
                    const d = destinations.find((x) => x.id === a.destinationId)!;
                    return (
                      <button key={a.destinationId} onClick={() => setSelectedId(a.destinationId)} className="flex w-full items-center justify-between rounded-xl border bg-card px-3 py-2 text-left text-sm hover:border-status-alt/50">
                        <span>
                          <span className="font-semibold">{d.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {a.experienceMatch}% match · {Math.round(a.distanceFromOriginalKm)} km away
                          </span>
                        </span>
                        <StatusBadge score={a.crowdScore} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <Button asChild className="mt-4 w-full">
              <Link to={`/destination/${selected.id}`}>
                {t("fullDetails")} <ArrowRight />
              </Link>
            </Button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/70 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
