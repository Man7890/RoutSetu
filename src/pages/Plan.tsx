import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, Minus, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { INTERESTS, type Pace } from "@shared/types";
import { diversionThreshold } from "@shared/engine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "@/components/Layout";
import { api } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useT } from "@/lib/i18n";
import { cn, fmtINR } from "@/lib/utils";

const REGIONS = [
  { value: "Bastar / Chitrakote, Chhattisgarh", label: "Bastar / Chitrakote, Chhattisgarh", enabled: true },
  { value: "Coorg, Karnataka", label: "Coorg, Karnataka (coming soon)", enabled: false },
  { value: "Spiti Valley, Himachal Pradesh", label: "Spiti Valley, Himachal (coming soon)", enabled: false },
];

const LOADING_STEPS = ["Analyzing destinations...", "Checking crowd conditions...", "Evaluating alternatives...", "Optimizing route...", "Calculating environmental impact..."];

function Step({ n, title, children, hint }: { n: number; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.03 }}>
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-sm font-bold text-white dark:bg-mint dark:text-forest">{n}</span>
          <div>
            <h3 className="font-bold">{title}</h3>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}

export default function Plan() {
  const t = useT();
  const nav = useNavigate();
  const { prefs, setPrefs, setTrip } = useStore();
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [suggestions, setSuggestions] = useState<{ displayName: string; source: string }[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!loading) return;
    setStepIdx(0);
    const id = setInterval(() => setStepIdx((i) => Math.min(LOADING_STEPS.length - 1, i + 1)), 520);
    return () => clearInterval(id);
  }, [loading]);

  function onOrigin(v: string) {
    setPrefs({ origin: v });
    clearTimeout(debounce.current);
    if (v.trim().length < 3) return setSuggestions([]);
    debounce.current = setTimeout(async () => {
      const r = await api.geocode(v).catch(() => ({ results: [] }));
      setSuggestions(r.results.slice(0, 4));
    }, 700);
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs.interests.length) return toast.error("Pick at least one interest");
    setLoading(true);
    try {
      const [r] = await Promise.all([api.generate(prefs), new Promise((res) => setTimeout(res, 2700))]);
      setTrip(r.trip);
      nav("/itinerary");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const toggleInterest = (id: (typeof INTERESTS)[number]["id"]) =>
    setPrefs({ interests: prefs.interests.includes(id) ? prefs.interests.filter((x) => x !== id) : [...prefs.interests, id] });

  return (
    <div className="container max-w-4xl">
      <PageHeader eyebrow="Smart trip planner" title="Plan a crowd-aware trip" subtitle="Tell us how you like to travel. RouteSetu builds an itinerary that avoids overloaded sites and supports local communities." />
      <form onSubmit={generate} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Step n={1} title="Destination / region" hint="Starting point and where you want to explore">
            <div className="space-y-3">
              <div className="relative">
                <Label htmlFor="origin">Starting location</Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="origin" className="pl-9" value={prefs.origin} onChange={(e) => onOrigin(e.target.value)} onBlur={() => setTimeout(() => setSuggestions([]), 200)} autoComplete="off" />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-card shadow-lift">
                    {suggestions.map((s) => (
                      <button
                        type="button"
                        key={s.displayName}
                        className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-muted"
                        onMouseDown={() => {
                          setPrefs({ origin: s.displayName.split(",").slice(0, 2).join(",") });
                          setSuggestions([]);
                        }}
                      >
                        {s.displayName}
                      </button>
                    ))}
                    <div className="border-t px-3 py-1 text-[10px] text-muted-foreground">Geocoding © OpenStreetMap Nominatim</div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  value={prefs.destinationRegion}
                  onChange={(e) => setPrefs({ destinationRegion: e.target.value })}
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value} disabled={!r.enabled}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Step>
          <Step n={2} title="Dates" hint="When does your trip start?">
            <Label htmlFor="start">Start date</Label>
            <Input id="start" type="date" className="mt-1.5" value={prefs.startDate} onChange={(e) => setPrefs({ startDate: e.target.value })} required />
            <Label htmlFor="tname" className="mt-3 block">Trip name <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="tname" className="mt-1.5" placeholder="Monsoon waterfalls weekend" value={prefs.name ?? ""} onChange={(e) => setPrefs({ name: e.target.value })} maxLength={80} />
          </Step>
          <Step n={3} title="Duration & pace">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <Button type="button" key={d} size="sm" variant={prefs.days === d ? "default" : "outline"} onClick={() => setPrefs({ days: d })}>
                  {d} day{d > 1 ? "s" : ""}
                </Button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-full bg-muted p-1">
              {(["relaxed", "balanced", "packed"] as Pace[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPrefs({ pace: p })}
                  className={cn("rounded-full py-2 text-sm font-semibold capitalize transition-all", prefs.pace === p ? "bg-card text-forest shadow-sm dark:text-mint" : "text-muted-foreground")}
                >
                  {p}
                </button>
              ))}
            </div>
          </Step>
          <Step n={4} title="Travelers">
            <div className="flex items-center gap-4">
              <Button type="button" size="icon" variant="outline" onClick={() => setPrefs({ travelers: Math.max(1, prefs.travelers - 1) })} aria-label="Fewer travelers">
                <Minus />
              </Button>
              <div className="min-w-16 text-center">
                <div className="text-3xl font-extrabold text-forest dark:text-mint">{prefs.travelers}</div>
                <div className="text-xs text-muted-foreground">{Math.ceil(prefs.travelers / 4)} vehicle(s)</div>
              </div>
              <Button type="button" size="icon" variant="outline" onClick={() => setPrefs({ travelers: Math.min(40, prefs.travelers + 1) })} aria-label="More travelers">
                <Plus />
              </Button>
            </div>
          </Step>
        </div>

        <Step n={5} title="Interests" hint="We match alternatives to the experiences you care about">
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = prefs.interests.includes(i.id);
              return (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => toggleInterest(i.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    on ? "border-eco bg-eco text-white shadow-soft" : "bg-card hover:border-eco/50",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />} {i.label}
                </button>
              );
            })}
          </div>
        </Step>

        <div className="grid gap-4 md:grid-cols-3">
          <Step n={6} title="Budget">
            <div className="text-2xl font-extrabold text-forest dark:text-mint">{fmtINR(prefs.budget)}</div>
            <Slider className="mt-2" value={[prefs.budget]} min={2000} max={100000} step={1000} onValueChange={([v]) => setPrefs({ budget: v })} aria-label="Budget" />
            <p className="text-xs text-muted-foreground">Total for the group</p>
          </Step>
          <Step n={7} title="Crowd tolerance">
            <div className="text-2xl font-extrabold text-forest dark:text-mint">{prefs.crowdTolerance}</div>
            <Slider className="mt-2" value={[prefs.crowdTolerance]} min={0} max={100} step={5} onValueChange={([v]) => setPrefs({ crowdTolerance: v })} aria-label="Crowd tolerance" />
            <p className="text-xs text-muted-foreground">Divert above {diversionThreshold(prefs.crowdTolerance)}% crowd</p>
          </Step>
          <Step n={8} title="Eco priority">
            <div className="text-2xl font-extrabold text-forest dark:text-mint">{prefs.ecoPriority}</div>
            <Slider className="mt-2" value={[prefs.ecoPriority]} min={0} max={100} step={5} onValueChange={([v]) => setPrefs({ ecoPriority: v })} aria-label="Eco priority" />
            <p className="text-xs text-muted-foreground">Weight on low-impact alternatives</p>
          </Step>
        </div>

        <div className="sticky bottom-4 z-10 pt-2">
          <Button type="submit" size="lg" className="h-14 w-full text-base shadow-lift" disabled={loading}>
            <Sparkles /> {t("generate")}
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
            <Card className="w-[min(92vw,420px)] p-7">
              <div className="mb-5 flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-eco" />
                <h3 className="text-lg font-bold">Building your smart itinerary</h3>
              </div>
              <ul className="space-y-3">
                {LOADING_STEPS.map((s, i) => (
                  <motion.li key={s} initial={{ opacity: 0.3 }} animate={{ opacity: i <= stepIdx ? 1 : 0.3 }} className="flex items-center gap-3 text-sm">
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", i < stepIdx ? "bg-eco text-white" : i === stepIdx ? "border-2 border-eco" : "border")}>
                      {i < stepIdx && <Check className="h-3 w-3" />}
                    </span>
                    {s}
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
