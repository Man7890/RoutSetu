import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Leaf, Map, Route, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CrowdMeter } from "@/components/CrowdMeter";
import { SimBadge } from "@/components/StatusBadge";
import { DestVisual } from "@/components/DestVisual";
import { CountUp } from "@/components/CountUp";
import { useStore } from "@/store/useStore";
import { useT } from "@/lib/i18n";
import { crowdStatus } from "@shared/engine";

const BENEFITS = [
  { icon: BrainCircuit, title: "Real-Time Crowd Intelligence", text: "Every destination carries a live crowd score, capacity and status — refreshed continuously." },
  { icon: Route, title: "Dynamic Itinerary", text: "When a stop overloads, RouteSetu finds a similar, calmer alternative and re-plans your day." },
  { icon: Leaf, title: "Eco-Aware Travel", text: "Transparent CO₂, distance and environmental-pressure estimates for every decision." },
];

const DEMO = [
  "Plan a Bastar trip",
  "See live crowd levels",
  "Simulate a crowd surge",
  "Watch RouteSetu divert",
  "Compare before vs after",
];

export default function Landing() {
  const t = useT();
  const dests = useStore((s) => s.destinations);
  const featured = ["chitrakote-falls", "tamra-ghoomar", "kanger-valley"].map((id) => dests.find((d) => d.id === id)).filter(Boolean);
  const critical = dests.filter((d) => crowdStatus(d.crowdScore) === "CRITICAL" || crowdStatus(d.crowdScore) === "HIGH").length;
  const calm = dests.filter((d) => d.crowdScore < 40).length;

  return (
    <div className="overflow-hidden">
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-mint/40 blur-3xl dark:bg-eco/20" />
          <div className="absolute -right-24 top-24 h-[24rem] w-[24rem] rounded-full bg-sky/25 blur-3xl" />
        </div>
        <div className="container grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-7">
            <SimBadge label={`${dests.length || 16} destinations monitored · ${t("simulated")}`} />
            <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              {t("heroA")}
              <br />
              <span className="text-eco dark:text-mint/80">{t("heroB")}</span>
              <br />
              {t("heroC")}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">{t("heroSub")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/plan">
                  {t("planMyTrip")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/map">
                  <Map /> {t("exploreMap")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/about">{t("seeHow")}</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-8 pt-2">
              <div>
                <div className="metric"><CountUp value={critical} /></div>
                <div className="text-xs text-muted-foreground">high-pressure sites right now</div>
              </div>
              <div>
                <div className="metric"><CountUp value={calm} /></div>
                <div className="text-xs text-muted-foreground">calm eco-alternatives</div>
              </div>
              <div>
                <div className="metric">&lt;2<span className="text-lg"> min</span></div>
                <div className="text-xs text-muted-foreground">to see load balancing live</div>
              </div>
            </div>
          </div>

          <div className="relative h-[440px] sm:h-[480px]">
            {featured.map((d, i) =>
              d ? (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 30, rotate: 0 }}
                  animate={{ opacity: 1, y: 0, rotate: [-4, 3, -1][i] }}
                  transition={{ delay: 0.15 + i * 0.15, type: "spring", stiffness: 80 }}
                  className="absolute w-[78%] sm:w-[66%]"
                  style={{ top: `${i * 30}%`, left: `${[0, 30, 8][i]}%`, zIndex: 3 - i === 3 ? 3 : i + 1 }}
                >
                  <Card className="animate-floaty overflow-hidden p-0 shadow-lift" style={{ animationDelay: `${i * 1.2}s` }}>
                    <DestVisual d={d} className="h-20">
                      <div className="absolute bottom-2 left-4 text-sm font-bold text-white drop-shadow">{d.name}</div>
                    </DestVisual>
                    <div className="p-4">
                      <CrowdMeter value={d.crowdScore} size="md" />
                    </div>
                  </Card>
                </motion.div>
              ) : null,
            )}
            {featured.length > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="glass absolute -bottom-6 right-0 z-10 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lift"
              >
                <Sparkles className="h-4 w-4 text-eco" /> Chitrakote at capacity? RouteSetu finds a calmer falls nearby
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full p-6 transition-shadow hover:shadow-lift">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft text-eco dark:bg-white/10 dark:text-mint">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container py-10">
        <Card className="overflow-hidden bg-forest p-8 text-white md:p-12 dark:bg-forest-900">
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-mint">The 2-minute demo</div>
              <h2 className="text-3xl font-extrabold text-white">Instead of sending everyone to the same falls…</h2>
              <p className="text-white/75">RouteSetu intelligently distributes visitors across suitable alternatives while preserving your travel experience.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="secondary">
                  <Link to="/simulator">
                    <Zap /> Open simulator
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                  <Link to="/dashboard">Command Center →</Link>
                </Button>
              </div>
            </div>
            <ol className="grid gap-3 sm:grid-cols-5">
              {DEMO.map((s, i) => (
                <motion.li
                  key={s}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl bg-white/10 p-4"
                >
                  <div className="text-2xl font-extrabold text-mint">{i + 1}</div>
                  <div className="mt-1 text-sm font-medium">{s}</div>
                </motion.li>
              ))}
            </ol>
          </div>
        </Card>
      </section>
    </div>
  );
}
