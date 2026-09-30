import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { Alternative } from "@shared/types";

const LABELS: Record<keyof Alternative["breakdown"], { label: string; negative?: boolean }> = {
  experienceMatch: { label: "Experience match" },
  crowdAvailability: { label: "Crowd availability" },
  distance: { label: "Proximity" },
  weather: { label: "Weather suitability" },
  environment: { label: "Environmental suitability" },
  localEconomy: { label: "Local economic opportunity" },
  travelCost: { label: "Travel cost", negative: true },
  travelTime: { label: "Extra travel time", negative: true },
};

export function WhyRecommendation({ name, alternative, showBreakdown = true }: { name: string; alternative: Alternative; showBreakdown?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-eco" />
        <h4 className="font-bold">Why RouteSetu recommends {name}</h4>
      </div>
      <ul className="space-y-2">
        {alternative.reasons.map((r, i) => (
          <motion.li
            key={r}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-2 text-sm"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-low" />
            {r}
          </motion.li>
        ))}
      </ul>
      {showBreakdown && (
        <div className="space-y-2 rounded-2xl bg-muted/50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alternative score breakdown</div>
          {(Object.keys(LABELS) as (keyof Alternative["breakdown"])[]).map((k) => {
            const v = alternative.breakdown[k];
            const neg = LABELS[k].negative;
            return (
              <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-xs">
                <span className="text-muted-foreground">
                  {neg ? "− " : "+ "}
                  {LABELS[k].label}
                </span>
                <span className="font-semibold tabular-nums">{v}</span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-background">
                  <motion.div
                    className={neg ? "h-full bg-status-high" : "h-full bg-eco"}
                    initial={{ width: 0 }}
                    animate={{ width: `${v}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
            <span>Normalised score</span>
            <span>{alternative.score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}
