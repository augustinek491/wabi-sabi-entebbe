# Shared UI primitives — `src/components/ui`

Bespoke, token-based components for the Wabi-Sabi Entebbe review system.
Built against `design-system/tokens.json` / `tailwind.config.ts` and
`docs/IMPLEMENTATION-PLAN.md` §7 + `docs/PLAN-ADDENDUM.md` §E1/§F.

**Rules for feature agents (diner flow, admin dashboard):**

- Import from `@/components/ui` (barrel export in `index.ts`).
- Do not introduce new hardcoded hex colors — extend `tailwind.config.ts` /
  `globals.css` tokens if something is missing, and mirror the change back
  to `design-system/tokens.json`.
- Gold (`primary` / brass) is accent-only: one primary CTA per screen, or
  the rating-fill / focus ring. Do not use brass for chip selection,
  decorative backgrounds, or repeated UI chrome.
- Unselected interactive control outlines (rating circles, chips, inputs)
  use `--color-interactive-border` (`border-interactive-border` in
  Tailwind) — **not** `--color-border-strong`, which is decorative-only and
  fails the 3:1 non-text contrast requirement (PLAN-ADDENDUM §E1).
- Never remove focus styles (`outline: none` is banned). The global
  `:focus-visible` rule in `globals.css` already applies `--color-focus`.
- All animated/transitioning components must degrade gracefully under
  `prefers-reduced-motion: reduce` — the global override in `globals.css`
  clamps animation/transition durations to ~0, so most components need no
  extra work, but avoid building effects that *require* motion to convey
  state (always pair motion with a non-motion signal: label text, fill,
  shadow, `aria-pressed`/`aria-checked`).

---

## `Button` / `ButtonLink`

```tsx
import { Button, ButtonLink } from "@/components/ui";

<Button variant="primary" onClick={handleSubmit}>Continue →</Button>
<Button variant="ghost">Back</Button>
<Button variant="link">Leave a note</Button>

// Anchor-rendered (e.g. with next/link `passHref legacyBehavior`):
<ButtonLink variant="primary" href="/r/DEMO">Begin</ButtonLink>
```

**Props** (`ButtonProps` extends `ButtonHTMLAttributes<HTMLButtonElement>`):

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `"primary" \| "ghost" \| "link"` | `"primary"` | `primary` = gold fill + dark-ink text, one per screen. `ghost` = outlined secondary. `link` = text-only tertiary. |
| `fullWidth` | `boolean` | `false` | Use for the sticky bottom action bar on diner screens (PLAN §4.4). |
| ...rest | native `<button>` props | — | `disabled`, `type`, `aria-*`, etc. all pass through. |

`ButtonLink` has the same `variant`/`fullWidth` props plus native `<a>`
attributes (`href`, etc.).

All variants meet the >=44px touch target and use the shared
`:focus-visible` ring — do not add custom focus styling.

---

## `RatingScale`

**The anti-anchoring control.** Symmetric 5-point scale, neutral center
("As expected"), **no default selection**, full keyboard support.

```tsx
import { RatingScale } from "@/components/ui";
import type { Rating, RatingValue } from "@/lib/types";

const [rating, setRating] = useState<Rating>(null); // MUST start null

<RatingScale
  value={rating}
  onChange={(value: RatingValue) => setRating(value)}
  label={`Rate the ${dish.name}`}
/>
```

