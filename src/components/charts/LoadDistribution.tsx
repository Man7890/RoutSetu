import { motion } from "framer-motion";
import type { LoadBar } from "@shared/types";
import { STATUS_COLORS, crowdStatus } from "@shared/engine";

function Bars({ title, bars, k, delay = 0 }: { title: string; bars: LoadBar[]; k: "before" | "after"; delay?: number }) {
  return (
    <div>
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-2.5">
        {bars.map((b, i) => {
          const v = b[k];
          return (
            <div key={b.destinationId} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate font-medium" title={b.name}>
                {b.name}
              </span>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[crowdStatus(v)] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${v}%` }}
                  transition={{ duration: 0.9, delay: delay + i * 0.08, ease: "easeOut" }}
                />
              </div>
              <span className="text-right font-bold tabular-nums">{v}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LoadDistribution({ bars }: { bars: LoadBar[] }) {
  if (!bars.length) return <p className="text-sm text-muted-foreground">Trigger a surge to see how RouteSetu spreads visitors.</p>;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Bars title="Before RouteSetu" bars={bars} k="before" />
      <Bars title="After RouteSetu" bars={bars} k="after" delay={0.5} />
    </div>
  );
}
