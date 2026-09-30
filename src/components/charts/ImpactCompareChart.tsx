import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ImpactComparison } from "@shared/types";

export function ImpactCompareChart({ impact, height = 260 }: { impact: ImpactComparison; height?: number }) {
  const t = impact.traditional;
  const o = impact.optimized;
  const data = [
    { metric: "Distance (km)", Traditional: t.distanceKm, RouteSetu: o.distanceKm },
    { metric: "CO₂ (kg)", Traditional: t.estimatedCO2Kg, RouteSetu: o.estimatedCO2Kg },
    { metric: "Env. pressure", Traditional: t.environmentalPressure, RouteSetu: o.environmentalPressure },
    { metric: "Crowd exposure", Traditional: t.crowdExposure, RouteSetu: o.crowdExposure },
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
        <XAxis dataKey="metric" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "rgba(46,125,91,0.06)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Traditional" fill="#E07832" radius={[8, 8, 0, 0]} animationDuration={1000} />
        <Bar dataKey="RouteSetu" fill="#2E7D5B" radius={[8, 8, 0, 0]} animationDuration={1300} />
      </BarChart>
    </ResponsiveContainer>
  );
}
