import { Check, Store } from "lucide-react";
import type { Destination } from "@shared/types";

export function LocalImpact({ destination }: { destination: Destination }) {
  return (
    <div className="rounded-2xl border border-status-moderate/25 bg-status-moderate/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9A6B0F] dark:text-status-moderate">
          <Store className="h-4 w-4" /> Local impact
        </div>
        <span className="text-sm font-bold">{destination.localEconomyScore}/100</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Local Opportunity Score · illustrative prototype data</div>
      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {destination.localOpportunities.map((o) => (
          <li key={o} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-status-low" /> {o}
          </li>
        ))}
      </ul>
    </div>
  );
}
