import { useStore } from "@/store/useStore";

const dict = {
  en: {
    plan: "Plan",
    map: "Live Map",
    dashboard: "Command Center",
    simulator: "Simulator",
    impact: "Impact",
    saved: "Saved Trips",
    about: "How It Works",
    planTrip: "Plan a Trip",
    heroA: "Travel Better.",
    heroB: "Explore Further.",
    heroC: "Leave Less Pressure Behind.",
    heroSub: "AI-powered crowd-aware travel planning that dynamically balances tourism across destinations.",
    planMyTrip: "Plan My Trip",
    exploreMap: "Explore Live Map",
    seeHow: "See How It Works",
    simulated: "Prototype Live Simulation",
    generate: "Generate Smart Itinerary",
    simulate: "Simulate Crowd Surge",
  },
  hi: {
    plan: "योजना",
    map: "लाइव मानचित्र",
    dashboard: "कमांड सेंटर",
    simulator: "सिम्युलेटर",
    impact: "प्रभाव",
    saved: "सहेजी यात्राएँ",
    about: "यह कैसे काम करता है",
    planTrip: "यात्रा योजना बनाएँ",
    heroA: "बेहतर यात्रा करें।",
    heroB: "और आगे खोजें।",
    heroC: "प्रकृति पर कम दबाव छोड़ें।",
    heroSub: "भीड़-जागरूक AI यात्रा योजना जो पर्यटन को गंतव्यों में संतुलित रूप से बाँटती है।",
    planMyTrip: "मेरी यात्रा बनाएँ",
    exploreMap: "लाइव मानचित्र देखें",
    seeHow: "कैसे काम करता है",
    simulated: "प्रोटोटाइप लाइव सिमुलेशन",
    generate: "स्मार्ट यात्रा-कार्यक्रम बनाएँ",
    simulate: "भीड़ उछाल सिम्युलेट करें",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];
export function useT() {
  const lang = useStore((s) => s.lang);
  return (k: TKey) => dict[lang][k] ?? dict.en[k];
}
