import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Destination, Weather } from "@shared/types";
import { ALT_COLOR, STATUS_COLORS, crowdStatus, diversionThreshold, scoreAlternatives } from "@shared/engine";
import { HUBS } from "@shared/seed";
import { StatusBadge } from "./StatusBadge";

function icon(color: string, pulse: boolean, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="rs-marker ${selected ? "selected" : ""}">${pulse ? `<span class="ring" style="background:${color}"></span>` : ""}<span class="dot" style="background:${color}"></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function FitBounds({ points, padding = 40 }: { points: [number, number][]; padding?: number }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, padding]);
  return null;
}

function FlyTo({ target }: { target?: Destination }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 10), { duration: 0.8 });
  }, [target, map]);
  return null;
}

function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export function CrowdMap({
  destinations,
  weather = {},
  selectedId,
  onSelect,
  alternativeIds = [],
  route,
  className,
  tolerance = 60,
  showPopups = true,
  fitIds,
  flyToSelected,
}: {
  destinations: Destination[];
  weather?: Record<string, Weather>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  alternativeIds?: string[];
  route?: [number, number][];
  className?: string;
  tolerance?: number;
  showPopups?: boolean;
  fitIds?: string[];
  flyToSelected?: boolean;
}) {
  const threshold = diversionThreshold(tolerance);
  const fitPoints = useMemo<[number, number][]>(() => {
    const src = fitIds?.length ? destinations.filter((d) => fitIds.includes(d.id)) : destinations;
    return src.map((d) => [d.latitude, d.longitude]);
  }, [destinations, fitIds]);
  const selected = destinations.find((d) => d.id === selectedId);

  return (
    <div className={className}>
      <MapContainer center={[19.08, 81.9]} zoom={9} scrollWheelZoom zoomControl={false} className="h-full w-full" style={{ minHeight: 280 }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomright" />
        <FitBounds points={fitPoints} />
        <InvalidateOnResize />
        {flyToSelected && <FlyTo target={selected} />}
        {route && route.length > 1 && <Polyline positions={route} pathOptions={{ color: "#12372A", weight: 3, dashArray: "6 8", opacity: 0.7 }} />}
        <Marker
          position={[HUBS.jagdalpur.lat, HUBS.jagdalpur.lon]}
          icon={L.divIcon({
            className: "",
            html: `<div style="background:#12372A;color:#fff;font:600 10px Inter;padding:3px 7px;border-radius:999px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap">Jagdalpur hub</div>`,
            iconSize: [90, 20],
            iconAnchor: [45, 10],
          })}
        />
        {destinations.map((d) => {
          const isAlt = alternativeIds.includes(d.id);
          const status = crowdStatus(d.crowdScore);
          const color = isAlt ? ALT_COLOR : STATUS_COLORS[status];
          const w = weather[d.id];
          const alts = showPopups
            ? scoreAlternatives(d, destinations, { interests: d.tags, ecoPriority: 60, threshold, weather }).slice(0, 2)
            : [];
          return (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
              icon={icon(color, status === "CRITICAL" || status === "HIGH" || isAlt, d.id === selectedId)}
              eventHandlers={{ click: () => onSelect?.(d.id) }}
            >
              {showPopups && (
                <Popup>
                  <div className="min-w-[220px] space-y-2 font-sans">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-forest">{d.name}</strong>
                      <StatusBadge score={d.crowdScore} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>Crowd score</span>
                      <b className="text-right">{d.crowdScore}/100</b>
                      <span>Utilisation</span>
                      <b className="text-right">
                        {d.currentVisitors.toLocaleString("en-IN")}/{d.capacity.toLocaleString("en-IN")}
                      </b>
                      <span>Env. sensitivity</span>
                      <b className="text-right">{d.environmentalSensitivity}/100</b>
                      <span>Weather</span>
                      <b className="text-right">{w ? `${w.temperature}°C · ${w.suitabilityLabel}` : "—"}</b>
                      <span>Best time</span>
                      <b className="text-right">
                        {String(d.bestStartHour).padStart(2, "0")}:00–{String(d.bestEndHour).padStart(2, "0")}:00
                      </b>
                    </div>
                    {alts.length > 0 && (
                      <div className="text-xs">
                        <div className="font-semibold text-slate-500">Alternatives</div>
                        {alts.map((a) => (
                          <div key={a.destinationId} className="flex justify-between">
                            <span>{destinations.find((x) => x.id === a.destinationId)?.name}</span>
                            <span className="font-semibold text-emerald-700">{a.crowdScore}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Link to={`/destination/${d.id}`} className="block rounded-full bg-forest py-1.5 text-center text-xs font-semibold !text-white">
                      View details
                    </Link>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export function MapLegend({ className }: { className?: string }) {
  const items = [
    ["Low", STATUS_COLORS.LOW],
    ["Moderate", STATUS_COLORS.MODERATE],
    ["High", STATUS_COLORS.HIGH],
    ["Critical", STATUS_COLORS.CRITICAL],
    ["Eco-alternative", ALT_COLOR],
  ];
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {items.map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5 text-xs font-medium">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}
