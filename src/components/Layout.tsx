import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Languages, Menu, Moon, Sun, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useT, type TKey } from "@/lib/i18n";
import { useLiveData } from "@/hooks/useLiveData";
import { cn } from "@/lib/utils";

const NAV: { to: string; key: TKey }[] = [
  { to: "/plan", key: "plan" },
  { to: "/map", key: "map" },
  { to: "/dashboard", key: "dashboard" },
  { to: "/simulator", key: "simulator" },
  { to: "/impact", key: "impact" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-extrabold tracking-tight text-forest dark:text-mint", className)}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
        <rect width="64" height="64" rx="16" fill="#12372A" />
        <path d="M14 44c8-16 16-20 36-24" stroke="#A7D7C5" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="14" cy="44" r="5" fill="#5BA7D1" />
        <circle cx="50" cy="20" r="5" fill="#2E7D5B" stroke="#A7D7C5" strokeWidth="2" />
      </svg>
      <span className="text-lg">
        Route<span className="text-eco dark:text-mint/80">Setu</span>
      </span>
    </Link>
  );
}

function Navbar() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme, toggleLang, lang, apiOnline } = useStore();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-mint-soft text-forest dark:bg-white/10 dark:text-mint" : "text-muted-foreground hover:text-forest dark:hover:text-mint",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={link}>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-1.5 lg:flex">
          {!apiOnline && (
            <span className="flex items-center gap-1 rounded-full bg-status-high/10 px-2.5 py-1 text-xs font-semibold text-status-high" title="API unreachable — using offline fallback data">
              <WifiOff className="h-3.5 w-3.5" /> Offline mode
            </span>
          )}
          <NavLink to="/saved" className={link}>
            <span className="flex items-center gap-1.5">
              <Bookmark className="h-4 w-4" /> {t("saved")}
            </span>
          </NavLink>
          <Button variant="ghost" size="icon" onClick={toggleLang} aria-label="Toggle language" title={lang === "en" ? "हिन्दी" : "English"}>
            <Languages />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button asChild>
            <Link to="/plan">{t("planTrip")}</Link>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t bg-background lg:hidden"
          >
            <div className="container flex flex-col gap-1 py-3">
              {[...NAV, { to: "/saved", key: "saved" as TKey }, { to: "/about", key: "about" as TKey }].map((n) => (
                <NavLink key={n.to} to={n.to} className={link}>
                  {t(n.key)}
                </NavLink>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleLang}>
                  <Languages /> {lang === "en" ? "हिन्दी" : "English"}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun /> : <Moon />} {theme === "dark" ? "Light" : "Dark"}
                </Button>
                <Button asChild size="sm" className="ml-auto">
                  <Link to="/plan">{t("planTrip")}</Link>
                </Button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t bg-card/50">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-md text-sm text-muted-foreground">
            Crowd-aware eco-tourism planning. Crowd figures are a prototype live simulation; weather from Open-Meteo; maps © OpenStreetMap contributors.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-forest">How it works</Link>
          <Link to="/simulator" className="hover:text-forest">Simulator</Link>
          <Link to="/dashboard" className="hover:text-forest">Command Center</Link>
          <Link to="/saved" className="hover:text-forest">Saved trips</Link>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  useLiveData();
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);
  const loc = useLocation();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => window.scrollTo({ top: 0 }), [loc.pathname]);
  const fullBleed = loc.pathname === "/map";
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={loc.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      {!fullBleed && <Footer />}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-6 pt-8 md:flex-row md:items-end md:justify-between md:pt-12">
      <div className="space-y-2">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
        {subtitle && <p className="max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
