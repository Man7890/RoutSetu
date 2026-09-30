import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Leaf, MapPin, Radar, Shuffle, Sprout, TrendingDown, Users, Zap } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CommandStats } from "@shared/types";
import { STATUS_COLORS, crowdStatus, diversionThreshold, hourlyTrend, pressureOf, redistribute, scoreAlternatives } from "@shared/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/Layout";
import { SimBadge, StatusBadge } from "@/components/StatusBadge";
import { CountUp } from "@/components/CountUp";
import { CrowdMap, MapLegend } from "@/components/CrowdMap";
import { CrowdTrendChart } from "@/components/charts/CrowdTrendChart";
import { LoadDistribution } from "@/components/charts/LoadDistribution";
import { api } from "@/lib/api";
import { useStore } from "@/store/useStore";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

export default function Dashboard() {
  const destinations = useStore((s) => s.destinations);
  const weather = useStore((s) => s.weather);
  const lastSim = useStore((s) => s.lastSimulation);
  const tolerance = useStore((s) => s.prefs.crowdTolerance);
  const [stats, setStats] = useState<CommandStats | null>(null);
  const [trendId, setTrendId] = useState("chitrakote-falls");
  const threshold = diversionThreshold(tolerance);

  useEffect(() => {
    let alive = true;
    const load = () => api.stats().then((s) => alive && setStats(s)).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const sorted = useMemo(() => [...destinations].sort((a, b) => b.crowdScore - a.crowdScore), [destinations]);
  const trendDest = destinations.find((d) => d.id === trendId) ?? sorted[0];

  const distribution = useMemo(() => {
    if (lastSim?.redistribution.length) return { bars: lastSim.redistribution, label: `After surge at ${lastSim.destination.name}` };
    const top = sorted[0];
    if (!top) return { bars: [], label: "" };
    const alts = scoreAlternatives(top, destinations, { interests: top.tags, ecoPriority: 60, threshold: 100, weather });
    return { bars: redistribute(top, alts, destinations).bars, label: `Projected balancing for ${top.name}` };
  }, [lastSim, sorted, destinations, weather]);

  const pressure = useMemo(
    () =>
      sorted.slice(0, 10).map((d) => ({
        name: d.name.replace(/ (Falls|Waterfall|National Park|Temple.*|, .*)$/, ""),
        pressure: Math.round(pressureOf(d)),
        color: STATUS_COLORS[crowdStatus(d.crowdScore)],
      })),
    [sorted],
  );

  const cards = [
    { icon: Radar, label: "Destinations Monitored", value: stats?.monitored ?? destinations.length, color: "text-eco" },
    { icon: AlertTriangle, label: "Critical Alerts", value: stats?.critical ?? 0, color: "text-status-critical", sub: `${stats?.high ?? 0} high-crowd` },
    { icon: Users, label: "Visitors Redistributed", value: stats?.visitorsRedistributed ?? 0, color: "text-status-alt" },
    { icon: Leaf, label: "Estimated CO₂ Avoided", value: stats?.co2AvoidedKg ?? 0, suffix: " kg", decimals: 0, color: "text-eco" },
    { icon: Sprout, label: "Low-crowd Alternatives", value: stats?.lowAlternatives ?? 0, color: "text-status-low" },
    { icon: TrendingDown, label: "Peak Pressure Reduction", value: stats?.pressureReductionPct ?? 0, suffix: "%", color: "text-sky" },
  ];

  return (
    <div className="container">
      <PageHeader
        eyebrow="Live operations"
        title="Tourism Load Command Center"
        subtitle="Monitor crowd pressure across the Bastar region and watch RouteSetu rebalance visitors in real time."
        actions={
          <>
            <SimBadge />
            <Button asChild variant="destructive">
              <Link to="/simulator">
                <Zap /> Simulate surge
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="h-full p-4">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <div className="mt-3 text-3xl font-extrabold text-forest dark:text-mint">
                <CountUp value={c.value} suffix={c.suffix} decimals={c.decimals} />
              </div>
              <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
              {c.sub && <div className="text-[11px] text-status-high">{c.sub}</div>}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-eco" /> Live Crowd Map
            </CardTitle>
            <MapLegend className="hidden sm:block" />
          </CardHeader>
          <CrowdMap
            destinations={destinations}
            weather={weather}
            alternativeIds={lastSim?.overloaded ? lastSim.alternatives.slice(0, 3).map((a) => a.destinationId) : []}
            tolerance={tolerance}
            className="h-[380px]"
          />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live destination status</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] space-y-1 overflow-y-auto">
            {sorted.map((d) => (
              <Link key={d.id} to={`/destination/${d.id}`} className="grid grid-cols-[1fr_5rem_auto] items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                <span className="truncate text-sm font-medium">{d.name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div className="h-full rounded-full" style={{ background: STATUS_COLORS[crowdStatus(d.crowdScore)] }} animate={{ width: `${d.crowdScore}%` }} />
                </div>
                <span className="w-24 text-right">
                  <StatusBadge score={d.crowdScore} pulse={d.crowdScore >= 90} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Crowd Trends</CardTitle>
            <select
              value={trendDest?.id}
              onChange={(e) => setTrendId(e.target.value)}
              className="h-9 rounded-full border bg-card px-3 text-sm font-medium"
              aria-label="Trend destination"
            >
              {sorted.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            {trendDest && <CrowdTrendChart data={hourlyTrend(trendDest, threshold)} threshold={threshold} />}
            <p className="mt-1 text-xs text-muted-foreground">Simulated hourly profile · dashed line shows the projected curve with RouteSetu balancing.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-status-alt" /> Tourism Load Redistribution
            </CardTitle>
            <p className="text-xs text-muted-foreground">{distribution.label}</p>
          </CardHeader>
          <CardContent>
            <LoadDistribution bars={distribution.bars} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Environmental Impact — pressure by destination</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pressure} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "rgba(46,125,91,0.06)" }} />
                <Bar dataKey="pressure" radius={[0, 8, 8, 0]} animationDuration={900}>
                  {pressure.map((p) => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">Pressure = crowd × (0.5 + environmental sensitivity / 200). Estimate.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Active Diversions</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/impact">
                Impact <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!stats?.activeDiversions.length && <p className="text-sm text-muted-foreground">No diversions yet — run the simulator.</p>}
            {stats?.activeDiversions.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold text-status-critical">{a.from}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-right font-semibold text-status-low">{a.to}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {a.fromCrowd}% crowd · alt at {a.toCrowd}% · {a.visitors.toLocaleString("en-IN")} visitors moved
                  </span>
                  <span>{timeAgo(a.createdAt)}</span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
