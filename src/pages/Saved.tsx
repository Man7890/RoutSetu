import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, CalendarDays, Leaf, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/Layout";
import { ShareTripDialog, ecoScoreOf } from "@/components/ShareTripDialog";
import { useDestMap, useStore } from "@/store/useStore";
import { fmtDate } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function Saved() {
  const tr = useT();
  const { savedTrips, deleteSaved, setTrip } = useStore();
  const pool = useDestMap();
  const nav = useNavigate();

  return (
    <div className="container">
      <PageHeader eyebrow={tr("savedEyebrow")} title={tr("savedTitle")} subtitle={tr("savedSub")} />
      {!savedTrips.length ? (
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <Bookmark className="h-10 w-10 text-eco" />
          <p className="text-muted-foreground">{tr("noSaved")}</p>
          <Button asChild>
            <Link to="/plan">{tr("planTrip")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {savedTrips.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{t.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(t.preferences.startDate)} · {t.preferences.days}d
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {t.preferences.travelers}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-bold text-forest dark:bg-white/10 dark:text-mint">
                    <Leaf className="h-3.5 w-3.5" /> {ecoScoreOf(t, pool)}
                  </span>
                </div>
                <ol className="mt-4 flex-1 space-y-1 text-sm">
                  {t.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span className="truncate">{pool.get(it.destinationId)?.name ?? it.destinationId}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">D{it.day}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-muted/60 p-2">
                    <div className="font-bold">{t.impact.optimized.distanceKm} km</div>
                    <div className="text-muted-foreground">distance</div>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-2">
                    <div className="font-bold">{t.impact.optimized.estimatedCO2Kg} kg</div>
                    <div className="text-muted-foreground">CO₂ est.</div>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-2">
                    <div className="font-bold">{t.diversions.length}</div>
                    <div className="text-muted-foreground">diversions</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setTrip(t);
                      nav("/itinerary");
                    }}
                  >
                    {tr("open")}
                  </Button>
                  <ShareTripDialog trip={t} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete trip"
                    onClick={() => {
                      deleteSaved(t.id);
                      toast("Trip deleted");
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
