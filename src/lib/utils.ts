import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const fmtNum = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));
export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const fmtMinutes = (m: number) => {
  const a = Math.abs(Math.round(m));
  const h = Math.floor(a / 60);
  const mm = a % 60;
  return h ? `${h}h ${mm}m` : `${mm} min`;
};
export const fmtDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const todayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};