**Props** (`RatingScaleProps`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `value` | `Rating` (`1\|2\|3\|4\|5\|null`) | yes | **Must initialize as `null`** — there is no default-value prop, by design (PLAN §3.8). |
| `onChange` | `(value: RatingValue) => void` | yes | Fired on click or via arrow-key navigation. Never called with `null`. |
| `label` | `string` | yes | Accessible name for the `radiogroup`, e.g. `"Rate the Salmon Nigiri"` or `"Rate your overall visit"`. |
| `describedById` | `string` | no | Optional id of an element (e.g. the screen's `<h1>`) to additionally describe the control via `aria-describedby`. |
| `disabled` | `boolean` | no | Default `false`. |
| `className` | `string` | no | Merged onto the outer wrapper. |

**Behavior contract:**

- Renders 5 circular targets (48×48px), each independently tappable —
  tapping position 2 selects `2` directly.
- Unselected circles use `border-interactive-border` (>=3:1 contrast).
  Selected circles 1..N fill with `bg-gradient-brass`; the active circle
  gets `shadow-soft-sm`.
- Below the row, dynamic label text shows `RATING_LABELS[value]` from
  `@/lib/constants` (e.g. "Below expectations") once selected, or
  `RATING_UNSELECTED_PLACEHOLDER` ("Tap to rate") before any tap.
- `role="radiogroup"` / `role="radio"` with roving `tabIndex`, full
  arrow-key (`←→↑↓`, `Home`/`End`) + `Space`/`Enter` support per the
  WAI-ARIA radio pattern. Each radio's `aria-label` is
  `"Rating: <label> (<n> of 5)"` via `ratingAriaLabel()` from `@/lib/format`.

---

## `TagChip`

Toggleable, multi-select pill. No min/max — caller owns the selected set.

```tsx
import { TagChip } from "@/components/ui";
import { DISH_TAGS, TAG_LABELS } from "@/lib/constants";
import type { DishTag } from "@/lib/types";

const [tags, setTags] = useState<DishTag[]>([]);

{DISH_TAGS.map((tag) => (
  <TagChip
    key={tag}
    selected={tags.includes(tag)}
    onToggle={() =>
      setTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      )
    }
  >
    {TAG_LABELS[tag]}
  </TagChip>
))}
```

**Props** (`TagChipProps` extends `ButtonHTMLAttributes` minus `onClick`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `selected` | `boolean` | yes | Visual + `aria-pressed` state. |
| `onToggle` | `() => void` | yes | Called on click — caller decides how the selected set changes. |
| `children` | `ReactNode` | yes | Chip label (use `TAG_LABELS` from `@/lib/constants` for the canonical text). |

**Behavior contract:**

- Unselected: transparent bg, `border-interactive-border` outline, `text-ink`.
- Selected: `bg-surface-sunken` + 1.5px `border-sumi-900` (`--border-ink`)
  + a small filled-circle indicator. **Not brass** — brass stays reserved
  for the primary CTA / rating fill (single-accent rule).
- `aria-pressed={selected}` for assistive tech.

---

## `Card`

```tsx
import { Card } from "@/components/ui";

<Card>...</Card>                {/* raised: surface + shadow-soft-sm */}
<Card tone="sunken">...</Card>  {/* sunken: surface-sunken, no shadow */}
```

**Props** (`CardProps` extends `HTMLAttributes<HTMLDivElement>`):

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `"raised" \| "sunken"` | `"raised"` | `raised` for rating cards / KPI cards. `sunken` for selected-dish summary strips, "needs attention" panels, etc. |

Uses `rounded-lg` (not `rounded-organic` — that radius is reserved for
exactly one hero element per flow, PLAN §7.1).

---

## `Eyebrow`

```tsx
import { Eyebrow } from "@/components/ui";

<Eyebrow>Step 2 of 4</Eyebrow>
<Eyebrow>Needs Attention</Eyebrow>
```

Renders the shared `.ws-eyebrow` style: Jost, uppercase,
`tracking-widest`, `text-primary` (brass). `HTMLAttributes<HTMLSpanElement>`
pass through.

---

## `SectionHeading`

```tsx
import { SectionHeading } from "@/components/ui";

<SectionHeading
  as="h1"
  eyebrow="Step 2 of 4"
  title={<>How was the <em>Salmon Nigiri</em>?</>}
  description="Rate it, tell us a bit more if you like, then move on."
/>
```

**Props** (`SectionHeadingProps` extends `HTMLAttributes<HTMLDivElement>`):

| Prop | Type | Default | Notes |
|---|---|---|---|
| `eyebrow` | `string` | — | Optional small label above the title. |
| `title` | `ReactNode` | required | Rendered in `font-display` at `text-2xl`/`text-3xl`. |
| `description` | `ReactNode` | — | Optional supporting copy, `max-w-measure`. |
| `as` | `ElementType` | `"h2"` | **Use `"h1"` for each screen's single main heading** — required for focus management on route transitions (PLAN-ADDENDUM §F1) and screen-reader navigation (PLAN §10). |

---

## `KintsugiDivider`

```tsx
import { KintsugiDivider } from "@/components/ui";

<KintsugiDivider />
```

Renders the shared `.kintsugi` gold-seam `<hr>`. **Use exactly once per
screen**, at a meaningful transition point (e.g. between the rating control
and the "anything else?" comment field) — per PLAN §7.6 #5, this motif loses
its meaning if repeated as a generic section divider.

---

## `EnsoLoader`

```tsx
import { EnsoLoader } from "@/components/ui";

<EnsoLoader label="Submitting" />
```

**Props** (`EnsoLoaderProps`):

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `"Loading"` | Accessible text via `sr-only`, announced as the `role="status"` region's content. |
| `size` | `number` | `64` | SVG width/height in px. |
| `className` | `string` | — | Merged onto the outer wrapper. |

**STATIC by design** — renders a single open (incomplete) brass ensō
stroke, no animation. "No loading spinners, ever" (PLAN §7.6 #7). If a
feature needs the "stroke completing" entrance animation, build it as a
separate CSS animation wrapped in
`@media (prefers-reduced-motion: no-preference)` with this static mark as
the `reduce` fallback — do not make this component spin by default.
