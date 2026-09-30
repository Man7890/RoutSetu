import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, CloudRain, Droplets, Leaf, Loader2, MapPin, Plus, Thermometer, Users, Wind } from "lucide-react";
import { toast } from "sonner";
import type { CrowdStatus } from "@shared/types";
import { STATUS_COLORS, diversionThreshold } from "@shared/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrowdMeter } from "@/components/CrowdMeter";
import { SimBadge, StatusBadge } from "@/components/StatusBadge";
import { LocalImpact } from "@/components/LocalImpact";
import { WhyRecommendation } from "@/components/WhyRecommendation";
import { CrowdTrendChart } from "@/components/charts/CrowdTrendChart";
import { DestVisual } from "@/components/DestVisual";
import { api, type DestinationDetail } from "@/lib/api";
import { useDestMap, useStore } from "@/store/useStore";
import { useT, type TKey } from "@/lib/i18n";

export default function DestinationPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const pool = useDestMap();
  const live = pool.get(id);
  const { trip, setTrip, prefs, upsertDestination } = useStore();
  const t = useT();
  const [detail, setDetail] = useState<DestinationDetail | null>(null);
  const [osm, setOsm] = useState<{ name: string; kind: string }[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [openAlt, setOpenAlt] = useState<string | null>(null);
  const tolerance = trip?.preferences.crowdTolerance ?? prefs.crowdTolerance;

  useEffect(() => {
    setDetail(null);
    setOsm(null);
    setOpenAlt(null);
  }, [id]);

  useEffect(() => {
    let alive = true;
    api
      .destination(id, tolerance)
      .then((r) => alive && setDetail(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, tolerance, live?.crowdScore]);

  const d = live ?? detail?.destination;
  if (!d) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-eco" />
      </div>
    );
  }
  const w = detail?.weather;
  const inTrip = trip?.items.some((i) => i.destinationId === d.id);

  async function addToTrip() {
    if (!d) return;
    if (!trip) {
      toast.info("Plan a trip first — then add destinations to it.");
      return nav("/plan");
    }
    setAdding(true);
    try {
      const lastDay = Math.max(...trip.items.map((i) => i.day));
      const next = {
        ...trip,
        items: [
          ...trip.items,
          {
            id: `it_${Math.random().toString(36).slice(2, 10)}`,
            destinationId: d.id,
            day: lastDay,
            date: trip.items.find((i) => i.day === lastDay)?.date ?? trip.preferences.startDate,
            startTime: "00:00",
            endTime: "00:00",
            durationMinutes: d.averageVisitMinutes,
            travelMinutes: 0,
            travelKm: 0,
            sequence: trip.items.length + 1,
            wasDiverted: false,
          },
        ],
      };
      const r = await api.optimize(next);
      setTrip(r.trip);
      toast.success(`${d.name} added to Day ${lastDay}`);
      nav("/itinerary");
    } finally {
      setAdding(false);
    }
  }

  async function report(status: CrowdStatus) {
    const map: Record<CrowdStatus, number> = { LOW: 30, MODERATE: 55, HIGH: 80, CRITICAL: 94 };
    const r = await api.report(d!.id, map[status]);
    upsertDestination(r.destination);
    toast.success("Thanks! Your crowd report updated the simulation.");
  }

  return (
    <div>
      <DestVisual d={d} className="h-56 md:h-72">
        <div className="container relative flex h-full flex-col justify-between py-5">
          <Link to="/map" className="flex w-fit items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-sm font-semibold text-white backdrop-blur hover:bg-black/40">
            <ArrowLeft className="h-4 w-4" /> {t("map")}
          </Link>
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/90 capitalize text-forest">{d.category}</Badge>
              {d.tags.map((t) => (
                <Badge key={t} className="bg-black/25 capitalize text-white backdrop-blur">
                  {t}
                </Badge>
              ))}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold !text-white drop-shadow md:text-5xl">{d.name}</h1>
            <div className="mt-1 flex items-center gap-1 text-sm text-white/85">
              <MapPin className="h-4 w-4" /> {d.region}, {d.state}
            </div>
          </div>
        </div>
      </DestVisual>

      <div className="container mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-base leading-relaxed">{d.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini icon={Users} label="Capacity" value={d.capacity.toLocaleString("en-IN")} />
              <Mini icon={Leaf} label="Env. sensitivity" value={`${d.environmentalSensitivity}/100`} />
              <Mini icon={Clock} label="Best time" value={`${String(d.bestStartHour).padStart(2, "0")}:00–${String(d.bestEndHour).padStart(2, "0")}:00`} />
              <Mini icon={Leaf} label="Eco score" value={`${d.ecoScore}/100`} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{t("crowdToday")}</CardTitle>
                <SimBadge />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <CrowdMeter value={d.crowdScore} size="lg" threshold={diversionThreshold(tolerance)} />
              <div className="text-sm text-muted-foreground">
                Estimated current visitors: <b className="text-foreground">{d.currentVisitors.toLocaleString("en-IN")}</b> of {d.capacity.toLocaleString("en-IN")} ({Math.round((d.currentVisitors / d.capacity) * 100)}% utilisation)
              </div>
              {detail?.trend && <CrowdTrendChart data={detail.trend} threshold={diversionThreshold(tolerance)} height={220} />}
              <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
                <span className="font-semibold">{t("reportCrowd")}</span>
                {(["LOW", "MODERATE", "HIGH", "CRITICAL"] as CrowdStatus[]).map((s) => (
                  <button key={s} onClick={() => report(s)} className="rounded-full border px-3 py-1 text-xs font-bold hover:bg-muted" style={{ color: STATUS_COLORS[s] }}>
                    {t(`f_${s}` as TKey)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("nearbyAlts")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!detail && <Loader2 className="h-5 w-5 animate-spin text-eco" />}
              {detail?.alternatives.map((a) => {
                const ad = pool.get(a.destinationId);
                if (!ad) return null;
                return (
                  <div key={a.destinationId} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link to={`/destination/${ad.id}`} className="font-bold text-forest hover:underline dark:text-mint">
                          {ad.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {a.experienceMatch}% experience match · {Math.round(a.distanceFromOriginalKm)} km away · score {a.score}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge score={a.crowdScore} />
                        <Button size="sm" variant="ghost" onClick={() => setOpenAlt(openAlt === a.destinationId ? null : a.destinationId)}>
                          {openAlt === a.destinationId ? "Hide" : "Why?"}
                        </Button>
                      </div>
                    </div>
                    {openAlt === a.destinationId && (
                      <div className="mt-4">
                        <WhyRecommendation name={ad.name} alternative={a} />
                      </div>
                    )}
                  </div>
                );
              })}
              {detail && !detail.alternatives.length && <p className="text-sm text-muted-foreground">No comparable alternatives with spare capacity right now.</p>}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <Button size="lg" className="w-full" onClick={addToTrip} disabled={adding || inTrip}>
              {adding ? <Loader2 className="animate-spin" /> : <Plus />} {inTrip ? t("alreadyInTrip") : t("addToTrip")}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{trip ? `Adds to “${trip.name}” and re-optimizes the route` : "You'll be asked to plan a trip first"}</p>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("weather")}</CardTitle>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">{w?.source === "OPEN_METEO" ? "Open-Meteo" : "Fallback estimate"}</span>
              </div>
            </CardHeader>
            <CardContent>
              {w ? (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-extrabold text-forest dark:text-mint">{w.temperature}°C</div>
                      <div className="text-sm text-muted-foreground">{w.condition}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Suitability</div>
                      <div className="text-lg font-bold text-eco">
                        {w.suitabilityLabel} · {w.suitability}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <Mini icon={CloudRain} label="Rain" value={`${w.rainProbability}%`} />
                    <Mini icon={Wind} label="Wind" value={`${w.windSpeed} km/h`} />
                    <Mini icon={Droplets} label="Humidity" value={`${w.humidity}%`} />
                  </div>
                  {w.hourly.length > 0 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                      {w.hourly.slice(0, 10).map((h) => (
                        <div key={h.time} className="min-w-14 rounded-xl bg-muted/60 px-2 py-2 text-center text-xs">
                          <div className="text-muted-foreground">{h.time}</div>
                          <div className="flex items-center justify-center gap-0.5 font-bold">
                            <Thermometer className="h-3 w-3" />
                            {h.temperature}°
                          </div>
                          <div className="text-sky">{h.rainProbability}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-eco" />
              )}
            </CardContent>
          </Card>

          <LocalImpact destination={d} />

          <Card>
            <CardHeader>
              <CardTitle>Tourism places nearby</CardTitle>
            </CardHeader>
            <CardContent>
              {osm === null ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOsm([]);
                    api.osm(d.id).then((r) => setOsm(r.places.length ? r.places : [{ name: "No results (or Overpass unavailable)", kind: "" }]));
                  }}
                >
                  Discover via OpenStreetMap
                </Button>
              ) : osm.length === 0 ? (
                <Loader2 className="h-5 w-5 animate-spin text-eco" />
              ) : (
                <ul className="space-y-1 text-sm">
                  {osm.map((p, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{p.name}</span>
                      <span className="text-xs capitalize text-muted-foreground">{p.kind.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">Optional enrichment from the Overpass API · © OpenStreetMap contributors</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Mini({ icon: I, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <I className="mb-1 h-4 w-4 text-eco" />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
