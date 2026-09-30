import { motion } from "framer-motion";
import { CountUp } from "./CountUp";

export function ImpactRing({
  value,
  max = 100,
  label,
  suffix = "%",
  color = "#2E7D5B",
  size = 150,
  decimals = 0,
  sub,
}: {
  value: number;
  max?: number;
  label: string;
  suffix?: string;
  color?: string;
  size?: number;
  decimals?: number;
  sub?: string;
}) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" className="text-muted" strokeWidth={12} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: c * (1 - pct) }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-extrabold text-forest dark:text-mint">
            <CountUp value={value} decimals={decimals} suffix={suffix} />
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm font-semibold">{label}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
