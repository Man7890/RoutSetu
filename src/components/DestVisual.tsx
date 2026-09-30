import { Castle, Droplets, Landmark, Mountain, PawPrint, Store, Trees, Waves } from "lucide-react";
import type { Destination } from "@shared/types";
import { pressureOf } from "@shared/engine";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Trees> = {
  waterfall: Droplets,
  wildlife: PawPrint,
  caves: Mountain,
  heritage: Landmark,
  culture: Castle,
  lake: Waves,
  rural: Store,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const I = ICONS[category] ?? Trees;
  return <I className={className} />;
}

export function DestVisual({ d, className, children }: { d: Destination; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: d.imageUrl }}>
      <svg className="absolute inset-0 h-full w-full opacity-20" preserveAspectRatio="none" viewBox="0 0 400 200" aria-hidden>
        <path d="M0 150 Q 80 90 160 130 T 320 110 T 400 120 V200 H0Z" fill="#fff" />
        <path d="M0 170 Q 100 130 200 160 T 400 150 V200 H0Z" fill="#fff" opacity=".6" />
      </svg>
      <CategoryIcon category={d.category} className="absolute right-4 top-4 h-8 w-8 text-white/70" />
      {children}
    </div>
  );
}

export function ecoImpactLabel(d: Destination): { label: "Low" | "Moderate" | "High"; color: string } {
  const p = pressureOf(d);
  if (p < 40) return { label: "Low", color: "#2E8B57" };
  if (p < 62) return { label: "Moderate", color: "#E0A72F" };
  return { label: "High", color: "#E07832" };
}
