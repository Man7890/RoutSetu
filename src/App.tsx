import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Plan from "@/pages/Plan";
import Itinerary from "@/pages/Itinerary";
import MapPage from "@/pages/MapPage";
import DestinationPage from "@/pages/DestinationPage";
import Dashboard from "@/pages/Dashboard";
import Simulator from "@/pages/Simulator";
import Impact from "@/pages/Impact";
import Saved from "@/pages/Saved";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="plan" element={<Plan />} />
        <Route path="itinerary" element={<Itinerary />} />
        <Route path="map" element={<MapPage />} />
        <Route path="destination/:id" element={<DestinationPage />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="simulator" element={<Simulator />} />
        <Route path="impact" element={<Impact />} />
        <Route path="saved" element={<Saved />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
