import { motion } from "framer-motion";
import { AlertTriangle, ArrowDown, Check, Clock, Leaf, Route, Sprout } from "lucide-react";
import type { Alternative, Destination } from "@shared/types";
import { Button } from "@/components/ui/button";
import { cn, fmtMinutes } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function SmartDiversionCard({
  original,
  originalCrowd,
  alternative,
  altDestination,
  onApply,
  applied,
  className,
  compact,
}: {
  original: Destination;
  originalCrowd: number;
  alternative: Alternative;
  altDestination: Destination;
  onApply?: () => void;
  applied?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const co2 = alternative.co2ImpactPct;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("overflow-hidden rounded-[22px] border bg-card shadow-lift", className)}
    >
      <div className="flex items-center gap-2 bg-status-critical px-5 py-2.5 text-sm font-bold tracking-wide text-white">
        <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <AlertTriangle className="h-4 w-4" />
        </motion.span>
        CROWD SURGE DETECTED
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-forest dark:text-mint">{original.name}</div>
            <div className="text-sm text-muted-foreground">
              Crowd: <span className="font-bold text-status-critical">{originalCrowd}%</span>
            </div>
          </div>
          <StatusBadge score={originalCrowd} pulse />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ArrowDown className="h-4 w-4 text-eco" /> RouteSetu recommends
        </div>

        <div className="rounded-2xl border border-status-alt/20 bg-sky-soft/60 p-4 dark:bg-sky/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-eco" />
              <span className="text-base font-bold text-forest dark:text-mint">{altDestination.name}</span>
            </div>
            <span className="rounded-full bg-forest px-2.5 py-0.5 text-xs font-bold text-white dark:bg-mint dark:text-forest">
              Score {alternative.score}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Crowd</div>
              <div className="font-bold text-status-low">{alternative.crowdScore}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Experience match</div>
              <div className="font-bold text-forest dark:text-mint">{alternative.experienceMatch}%</div>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric icon={<Leaf className="h-4 w-4" />} label="CO₂ impact" value={`${co2 > 0 ? "+" : ""}${co2}%`} good={co2 <= 0} />
            <Metric
              icon={<Clock className="h-4 w-4" />}
              label={alternative.timeSavedMinutes >= 0 ? "Time saved" : "Extra time"}
              value={fmtMinutes(alternative.timeSavedMinutes)}
              good={alternative.timeSavedMinutes >= 0}
            />
            <Metric
              icon={<Route className="h-4 w-4" />}
              label="Distance"
              value={`${alternative.extraDistanceKm > 0 ? "+" : ""}${Math.round(alternative.extraDistanceKm)} km`}
              good={alternative.extraDistanceKm <= 0}
            />
          </div>
        )}

        {onApply && (
          <Button className="w-full" variant={applied ? "secondary" : "eco"} size="lg" onClick={onApply} disabled={applied}>
            {applied ? (
              <>
                <Check /> Diversion applied
              </>
            ) : (
              "Apply Diversion"
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function Metric({ icon, label, value, good }: { icon: React.ReactNode; label: string; value: string; good: boolean }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2.5">
      <div className={cn("mx-auto mb-1 flex w-fit", good ? "text-status-low" : "text-status-high")}>{icon}</div>
      <div className={cn("text-sm font-bold tabular-nums", good ? "text-status-low" : "text-status-high")}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
