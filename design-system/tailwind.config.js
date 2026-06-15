/**
 * Wabi-Sabi Entebbe — Tailwind theme extension (v1.0 · 2026-06-15)
 * Mirrors design-system/tokens.json. Drop into a Tailwind project.
 * Fonts: load Cormorant Garamond + Jost (e.g. via Google Fonts) in your HTML/CSS.
 *
 * Usage examples: bg-washi  text-ink  text-brass-500  font-display
 *                 tracking-widest  rounded-organic  shadow-soft-lg
 */
module.exports = {
  content: ["./**/*.{html,js,jsx,ts,tsx,vue,svelte}"],
  darkMode: ["selector", '[data-theme="night"]'],
  theme: {
    extend: {
      colors: {
        washi:  { 50: "#FAF8F0", 100: "#F3EFE1", 200: "#E9E3D0", DEFAULT: "#F3EFE1" },
        stone:  { 300: "#D6CCB6", 400: "#C9BFA6", 500: "#A89E86", 600: "#7C7666" },
        brass:  { 300: "#D8B978", 400: "#C9A14E", 500: "#B98A3C", 600: "#A1762C", 700: "#8A5E14", DEFAULT: "#B98A3C" },
        sumi:   { 700: "#3A352B", 800: "#2B2823", 900: "#16150F", DEFAULT: "#16150F" },
        clay:   "#B07A56",
        matcha: "#7C8366",
        shoyu:  "#3A2A1E",
        // semantic aliases
        ink:        "#16150F",
        "ink-muted":"#3A352B",
        primary:    "#B98A3C",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"EB Garamond"', "Georgia", "serif"],
        sans:    ['"Jost"', '"Inter"', "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.25rem",
        xl: "1.563rem", "2xl": "1.953rem", "3xl": "2.441rem",
        "4xl": "3.052rem", "5xl": "3.815rem", "6xl": "4.768rem",
      },
      letterSpacing: {
        tight: "-0.01em", normal: "0", wide: "0.08em", wider: "0.18em", widest: "0.32em",
      },
      lineHeight: { tight: "1.15", snug: "1.3", normal: "1.6", relaxed: "1.85" },
      borderRadius: {
        sm: "2px", md: "4px", lg: "10px", pill: "999px",
        organic: "62% 38% 54% 46% / 52% 56% 44% 48%",
      },
      boxShadow: {
        "soft-sm": "0 1px 2px rgba(22,21,15,0.06)",
        "soft-md": "0 6px 20px -8px rgba(22,21,15,0.14)",
        "soft-lg": "0 18px 50px -20px rgba(22,21,15,0.22)",
      },
      spacing: { 13: "3.25rem", 18: "4.5rem", 22: "5.5rem", 30: "7.5rem", 38: "9.5rem" },
      maxWidth: { container: "1180px", measure: "68ch" },
      transitionTimingFunction: { calm: "cubic-bezier(0.22, 1, 0.36, 1)" },
      transitionDuration: { 400: "400ms", 700: "700ms" },
      backgroundImage: {
        "gradient-brass": "linear-gradient(135deg, #8A5E14 0%, #C9A14E 45%, #D8B978 100%)",
        kintsugi: "linear-gradient(90deg, transparent, #B98A3C 18%, #D8B978 50%, #B98A3C 82%, transparent)",
      },
    },
  },
  plugins: [],
};
