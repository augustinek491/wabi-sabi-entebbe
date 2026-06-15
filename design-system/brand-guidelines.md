# Wabi-Sabi Entebbe — Brand Guidelines

**v1.0 · 2026-06-15.** A living guide. Visual tokens live in
[`tokens.css`](tokens.css) / [`tokens.json`](tokens.json) / [`tailwind.config.js`](tailwind.config.js);
see them rendered in [`styleguide.html`](styleguide.html).

> **Provenance & honesty.** This v1 is derived from the **logo** (colours sampled
> programmatically) and the **wabi-sabi** philosophy the brand is named for. Items marked 🟡 are
> *informed inference* and should be confirmed once the website/brand assets are available.

---

## 1. Brand essence

> **Beauty in the imperfect. Stillness you can taste.**

Wabi-Sabi is a Japanese-fusion restaurant and sushi bar on the shore of Lake Victoria. The brand
borrows its name — and its entire design philosophy — from *wabi-sabi* (侘寂): the beauty of the
imperfect, impermanent, and incomplete. Everything we make should feel **calm, natural,
hand-crafted, and unforced.**

**The test for any decision:** *Is it calm? Is it natural? Does it feel made by a human hand?*
If it's loud, glossy, perfectly symmetrical, or generic — it isn't us.

| We are | We are not |
|---|---|
| Calm, spacious, considered | Busy, loud, hard-selling |
| Warm, hospitable, human | Cold, corporate, sterile |
| Handmade, textured, organic | Glossy, plastic, mass-produced |
| Quietly refined | Flashy or ostentatious |
| Asymmetric, imperfect-on-purpose | Rigidly symmetrical / "perfect" |

---

## 2. Logo

The logo pairs a golden **ensō** (Zen brush-circle) crossed by black **sumi brushstrokes** with a
letter-spaced wordmark and the tagline *"A Japanese Fusion Restaurant."*

**Do**
- Give it generous clear space — at least the height of the "W" on every side.
- Place it on washi ivory, sumi black, or a calm photograph.
- Keep the gold + ink relationship intact.

**Don't**
- Recolour the ensō outside the brass range, stretch, rotate, or add effects (drop shadows, bevels).
- Crowd it, or place it on a busy/low-contrast background.
- Recreate the brushwork — it is hand-made; preserve its imperfection.

> ⚠️ We currently hold one rasterised logo (`assets/brand-hero.jpeg`, 392×392). **Request vector
> (SVG/EPS) masters and mono/reversed variants** from the brand for production use.

---

## 3. Colour

Anchored to values sampled from the logo. Use **warm neutrals for ~85%** of any surface, **ink
for text**, and **brass as the single, sparing accent** (~5–10%). Restraint is the point.

| Token | Hex | Use |
|---|---|---|
| Washi 100 | `#F3EFE1` | Primary background |
| Washi 50 | `#FAF8F0` | Raised surfaces / cards |
| Washi 200 | `#E9E3D0` | Sunken / alt sections |
| Sumi 900 | `#16150F` | Primary text, strokes |
| Sumi 700 | `#3A352B` | Secondary text |
| Stone 400 | `#C9BFA6` | Borders, hairlines |
| **Brass 500** | **`#B98A3C`** | **Primary accent** (the ensō gold) |
| Brass 700 | `#8A5E14` | Deep gold, gradients |
| Clay 500 | `#B07A56` | Earthen secondary accent (sparing) |
| Matcha 500 | `#7C8366` | Natural secondary accent (sparing) |

**Accessibility:** body text is Sumi on Washi (~14:1 — excellent). **Gold is decorative, not a text
colour on light** — for gold buttons, use **dark ink text on gold** (`--color-on-primary`). A
**"Sumi Night"** dark theme is included in the tokens.

---

## 4. Typography

🟡 *Stand-in pairing pending the real brand fonts.*

- **Display — Cormorant Garamond** (elegant high-contrast serif). Headlines, the wordmark feel,
  large quotes. Often in **spaced capitals** for the wordmark/eyebrow effect.
- **Body / UI — Jost** (calm geometric-humanist sans). Paragraphs, labels, navigation, menus.
- **Eyebrows / labels — Jost, UPPERCASE, `letter-spacing: 0.32em`** — echoes `ENTEBBE`.

**Scale** (1.25 ratio): see `--text-*` tokens. **Set body at `--leading-normal` (1.6)** and keep line
length to `--measure` (≈68 characters). Let headings breathe with tight leading + generous margin.

---

## 5. Motifs & texture — the visual toolkit

- **Ensō** — the hero gesture. Frame a dish photo, or open a section.
- **Sumi brushstroke** — dividers, underlines, hover accents.
- **Seigaiha (ripples)** — barely-there background texture (≤16% opacity). Nods to Lake Victoria.
- **Kintsugi seam** — a thin gold line for emphasis/dividers; imperfection made precious.
- **Ma (negative space)** — the most important asset. When unsure, add space, not elements.
- **Natural texture** — washi grain, matte ceramic, wood, stone, soft shadow.

---

## 6. Imagery & art direction

🟡 *Direction, pending real photography.*

- **Light:** warm, natural, directional; soft shadows. Golden-hour over clinical brightness.
- **Subjects:** close, tactile food (sushi, plating), hands at work, ceramics, the lake, candlelight.
- **Treatment:** muted, warm grade; real texture; shallow depth of field; asymmetric crops with
  breathing room. Avoid HDR, heavy saturation, stock-photo gloss, and busy collages.

---

## 7. Voice & tone

Calm, sensory, present, quietly refined — see [05-brand-identity.md](../knowledge-base/05-brand-identity.md).

| Context | Example 🟡 |
|---|---|
| Tagline | *A Japanese fusion restaurant.* |
| Hero | *A quiet table by the lake. Sushi at the bar. Time, slowed.* |
| Reservation CTA | *Reserve a moment.* |
| Empty/closed state | *We're resting. Back to the bar soon.* |

**Do:** short lines, sensory nouns, restraint. **Don't:** hype, exclamation spam, emoji clutter,
"best in town" clichés.

---

## 8. Components

Buttons, cards, eyebrows, dividers, inputs and the organic image frame are demonstrated live in
[`styleguide.html`](styleguide.html). Principles: hairline borders, soft warm shadows, calm
400ms `--ease-calm` transitions, gold reserved for the primary action only.

---

## 9. Applications

- **Menu:** Cormorant headings, Jost body, brass section rules (kintsugi seam), lots of `ma`.
- **Signage:** ensō + wordmark in brass on sumi or washi.
- **Social:** consistent washi/ink/brass templates; spaced-caps eyebrows; one idea per post.
- **Web:** washi background, asymmetric layouts, ensō section openers, generous whitespace,
  optional Sumi Night mode.

---

## 10. Status & next steps

- ✅ Solid: palette, motifs, principles, token system, component direction.
- 🟡 Confirm: real typefaces, photography, voice specifics.
- ⚠️ Needed for production: **vector logo masters**, brand fonts, real menu, approved photography.

When the website is unlocked or assets are shared, revisit §2, §4, §6 and re-sample colours from
the live site to finalise v2.
