import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Leaf, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Trip } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDestMap } from "@/store/useStore";
import { fmtDate } from "@/lib/utils";

export function ecoScoreOf(trip: Trip, pool: Map<string, { ecoScore: number }>) {
  const s = trip.items.map((i) => pool.get(i.destinationId)?.ecoScore ?? 70);
  return Math.round(s.reduce((a, b) => a + b, 0) / (s.length || 1));
}

export function ShareTripDialog({ trip, trigger }: { trip: Trip; trigger?: React.ReactNode }) {
  const pool = useDestMap();
  const [open, setOpen] = useState(false);
  const names = trip.items.map((i) => pool.get(i.destinationId)?.name ?? i.destinationId);
  const eco = ecoScoreOf(trip, pool);
  const url = `${location.origin}/itinerary?trip=${trip.id}`;
  const text = [
    `🌿 ${trip.name} — planned with RouteSetu`,
    `${trip.preferences.days} days · ${fmtDate(trip.preferences.startDate)} · ${trip.preferences.travelers} travelers`,
    `Stops: ${names.join(" → ")}`,
    `Eco score ${eco}/100 · Crowd exposure ${trip.impact.optimized.crowdExposure}% · Est. CO₂ ${trip.impact.optimized.estimatedCO2Kg} kg`,
    trip.impact.co2SavedKg > 0 ? `Saved ~${trip.impact.co2SavedKg} kg CO₂ vs a traditional plan (estimate)` : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.name, text, url });
        return;
      } catch {
        /* user cancelled — fall back */
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success("Trip summary copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Share2 /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Share trip</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">A summary card anyone can read.</DialogDescription>
        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-forest to-eco p-6 text-white shadow-lift">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-mint">RouteSetu trip</div>
              <div className="mt-1 text-xl font-extrabold">{trip.name}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
                <Users className="h-4 w-4" /> {trip.preferences.travelers} · {trip.preferences.days} days · {fmtDate(trip.preferences.startDate)}
              </div>
            </div>
            <div className="rounded-xl bg-white p-1.5">
              <QRCodeSVG value={url} size={72} fgColor="#12372A" />
            </div>
          </div>
          <ol className="mt-4 space-y-1 text-sm">
            {names.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-mint">{i + 1}.</span> {n}
              </li>
            ))}
          </ol>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Stat label="Eco score" value={`${eco}`} />
            <Stat label="Crowd" value={`${trip.impact.optimized.crowdExposure}%`} />
            <Stat label="CO₂ est." value={`${trip.impact.optimized.estimatedCO2Kg} kg`} />
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-mint">
            <Leaf className="h-3.5 w-3.5" /> Crowd-aware, eco-balanced itinerary
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={share}>
            <Share2 /> Share
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(`${text}\n${url}`);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy /> Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-2.5">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] text-white/70">{label}</div>
    </div>
  );
}
