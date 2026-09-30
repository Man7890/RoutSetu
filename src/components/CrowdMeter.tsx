import { motion } from "framer-motion";
import { STATUS_COLORS, crowdStatus } from "@shared/engine";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function CrowdMeter({
  value,
  size = "md",
  showStatus = true,
  label = "Crowd",
  threshold,
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  label?: string;
  threshold?: number;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const status = crowdStatus(v);
  const color = STATUS_COLORS[status];
  const h = size === "lg" ? "h-4" : size === "sm" ? "h-1.5" : "h-2.5";
  const thumb = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className={cn("w-full", className)}>
      {size !== "sm" && (
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <motion.div
              key={Math.round(v)}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("font-extrabold tabular-nums", size === "lg" ? "text-4xl" : "text-2xl")}
              style={{ color }}
            >
              {Math.round(v)}%
            </motion.div>
          </div>
          {showStatus && <StatusBadge status={status} pulse={status === "CRITICAL"} />}
        </div>
      )}
      <div className={cn("relative w-full rounded-full", h)} style={{ background: "linear-gradient(90deg,#2E8B57 0%,#2E8B57 38%,#E0A72F 52%,#E07832 75%,#D64545 92%)" }}>
        <motion.div
          className="absolute inset-y-0 right-0 rounded-r-full bg-muted/85"
          initial={false}
          animate={{ width: `${100 - v}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
        {threshold != null && (
          <div className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-forest/60 dark:bg-mint/60" style={{ left: `${threshold}%` }} title={`Diversion threshold ${threshold}%`} />
        )}
        <motion.div
          className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md", thumb)}
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ left: `${v}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
      </div>
      {size === "lg" && (
        <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>0</span>
          <span>Low</span>
          <span>Moderate</span>
          <span>High</span>
          <span>Critical</span>
          <span>100</span>
        </div>
      )}
    </div>
  );
}
