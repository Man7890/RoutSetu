import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1320px" } },
    extend: {
      fontFamily: { sans: ["Inter", "Noto Sans Devanagari", "system-ui", "sans-serif"] },
      colors: {
        forest: { DEFAULT: "#12372A", 900: "#0B2A1F", 800: "#12372A", 700: "#1A4A39" },
        eco: { DEFAULT: "#2E7D5B", light: "#3C9A71" },
        mint: { DEFAULT: "#A7D7C5", soft: "#E3F2EC" },
        sky: { DEFAULT: "#5BA7D1", soft: "#E4F1F8" },
        status: { low: "#2E8B57", moderate: "#E0A72F", high: "#E07832", critical: "#D64545", alt: "#3B82F6" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 4px)", sm: "calc(var(--radius) - 8px)", xl: "1.25rem", "2xl": "1.5rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(18,55,42,0.04), 0 8px 24px -6px rgba(18,55,42,0.10)",
        lift: "0 2px 4px rgba(18,55,42,0.05), 0 18px 40px -12px rgba(18,55,42,0.22)",
      },
      keyframes: {
        pulseRing: { "0%": { transform: "scale(0.6)", opacity: "0.9" }, "100%": { transform: "scale(2.4)", opacity: "0" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: { "pulse-ring": "pulseRing 1.8s ease-out infinite", floaty: "floaty 6s ease-in-out infinite" },
    },
  },
  plugins: [animate],
};
