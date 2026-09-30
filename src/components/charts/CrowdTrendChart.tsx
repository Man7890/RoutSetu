import { Area, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CrowdTrendChart({
  data,
  threshold,
  height = 240,
  showBalanced = true,
}: {
  data: { time: string; crowd: number; balanced?: number }[];
  threshold?: number;
  height?: number;
  showBalanced?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="crowdFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E07832" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#E07832" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8e4", fontSize: 12 }} />
        {threshold != null && <ReferenceLine y={threshold} stroke="#D64545" strokeDasharray="4 4" label={{ value: "Diversion threshold", fontSize: 10, fill: "#D64545", position: "insideTopLeft" }} />}
        <Area type="monotone" dataKey="crowd" name="Without balancing" stroke="#E07832" strokeWidth={3} fill="url(#crowdFill)" animationDuration={1200} />
        {showBalanced && <Line type="monotone" dataKey="balanced" name="With RouteSetu" stroke="#2E7D5B" strokeWidth={3} dot={false} strokeDasharray="6 4" animationDuration={1400} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
