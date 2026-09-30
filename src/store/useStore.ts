import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Destination, SimulationResult, Trip, TripPreferences, Weather } from "@shared/types";
import { todayISO } from "@/lib/utils";

export const DEFAULT_PREFS: TripPreferences = {
  name: "",
  origin: "Raipur, Chhattisgarh",
  destinationRegion: "Bastar / Chitrakote, Chhattisgarh",
  startDate: todayISO(),
  days: 2,
  travelers: 4,
  budget: 25000,
  interests: ["waterfalls", "nature", "culture", "photography"],
  pace: "balanced",
  ecoPriority: 70,
  crowdTolerance: 60,
};

interface State {
  destinations: Destination[];
  weather: Record<string, Weather>;
  updatedAt?: string;
  apiOnline: boolean;
  prefs: TripPreferences;
  trip: Trip | null;
  savedTrips: Trip[];
  lastSimulation: SimulationResult | null;
  theme: "light" | "dark";
  lang: "en" | "hi";
  setDestinations: (d: Destination[], updatedAt?: string) => void;
  upsertDestination: (d: Destination) => void;
  setWeather: (w: Record<string, Weather>) => void;
  setApiOnline: (v: boolean) => void;
  setPrefs: (p: Partial<TripPreferences>) => void;
  setTrip: (t: Trip | null) => void;
  saveTrip: (t: Trip) => void;
  deleteSaved: (id: string) => void;
  setSimulation: (s: SimulationResult | null) => void;
  toggleTheme: () => void;
  toggleLang: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      destinations: [],
      weather: {},
      apiOnline: true,
      prefs: DEFAULT_PREFS,
      trip: null,
      savedTrips: [],
      lastSimulation: null,
      theme: "light",
      lang: "en",
      setDestinations: (destinations, updatedAt) => set({ destinations, updatedAt }),
      upsertDestination: (d) => set((s) => ({ destinations: s.destinations.map((x) => (x.id === d.id ? d : x)) })),
      setWeather: (weather) => set({ weather }),
      setApiOnline: (apiOnline) => set({ apiOnline }),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
      setTrip: (trip) => set({ trip }),
      saveTrip: (t) => set((s) => ({ savedTrips: [t, ...s.savedTrips.filter((x) => x.id !== t.id)].slice(0, 30) })),
      deleteSaved: (id) => set((s) => ({ savedTrips: s.savedTrips.filter((x) => x.id !== id) })),
      setSimulation: (lastSimulation) => set({ lastSimulation }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      toggleLang: () => set((s) => ({ lang: s.lang === "en" ? "hi" : "en" })),
    }),
    {
      name: "routesetu-v1",
      partialize: (s) => ({ prefs: s.prefs, trip: s.trip, savedTrips: s.savedTrips, theme: s.theme, lang: s.lang, lastSimulation: s.lastSimulation }),
    },
  ),
);

export const useDestMap = () => {
  const list = useStore((s) => s.destinations);
  return new Map(list.map((d) => [d.id, d]));
};
