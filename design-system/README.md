# Wabi-Sabi Entebbe — Design System

A buildable brand design system grounded in the logo (colours sampled programmatically) and the
*wabi-sabi* aesthetic. **v1.0 · 2026-06-15.**

## Files

| File | What it is |
|---|---|
| [`styleguide.html`](styleguide.html) | **Start here.** Live, self-contained styleguide — open in a browser. Palette, type, components, motifs, voice, and a "Sumi Night" dark-mode toggle. |
| [`brand-guidelines.md`](brand-guidelines.md) | The narrative guide — essence, logo, colour, type, motifs, imagery, voice, do/don't, applications. |
| [`tokens.css`](tokens.css) | Single source of truth — CSS custom properties (light + "Sumi Night"). `@import` it. |
| [`tokens.json`](tokens.json) | Machine-readable tokens (for Style Dictionary, scripts, other platforms). |
| [`tailwind.config.js`](tailwind.config.js) | Tailwind `theme.extend` mirroring the tokens. |

## Quick start

**Plain CSS / HTML**
```html
<link rel="stylesheet" href="design-system/tokens.css">
<body class="ws-base"> … use var(--color-primary), var(--font-display), etc. … </body>
```

**Tailwind** — copy `tailwind.config.js` into your project, then `bg-washi text-ink text-brass-500
font-display tracking-widest rounded-organic shadow-soft-lg`.

**Fonts** (stand-ins, free): add to your `<head>` —
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
```

## The 30-second brief

> Warm neutrals (~85%), ink for text, **one** sparing gold accent. Elegant serif + calm sans.
> Asymmetry, hand-made texture, generous negative space. Calm, never loud.

## Status & provenance

- ✅ Grounded: palette (sampled from logo), motifs, principles, tokens.
- 🟡 Inferred (confirm later): typefaces, voice specifics, photography.
- ⚠️ For production: request **vector logo masters** + real brand fonts; re-sample colours from
  the live website once unlocked, then cut **v2**.
