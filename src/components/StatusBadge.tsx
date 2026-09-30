import type { CrowdStatus } from "@shared/types";
import { STATUS_COLORS, crowdStatus } from "@shared/engine";
import { cn } from "@/lib/utils";

export function StatusBadge({ score, status, className, pulse }: { score?: number; status?: CrowdStatus; className?: string; pulse?: boolean }) {
  const s = status ?? crowdStatus(score ?? 0);
  const color = STATUS_COLORS[s];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide", className)}
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <span className="relative flex h-2 w-2">
        {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: color }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      </span>
      {s}
    </span>
  );
}

export function SimBadge({ className, label = "Prototype Live Simulation" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-status-moderate/30 bg-status-moderate/10 px-3 py-1 text-xs font-semibold text-[#9A6B0F] dark:text-status-moderate",
        className,
      )}
      title="Crowd values are simulated for this prototype and are not real visitor counts."
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-moderate opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-status-moderate" />
      </span>
      {label}
    </span>
  );
}
