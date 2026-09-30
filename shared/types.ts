export type Interest =
  | "nature"
  | "waterfalls"
  | "wildlife"
  | "culture"
  | "adventure"
  | "heritage"
  | "food"
  | "photography"
  | "rural";

export const INTERESTS: { id: Interest; label: string }[] = [
  { id: "nature", label: "Nature" },
  { id: "waterfalls", label: "Waterfalls" },
  { id: "wildlife", label: "Wildlife" },
  { id: "culture", label: "Culture" },
  { id: "adventure", label: "Adventure" },
  { id: "heritage", label: "Heritage" },
  { id: "food", label: "Food" },
  { id: "photography", label: "Photography" },
  { id: "rural", label: "Rural experiences" },
];

export type Pace = "relaxed" | "balanced" | "packed";
export type CrowdStatus = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type DataSource = "SIMULATION" | "USER_REPORT" | "API";

export interface Destination {
  id: string;
  name: string;
  slug: string;
  description: string;
  latitude: number;
  longitude: number;
  region: string;
  state: string;
  category: string;
  tags: Interest[];
  capacity: number;
  baseVisitors: number;
  currentVisitors: number;
  crowdScore: number;
  environmentalSensitivity: number;
  ecoScore: number;
  popularityScore: number;
  localEconomyScore: number;
  averageVisitMinutes: number;
  bestStartHour: number;
  bestEndHour: number;
  averageCost: number;
  imageUrl: string;
  localOpportunities: string[];
}

export interface Weather {
  destinationId: string;
  temperature: number;
  humidity: number;
  rainProbability: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  condition: string;
  suitability: number;
  suitabilityLabel: "Excellent" | "Good" | "Fair" | "Poor";
  hourly: { time: string; temperature: number; rainProbability: number }[];
  source: "OPEN_METEO" | "FALLBACK";
  fetchedAt: string;
}

export interface TripPreferences {
  name?: string;
  origin: string;
  destinationRegion: string;
  startDate: string;
  days: number;
  travelers: number;
  budget: number;
  interests: Interest[];
  pace: Pace;
  ecoPriority: number;
  crowdTolerance: number;
}

export interface ItineraryItem {
  id: string;
  destinationId: string;
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  travelMinutes: number;
  travelKm: number;
  sequence: number;
  originalDestinationId?: string | null;
  wasDiverted: boolean;
  diversionReason?: string | null;
}

export interface AlternativeScoreBreakdown {
  experienceMatch: number;
  crowdAvailability: number;
  distance: number;
  weather: number;
  environment: number;
  localEconomy: number;
  travelCost: number;
  travelTime: number;
}

export interface Alternative {
  destinationId: string;
  score: number;
  experienceMatch: number;
  crowdScore: number;
  extraDistanceKm: number;
  distanceFromOriginalKm: number;
  timeSavedMinutes: number;
  pressureReducedPct: number;
  co2ImpactPct: number;
  crowdReductionPct: number;
  weatherLabel: string;
  breakdown: AlternativeScoreBreakdown;
  reasons: string[];
}

export interface Diversion {
  itemId: string;
  originalDestinationId: string;
  newDestinationId: string;
  originalCrowd: number;
  newCrowd: number;
  reason: string;
  alternative: Alternative;
}

export interface ImpactSummary {
  distanceKm: number;
  estimatedCO2Kg: number;
  environmentalPressure: number;
  crowdExposure: number;
  crowdExposureLabel: CrowdStatus;
  highPressureStops: number;
  totalMinutes: number;
  estimatedCost: number;
}

export interface ImpactComparison {
  traditional: ImpactSummary;
  optimized: ImpactSummary;
  co2SavedKg: number;
  distanceDeltaKm: number;
  pressureReducedPct: number;
  crowdExposureReducedPct: number;
  timeSavedMinutes: number;
  redistributedVisitors: number;
}

export interface Trip {
  id: string;
  name: string;
  preferences: TripPreferences;
  items: ItineraryItem[];
  traditionalItems: ItineraryItem[];
  diversions: Diversion[];
  impact: ImpactComparison;
  createdAt: string;
  endDate: string;
}

export interface LoadBar {
  destinationId: string;
  name: string;
  before: number;
  after: number;
}

export interface SimulationResult {
  event: {
    id: string;
    destinationId: string;
    previousCrowdScore: number;
    newCrowdScore: number;
    triggerType: string;
    createdAt: string;
  };
  destination: Destination;
  status: CrowdStatus;
  threshold: number;
  overloaded: boolean;
  alternatives: Alternative[];
  redistribution: LoadBar[];
  visitorsRedistributed: number;
  trip?: Trip;
  diversions?: Diversion[];
}

export interface CommandStats {
  monitored: number;
  critical: number;
  high: number;
  lowAlternatives: number;
  visitorsRedistributed: number;
  co2AvoidedKg: number;
  pressureReductionPct: number;
  events: SimulationResult["event"][];
  activeDiversions: {
    id: string;
    from: string;
    to: string;
    fromCrowd: number;
    toCrowd: number;
    visitors: number;
    createdAt: string;
  }[];
}
