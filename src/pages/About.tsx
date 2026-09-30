import { motion } from "framer-motion";
import { ArrowDown, BarChart3, Cloud, Compass, Gauge, Leaf, MapPin, Radar, Scale, Sparkles, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/Layout";
import { SimBadge } from "@/components/StatusBadge";
import { ASSUMPTIONS } from "@shared/engine";
import { useT, type TKey } from "@/lib/i18n";

const STEPS = [
  { icon: Radar, title: "Sense", text: "Collect crowd signals (simulated), weather from Open-Meteo, capacity and community reports." },
  { icon: BarChart3, title: "Analyze", text: "Compute crowd score, capacity utilisation and environmental pressure for every destination." },
  { icon: Gauge, title: "Predict", text: "Project the hourly crowd curve and detect when a site will cross your diversion threshold." },
  { icon: Scale, title: "Balance", text: "Score every alternative on experience, crowd, distance, weather, ecology and local economy." },
  { icon: Sparkles, title: "Optimize", text: "Swap overloaded stops, re-route each day and re-estimate time, cost and CO₂." },
];

const SIGNALS = [
  { icon: Users, label: "Crowd signals" },
  { icon: Cloud, label: "Weather" },
  { icon: Gauge, label: "Destination capacity" },
  { icon: Leaf, label: "Environmental sensitivity" },
  { icon: Compass, label: "User preferences" },
  { icon: MapPin, label: "Geographic proximity" },
];

export default function About() {
  const t = useT();
  return (
    <div className="container">
      <PageHeader eyebrow={t("aboutEyebrow")} title={t("aboutTitle")} subtitle={t("aboutSub")} />
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col items-stretch">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex flex-col items-center">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="w-full">
                <Card className="flex items-start gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{t(`about_${s.title}` as TKey)}</h3>
                    <p className="text-sm text-muted-foreground">{t(`about_${s.title}_t` as TKey)}</p>
                  </div>
                </Card>
              </motion.div>
              {i < STEPS.length - 1 && <ArrowDown className="my-2 h-5 w-5 text-eco" />}
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold">Signals combined</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SIGNALS.map((s) => (
                <div key={s.label} className="flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm font-medium">
                  <s.icon className="h-4 w-4 text-eco" /> {s.label}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-bold">Alternative score</h3>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-forest p-4 text-xs leading-relaxed text-mint">
{`Alternative Score =
    0.30 × Experience Match
  + 0.22 × Crowd Availability
  + 0.12 × Distance (proximity)
  + 0.08 × Weather Suitability
  + (0.06–0.14) × Environmental Suitability  ← scales with eco-priority
  + 0.10 × Local Economic Opportunity
  − 0.04 × Travel Cost
  − 0.04 × Travel Time
→ normalised to 0–100`}
            </pre>
            <p className="mt-3 text-sm text-muted-foreground">
              A stop is diverted when its crowd score exceeds your threshold (80–95%, set by crowd tolerance). Candidates must be at least 10 points under the threshold and ≥30% experience match.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">Estimation assumptions</h3>
              <SimBadge />
            </div>
            <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              <li>Road distance ≈ straight-line × {ASSUMPTIONS.roadFactor}; average speed {ASSUMPTIONS.avgSpeedKmh} km/h</li>
              <li>CO₂ ≈ {ASSUMPTIONS.co2KgPerVehicleKm} kg per vehicle-km; {ASSUMPTIONS.travelersPerVehicle} travellers per vehicle</li>
              <li>Congestion delay ≈ {ASSUMPTIONS.congestionDelayPerPoint} min per crowd point above {ASSUMPTIONS.congestionStartsAt}%</li>
              <li>Idling/parking-search ≈ {ASSUMPTIONS.idleKmPerPointAbove70} km-equivalent per crowd point above 70%</li>
              <li>Environmental pressure = crowd × (0.5 + sensitivity / 200)</li>
              <li>Redistribution targets {ASSUMPTIONS.targetUtilization}% utilisation at the overloaded site</li>
              <li>"Traditional" plan = same interests, popularity-ranked order, no crowd awareness</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">All crowd numbers are simulated for this prototype and never represent real visitor counts. All impacts are estimates.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
