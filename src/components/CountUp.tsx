import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export function CountUp({ value, decimals = 0, duration = 1.2, prefix = "", suffix = "" }: { value: number; decimals?: number; duration?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const c = animate(from.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    from.current = value;
    return () => c.stop();
  }, [value, duration]);
  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
