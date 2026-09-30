import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Zap } from "lucide-react";
import type { Destination, SimulationResult } from "@shared/types";
import { diversionThreshold } from "@shared/engine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/store/useStore";
import { useSurge } from "@/hooks/useSurge";
import { useT } from "@/lib/i18n";
import { CrowdMeter } from "./CrowdMeter";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "+10%", points: 10 },
  { label: "+25%", points: 25 },
  { label: "+50%", points: 50 },
];

export function SurgeControl({
  options,
  defaultId = "chitrakote-falls",
  onResult,
  compact,
  className,
}: {
  options: Destination[];
  defaultId?: string;
  onResult?: (r: SimulationResult) => void;
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const trip = useStore((s) => s.trip);
  const prefs = useStore((s) => s.prefs);
  const [id, setId] = useState(defaultId);
  const [points, setPoints] = useState(25);
  const [critical, setCritical] = useState(false);
  const [applyToTrip, setApplyToTrip] = useState(!!trip);
  const { run, reset, loading } = useSurge();
  const dest = options.find((d) => d.id === id) ?? options[0];
  const threshold = diversionThreshold(trip?.preferences.crowdTolerance ?? prefs.crowdTolerance);

  useEffect(() => {
    if (!options.some((d) => d.id === id) && options[0]) setId(options[0].id);
  }, [options, id]);
  useEffect(() => setApplyToTrip(!!trip), [trip]);

  if (!dest) return null;
  const projected = critical ? 96 : Math.min(100, dest.crowdScore + points);

  async function simulate() {
    const r = await run(dest.id, critical ? { targetCrowd: 96 } : { surgePercent: points }, applyToTrip && !!trip);
    if (r) onResult?.(r);
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-2">
        <label htmlFor="surge-dest" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Select destination
        </label>
        <select
          id="surge-dest"
          value={dest.id}
          onChange={(e) => setId(e.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-forest shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-mint"
        >
          {options.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.crowdScore}%
            </option>
          ))}
        </select>
      </div>

      <CrowdMeter value={dest.crowdScore} size={compact ? "md" : "lg"} label="Current crowd" threshold={threshold} />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Crowd surge</span>
          <span className="text-forest dark:text-mint">
            {critical ? "Critical surge" : `+${points}%`} → {projected}%
          </span>
        </div>
        <Slider
          value={[points]}
          min={0}
          max={60}
          step={1}
          onValueChange={([v]) => {
            setPoints(v);
            setCritical(false);
          }}
          rangeClassName="bg-gradient-to-r from-status-moderate to-status-critical"
          aria-label="Surge amount"
        />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant={!critical && points === p.points ? "default" : "outline"}
              onClick={() => {
                setPoints(p.points);
                setCritical(false);
              }}
            >
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant={critical ? "destructive" : "outline"} onClick={() => setCritical(true)}>
            Critical Surge
          </Button>
        </div>
      </div>

      {trip && (
        <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
          <span>
            <span className="font-semibold">Re-plan my itinerary</span>
            <span className="block text-xs text-muted-foreground">{trip.name}</span>
          </span>
          <Switch checked={applyToTrip} onCheckedChange={setApplyToTrip} />
        </label>
      )}

      <div className="flex gap-2">
        <Button size="lg" variant="destructive" className="min-w-0 flex-1 px-4" onClick={simulate} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Zap />} {t("simulate")}
        </Button>
        <Button size="lg" variant="outline" onClick={reset} disabled={loading} aria-label="Reset simulation" title="Reset simulation">
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}
