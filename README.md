# RouteSetu — adaptive eco-tourism planner (Bastar, Chhattisgarh)

RouteSetu spreads visitors across comparable destinations when a site gets overcrowded, while keeping the kind of trip the traveller asked for. It combines simulated live crowd data, weather, capacity, environmental sensitivity and the local economy to rebuild itineraries on the fly.

> **Prototype Live Simulation.** Crowd numbers are synthetic and are **not** real visitor counts. All CO₂, distance and pressure figures are estimates (see `/about` in the app or `shared/engine.ts` → `ASSUMPTIONS`).

## Stack
- **Client:** React 18 + TypeScript + Vite, Tailwind CSS, shadcn-style primitives (Radix), Lucide, Recharts, React Leaflet (OpenStreetMap), Framer Motion, Zustand (persisted to localStorage)
- **Server:** Node + Express + TypeScript (tsx), Zod validation, Prisma + SQLite, with an automatic in-memory fallback if the DB is unavailable
- **Shared:** `shared/engine.ts` contains the scoring, itinerary, impact and redistribution logic. Server and client both use it, which is how the offline fallback works.
- **External APIs (all optional, all with fallbacks):** Open-Meteo weather (no key), Nominatim geocoding (called from the backend only, with caching, a 1 req/s throttle and a proper User-Agent), Overpass nearby places (on demand)

## Run locally
```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"
npm run setup               # prisma generate + db push + seed (16 destinations, demo events)
npm run dev                 # API on :3001, web on :5173 (Vite proxies /api)
```
Production: `npm run build && npm start`. The Express server serves `dist/client` on :3001.

Checks: `npm run typecheck`, `npm run lint`, `npm run build`.

## Pages
`/` landing · `/plan` smart planner · `/itinerary` day-by-day plan with live re-planning · `/map` live crowd map · `/destination/:id` · `/dashboard` Tourism Load Command Center · `/simulator` crowd-surge simulator · `/impact` impact report · `/saved` saved trips · `/about` methodology

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | status + repo kind (prisma/memory) |
| GET | `/api/destinations`, `/api/destinations/:id` | list / detail (+alternatives, weather, trend) |
| GET | `/api/destinations/:id/osm` | optional Overpass enrichment |
| GET | `/api/crowd` | live simulated crowd snapshot |
| POST | `/api/crowd/report` | community crowd report |
| GET | `/api/weather`, `/api/weather/:destinationId` | Open-Meteo, with fallback |
| GET | `/api/geocode?q=` | Nominatim (cached, throttled), with local fallback |
| POST | `/api/itinerary/generate` | traditional vs optimized itinerary |
| POST | `/api/itinerary/optimize` | re-plan an existing trip against live crowds |
| POST | `/api/simulation/crowd-surge` | apply a surge, rank alternatives, redistribute, optionally re-plan a trip |
| POST | `/api/simulation/reset` · GET `/api/simulation/events` | reset / event log |
| GET | `/api/stats` · `/api/impact/:tripId` · `/api/trips/:id` · `/api/assumptions` | command-center stats, impact, shared trips |

## 2-minute demo
1. **Plan** → Generate Smart Itinerary (default preferences work).
2. **Simulator** → pick Chitrakote Falls → **Critical Surge** → Simulate.
3. Look at the diversion card, the "Why" breakdown, and the before/after load redistribution.
4. **Itinerary**: the replaced stop is highlighted and impact is recalculated.
5. **Command Center / Impact**: regional totals.

## Alternative score
```
0.30·experience + 0.22·crowd availability + 0.12·proximity + 0.08·weather
+ (0.06–0.14)·environment (scales with eco priority) + 0.10·local economy
− 0.04·travel cost − 0.04·extra travel time   → normalised 0–100
```
A stop is diverted when its crowd score goes above the traveller's threshold (80–95%, set by crowd tolerance).

The original brief was cut off in the middle of the seed data, so the 16 Bastar destinations in `shared/seed.ts` are researched approximations: coordinates, capacities and scores are illustrative.
