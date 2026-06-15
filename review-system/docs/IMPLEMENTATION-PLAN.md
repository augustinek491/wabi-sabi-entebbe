# Wabi-Sabi Entebbe — Menu Review System
## Implementation Plan v1.0

**Status:** Draft for red-team review
**Last updated:** 2026-06-15
**Owner:** Product/Engineering
**Stack (locked):** Next.js 14+ (App Router) · Supabase (Postgres + RLS + Auth) · Tailwind (Wabi-Sabi tokens) · Vercel

---

## 0. Executive summary

A QR-at-table feedback system. Diners scan a code on their table, see *only the dishes their table ordered* (or the full menu if no order context exists), rate each dish + the overall visit, optionally leave free text, and are done in under 90 seconds — no login, no app, no account.

The admin (restaurant owner/manager) logs in to a dashboard showing per-dish ratings, trends over time, flagged outliers, and exportable data — enough to know which dishes are working, which need attention, and whether feedback is trustworthy.

The entire system is built around one non-negotiable: **feedback must be honest**. Every UX and architecture decision in Section 3 traces back to that goal. Where "honest" and "frictionless" trade off, this plan documents the trade-off explicitly rather than silently picking one.

---

## 1. Goals & success metrics

### 1.1 Primary goals

| # | Goal | Why it matters |
|---|---|---|
| G1 | Diners complete a review in **< 90 seconds**, **zero accounts** | Anything more, and the "ask" competes with the meal/conversation — completion rate collapses |
| G2 | Admin can see **per-dish signal** (not just overall NPS-style mush) | "The miso soup is consistently 3.2/5 vs. menu average 4.4" is actionable; "we got 4.1 stars" is not |
| G3 | Feedback is **statistically defensible as unbiased** | The whole point of the tool is to be more honest than Google Reviews / TripAdvisor, which suffer from extreme-experience bias |
| G4 | The experience **feels like a $100k product** | Brand equity — a cheap-feeling feedback widget actively damages the premium positioning Wabi-Sabi is building |
| G5 | System is **operable by a small team** with no dedicated data person | Admin dashboard must answer "what should we fix this week?" without SQL |

### 1.2 Success metrics (what we'll actually look at)

**Diner-side (engagement & friction)**
- **Scan-to-submit completion rate** ≥ 60% (industry baseline for QR feedback is 15–30%; we aim higher because of low friction, but track honestly)
- **Median time-to-submit** < 90s, p90 < 180s
- **Drop-off point distribution** — which screen loses people (if "dish selection" loses people, the UX is wrong; if "thanks" loses people, that's fine)
- **Per-session dish count** — are people rating 1 dish or all 4 they ordered? (both are valid; this just tells us the *texture* of the data)

**Admin-side (utility)**
- **Time-to-insight**: can an admin, in < 60 seconds on the dashboard, name (a) the best dish this week, (b) the worst dish this week, (c) whether overall sentiment is trending up/down?
- **Export usage** — if nobody ever exports, the export feature is dead weight (fine, but track it)
- **Flagged-item action rate** — of items flagged as "needs attention," what % get a follow-up action (menu change, recipe review) within 30 days? (tracked manually/qualitatively, not in-app)

**Integrity / honesty (the metric that matters most)**

This is the hardest to measure directly — there's no ground truth for "true sentiment." So we triangulate with **proxy signals** that, together, indicate the data is *not* dominated by bias or manipulation:

| Proxy signal | What it tells us | How we compute it |
|---|---|---|
| **Rating distribution shape** | Honest feedback on a good restaurant should be roughly unimodal, skewed positive, with a real (not zero) left tail. A bimodal "5★ or 1★ only" distribution, or a distribution with *zero* ratings below 4, signals either gaming or fear-of-honesty | Histogram per dish + overall, computed in admin dashboard |
| **Free-text sentiment vs. numeric rating correlation** | If 4★ ratings consistently come with negative free text (or vice versa), something's off — either the scale is confusing, or numeric ratings are being inflated relative to true sentiment | Lightweight sentiment classification (Section 3.6) compared against the numeric score, surfaced as a "divergence" flag |
| **Submission-time clustering** | A burst of 20 reviews in 3 minutes from the same table_session pattern, or all-5★ reviews submitted in < 10 seconds (too fast to have actually read the questions) signals spam/coercion, not organic feedback | `created_at` deltas + `time_spent_seconds` per review |
| **Variance across dishes within a session** | A diner who rates every single dish exactly 5/5 with no free text is statistically less informative than one who rates dishes 3, 4, 5, 2 — not necessarily *dishonest*, but flagged for review if it's the dominant pattern | Per-session rating variance, surfaced in admin as an "engagement quality" metric, never used to discard data |
| **Comparison to public review platforms** (qualitative, periodic) | If in-house average for a dish is 4.6 but Google/TripAdvisor mentions of that dish trend negative, that's worth a manual look | Manual quarterly check, not automated (no scraping pipeline in MVP) |

**Important framing:** none of these proxies are used to *suppress* or *discard* data. They are used to give the **admin context** when interpreting the numbers (e.g., "this week's 4.8 average came from only 6 reviews submitted within 90 seconds of each other — interpret with caution"). Automating "is this review fake, delete it" is itself a bias vector (an owner could tune the filter to discard criticism) — so the system surfaces signals, a human interprets.

---

## 2. Personas & core user journeys

### 2.1 Personas

**Primary: "Amara," the diner**
- On her phone, at the table, after the meal (or between courses)
- Has 1–4 minutes of idle time, mild curiosity, no strong motivation either way
- Will abandon at the first sign of friction (login, long forms, unclear purpose)
- Wants to feel her opinion *might* matter, without performing for anyone

**Primary: "David," the owner/manager**
- Checks the dashboard a few times a week, more after a busy weekend
- Not a data analyst — needs the system to do the synthesis
- Cares about: what's broken (low-rated dishes), what's working (high-rated dishes to feature), and whether anything needs urgent attention (a string of bad overall-visit scores in one night)
- Slightly anxious about "fake bad reviews from competitors" — the system must be resilient to this *and* must not give David a lever to suppress real criticism (those are in tension; Section 3 addresses both)

**Secondary: "Server staff"** (not a direct user in MVP, but referenced)
- May be the one placing the QR code on the table / clearing it
- Not given any access to review data (avoids servers pressuring diners for good reviews — a real bias vector)

### 2.2 Diner journey — "scan → select dishes → rate → comment → thanks"

```
┌──────────────┐
│  QR code on   │   Diner scans with phone camera
│  table tent / │──────────────────────────────┐
│  table number │                                │
└──────────────┘                                ▼
                                    ┌─────────────────────────┐
                                    │  LANDING                  │
                                    │  "How was your meal?"     │
                                    │  Brand mark, table #,      │
                                    │  ~90 sec promise,          │
                                    │  [Start] button            │
                                    └─────────────┬─────────────┘
                                                  │
                  ┌───────────────────────────────┼────────────────────────┐
                  │ already reviewed (session cookie)                       │ first visit
                  ▼                                                          ▼
    ┌──────────────────────────┐                              ┌─────────────────────────────┐
    │  ALREADY-REVIEWED          │                              │  DISH SELECTION                │
    │  "You've already shared    │                              │  Browse/search the 16          │
    │  your thoughts tonight —   │                              │  categories (or full menu      │
    │  thank you 🙏"             │                              │  if no table-context order),   │
    │  [Leave general feedback]  │                              │  multi-select chips for         │
    │  (optional secondary path) │                              │  dishes ordered.                │
    └──────────────────────────┘                              │  [Continue] (disabled until     │
                                                                │   ≥1 dish selected, or skip      │
                                                                │   to overall-only)               │
                                                                └───────────────┬─────────────────┘
                                                                                │
                                                                                ▼
                                                                ┌─────────────────────────────┐
                                                                │  PER-DISH RATING (1 of N)      │
                                                                │  Dish name + category          │
                                                                │  - Overall star/scale (1-5)     │
                                                                │  - Tag chips: taste/portion/    │
                                                                │    value/presentation           │
                                                                │    (multi-select, optional)     │
                                                                │  - Optional short comment        │
                                                                │  NO aggregate/average shown      │
                                                                │  [Next dish →] / [Back]          │
                                                                │  Progress dots (1/3, 2/3...)     │
                                                                └───────────────┬─────────────────┘
                                                                                │ repeat per dish
                                                                                ▼
                                                                ┌─────────────────────────────┐
                                                                │  OVERALL VISIT RATING          │
                                                                │  - Overall star/scale (1-5)     │
                                                                │  - Tag chips: service/ambiance/ │
                                                                │    speed/value/cleanliness       │
                                                                │  - Optional free-text comment    │
                                                                │    ("Anything else?")            │
                                                                │  [Submit]                        │
                                                                └───────────────┬─────────────────┘
                                                                                │
                                                                                ▼
                                                                ┌─────────────────────────────┐
                                                                │  SUBMIT (loading state)         │
                                                                │  Brief — single API call,        │
                                                                │  ensō animation (1-2s feel)      │
                                                                └───────────────┬─────────────────┘
                                                                                │
                                                              ┌─────────────────┴──────────────────┐
                                                              │ success                              │ error (network)
                                                              ▼                                      ▼
                                                ┌─────────────────────────┐          ┌─────────────────────────┐
                                                │  THANK YOU                │          │  ERROR — retry           │
                                                │  Calm, brand-true close.   │          │  "Something didn't catch │
                                                │  Sets session cookie so    │          │   — try again"            │
                                                │  re-scan = already-reviewed│          │  [Retry] (data held in    │
                                                │  No upsell, no ads, no     │          │   local state, not lost)  │
                                                │  "follow us on Instagram"  │          └─────────────────────────┘
                                                │  (deliberate — see §3)     │
                                                └─────────────────────────┘
```

**Key UX decisions embedded in this flow:**
- **Skip path exists**: a diner can go straight from landing → overall-visit-only → submit, never rating individual dishes. This keeps the floor of friction near zero (G1) while still capturing *some* signal.
- **No aggregate/average is ever shown to the diner**, before or after submission — anti-anchoring (Section 3.2).
- **"Already reviewed" is a soft wall**, not a hard block — see Section 3.4 for the session model and why it's a deterrent, not a guarantee.
- **Thank-you page has no social-follow CTA.** This is deliberate: bundling "rate us" with "follow us" trains diners that the review is a marketing transaction, which both lowers honesty and is a borderline dark pattern. The thank-you message is warm and final.

### 2.3 Admin journey — "auth → dashboard → per-dish analytics → trends → flagged/low items → export"

```
┌──────────────────┐
│  /admin/login      │   Email + password (Supabase Auth)
│  Wabi-Sabi mark,    │   + optional magic link
│  minimal form       │
└─────────┬──────────┘
          │ authenticated
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  /admin/dashboard  (OVERVIEW)                                       │
│                                                                       │
│  Header: date-range picker (Today / 7d / 30d / 90d / Custom)        │
│                                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │ Overall      │ │ Total        │ │ Response      │ │ Sentiment    │  │
│  │ visit avg     │ │ reviews       │ │ rate           │ │ trend ↑↓→    │  │
│  │ ★ 4.3 (Δ+0.1) │ │ 142            │ │ ~38% of tables │ │ vs prior      │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
│                                                                       │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐ │
│  │  TOP-RATED DISHES (this week)  │  │  NEEDS ATTENTION                │ │
│  │  1. Salmon Nigiri  ★4.8 (12)    │  │  ⚠ Spicy Fried Hamour ★3.1 (8)  │ │
│  │  2. Wagyu Steak    ★4.7 (9)     │  │  ⚠ Miso Soup        ★3.0 (11)   │ │
│  │  3. Matcha Tiramisu ★4.7 (7)    │  │  ⚠ Thai Green Curry ★3.2 (6)    │ │
│  │  [View all →]                   │  │  [View all →]                    │ │
│  └─────────────────────────────┘  └─────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  TREND CHART — overall visit rating, last 30 days (line)        │  │
│  │  + review volume (bar, secondary axis)                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  RECENT COMMENTS (free text, anonymized, most recent 10)         │  │
│  │  with sentiment chip (positive/neutral/negative) + dish tag       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────┬────────────────────────────────┬───────────────────────────┘
        │                                  │
        ▼                                  ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│ /admin/dishes          │      │ /admin/dishes/[id]              │
│ (PER-DISH TABLE)       │      │ (DISH DETAIL)                    │
│ Sortable table:        │      │ - Rating distribution histogram  │
│ name | category | avg  │─────▶│ - Tag-chip frequency (taste/     │
│ | count | trend arrow  │      │   portion/value/presentation)    │
│ Filter by category      │      │ - Free-text comments for this    │
│ Search box               │      │   dish (paginated)               │
│                          │      │ - Trend over time (line)          │
│                          │      │ - Divergence flag (if sentiment   │
│                          │      │   vs. rating mismatch detected)   │
└─────────────────────┘      └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ /admin/export                                                       │
│ - Date range, category filter                                       │
│ - CSV export: reviews (anonymized), per-dish summary                │
│ - "Download" triggers signed export via edge function               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ /admin/integrity   (the "is this data trustworthy" view)            │
│ - Submission-time histogram (are reviews bursty?)                    │
│ - "Too fast" flag count (< Xs total time)                            │
│ - Distribution shape per dish (unimodal vs. bimodal warning)          │
│ - This page exists to build admin trust in the numbers above — NOT  │
│   to let admin delete/hide individual reviews (no delete UI for      │
│   reviews in MVP — see §3.5 on owner-gaming prevention)               │
└─────────────────────────────────────────────────────────────────┘
```

**States covered for every admin screen:** loading (skeleton, brand-toned shimmer), empty ("No reviews yet — once diners start scanning, you'll see results here"), error (calm retry message, never a raw stack trace), and populated.

---

## 3. Bias & integrity design (CRITICAL)

This section is the product's reason to exist. Every mechanism below is justified, and every trade-off is named explicitly. Where a mechanism *could* be strengthened at the cost of friction, the friction-preserving choice is taken and the residual risk is documented.

### 3.1 Anonymity model

**Mechanism:**
- No diner accounts, no login, no email/phone collection, ever.
- Each review submission is tied to an ephemeral **`review_session`** (UUID, generated client-side or server-side on first interaction), stored in a first-party cookie (or `localStorage` fallback) scoped to the browser.
- The `review_session` UUID is stored alongside reviews in the database **only to enforce one-review-per-dish-per-session** (Section 3.4) and to detect submission-time clustering (Section 1.2). It is never linked to any PII.
- Table number is captured from the QR code's URL parameter (`?t=12`) and stored as a plain integer/short code on the review — it identifies *where*, not *who*.
- IP address: **not stored**. Supabase/Vercel infra logs may retain IPs transiently per their own retention policies (outside our control), but our application schema has no IP column. This is a deliberate trade-off — see 3.7 for the rate-limiting implication.

**Trade-off:** Because there's no account and no IP storage, a sufficiently motivated person *can* submit multiple times by clearing cookies / using incognito / different devices. We accept this — see 3.4 for why we don't escalate to device fingerprinting.

### 3.2 Anti-anchoring: hide aggregates until after submission

**Mechanism:**
- The diner-facing app **never queries or renders** any aggregate statistic (average rating, review count, "X% loved this") at any point before the Thank You screen.
- This isn't just a UI toggle — it's architectural: the public (anon) Supabase client used by the diner app has **no RLS-granted read access** to any aggregate view or the `reviews` table itself (Section 5.3). The diner-facing API surface literally cannot return "what did others say," because the query would be rejected by RLS. A future feature can't accidentally leak this by a careless `SELECT *` in a client component — the database refuses it.
- Within a single session, ratings for *other dishes* are also not shown back to the diner while rating the current dish — each per-dish rating screen is independent, preventing the diner from "balancing" their scores against their own prior answers (a self-anchoring effect).
- **After submission**, the Thank You screen shows no stats either (Section 2.2) — reinforcing that this isn't a popularity contest.

**Trade-off:** Some diners *want* to see "you're the 50th person to try this dish" as a small reward/social-proof loop. We deliberately forgo this gamification because it directly conflicts with anti-anchoring. Documented for the open-questions list (Section 12) in case the business decides the trade-off is worth revisiting *for a non-rating context* (e.g., a "popular dishes" public page, fed from a separate, admin-curated dataset — never live aggregates).

### 3.3 Neutral question framing

**Mechanism — copy principles enforced in the UI spec (Section 7) and content layer:**
- Scale labels are **symmetric and behavioral**, not valence-loaded. E.g., for the 1–5 scale: *"Didn't work for me / Below expectations / As expected / Better than expected / Exceptional"* rather than *"Terrible / Bad / OK / Good / Amazing"* — the latter set anchors "OK" as a failure state (a well-documented Likert-scale bias), while the former treats the midpoint as genuinely neutral.
- Tag chips are **bidirectional in framing where meaningful** — e.g., instead of only positive chips like "Great value," chips are neutral nouns the diner *toggles* (taste, portion, value, presentation) and the *rating* (not the chip itself) carries the valence. This avoids a "select all the nice things" checklist effect.
- Prompts use **invitational, not evaluative, language**: *"How was the [dish name]?"* not *"Rate your satisfaction with [dish name]"* — "satisfaction" primes a customer-service-survey frame that correlates with social-desirability bias (people rate service interactions higher when they feel they're being asked to "grade" a person).
- The optional comment field uses a placeholder like *"Anything you noticed — good or otherwise"* — explicitly licensing critical feedback, which research on feedback surveys shows measurably increases the rate of constructive criticism vs. a bare "Comments" label.
- No comment field is ever marked required. Forcing text input on a 5★ rating ("tell us why you loved it!") creates asymmetric friction that suppresses negative free-text relative to positive (people will happily type "amazing!" but feel awkward typing "the soup was bland" under social pressure of a public-feeling form) — so the field is optional regardless of the numeric score, applied uniformly.

### 3.4 Anti-spam / rate-limiting / one-review-per-dish-per-session

**Mechanism (layered):**

1. **Client-side session gate (UX layer, not security):** On landing, check for a `ws_review_session` cookie with a `submitted_at` timestamp from the current service window (see below for "service window" definition). If present, show the "Already reviewed" screen. This is the primary mechanism for the *overwhelming majority* of cases — a real diner has no reason to evade it.

2. **Server-side enforcement (the actual integrity backstop):** The `reviews` table has a `(review_session_id, dish_id)` unique constraint for per-dish reviews, and `review_sessions` has one row per session with a `submitted_at` that, once set, is checked by the insert RLS policy (Section 5.3) — a session that has already submitted cannot insert again for the same visit window. This is enforced at the database level, not just in the Next.js API route, so it can't be bypassed by hitting the Supabase REST endpoint directly.

3. **"Service window" definition:** A `review_session` is valid for **one calendar visit**, operationally defined as a **12-hour rolling window** from first interaction. This allows a diner who, say, has lunch and dinner on the same day to leave two separate reviews (legitimately different experiences) while preventing a single visit from generating dozens of submissions via page-refresh.

4. **Per-table rate limiting (light touch):** A simple counter (via a Postgres function + a `table_review_counts` rollup, or Supabase's built-in rate limiting on the anon insert endpoint) caps inserts to, e.g., **20 reviews per table per hour** — generous enough that a table of 12 people each submitting 1–2 reviews never hits it, but enough to blunt an automated script hammering one table's QR URL.

5. **Honeypot + timing check:** The submission form includes a hidden field that should remain empty (bots that auto-fill all fields trip it) and a `time_spent_seconds` measurement (client-side timestamp from first paint to submit). Reviews submitted in **under ~5 seconds total** are still **stored** (never silently dropped — that would itself be a bias vector if a real human is just fast) but **flagged** (`is_low_effort = true`) for the admin integrity view (Section 2.3), and **excluded from headline averages by default** (with a toggle to include them) — analogous to how survey research handles "speeders."

**Explicitly NOT done, and why:**
- **No device fingerprinting / no CAPTCHA.** Both add friction (G1) and CAPTCHA in particular is a well-known abandonment cliff for QR-code flows. The threat model here is "a competitor or disgruntled person submits a handful of fake reviews," not "a botnet attacks the endpoint" — the layered approach above is proportionate. If table-level abuse becomes a real observed problem post-launch, Cloudflare Turnstile (invisible, low-friction) is the documented escalation path (Section 12).
- **No phone/email verification.** Defeats the entire anonymity model (3.1) and the locked diner-flow decision.

### 3.5 Preventing owner/admin gaming

This is the mechanism most products skip, and the one most central to "honest" as a *product feature* rather than a slogan — if the data can be quietly curated by the person it's about, it's not honest, it's a marketing asset wearing a feedback costume.

**Mechanisms:**

1. **No delete/hide UI for individual reviews in the admin dashboard (MVP).** The admin can see aggregates, distributions, and free text, but there is no button that removes a single review from any calculation. This is the single most important integrity guarantee in the product, and it's a *product* decision as much as a technical one.

2. **If a review-removal capability is ever required** (e.g., genuinely abusive/illegal content in free text — slurs, threats, doxxing), it is handled via:
   - A `moderation_status` column (`visible` / `hidden_for_abuse`) settable only via a Supabase Edge Function that requires the admin to select from a **fixed enum of justification reasons** (`hate_speech`, `personal_data_exposure`, `threat`, `spam_unrelated_content`) — "I don't like this rating" is not an option.
   - Every moderation action is **immutably logged** to a `moderation_log` table (who, when, reason, and a snapshot of the original content) that is itself never deletable (no DELETE grants on that table for any role, including service_role in normal operation — only via a manual migration if ever truly needed).
   - Hidden reviews are excluded from **diner-facing** surfaces (none exist, so moot in MVP) but remain **visible to the admin dashboard with a "hidden" badge and the logged reason** — so a future audit (or a second admin user, or the business owner if "admin" is a manager) can see that hiding happened and why. Nothing simply vanishes.
   - This entire capability is flagged as **post-MVP** (Section 11) — MVP ships with `moderation_status` as a column that always reads `visible`, with the enum and Edge Function stubbed but the UI control absent, specifically so the *first* shipped version cannot hide anything even by accident. This is a deliberate sequencing choice: ship the system where curation is *impossible*, then add a heavily-logged, reason-coded exception only if real abuse (not "real criticism") demands it.

3. **No "request a review" trigger tied to perceived experience.** The QR code is static and placed at every table uniformly (Section 6.4) — there is no server-side logic, no staff-facing button, and no POS integration that decides "this table seemed happy, let's prompt them." Any such targeting (even well-intentioned, "ask happy tables for Google reviews") is explicitly **out of scope** and flagged as an anti-pattern in Section 12, because it's the single most common way restaurant review systems become biased — not through fake reviews, but through *selective solicitation*.

4. **Aggregates are computed server-side from raw rows on every load (or via a materialized view refreshed on a schedule), never cached/edited client-side.** There's no "admin sets the displayed average" field anywhere in the schema.

5. **Export includes raw, unfiltered data** (Section 2.3, `/admin/export`) — if the business wants to do its own deeper analysis (e.g., in a spreadsheet, with a consultant), it's working from the same rows the dashboard shows, not a curated subset.

### 3.6 Optional sentiment analysis of free text

**Purpose:** give the admin a fast read on large volumes of comments, and power the "divergence flag" (numeric rating vs. text sentiment mismatch) from Section 1.2 — **not** to filter, score, or gate anything diner-facing.

**Mechanism:**
- A Supabase Edge Function (`analyze-sentiment`), triggered asynchronously (via a Postgres trigger → `pg_net` webhook, or a lightweight queue table polled by a scheduled function) on `INSERT` to `reviews` where `comment IS NOT NULL`.
- Classification: **3-class** (positive / neutral / negative) using a small, cheap approach — this is explicitly **not** a place to over-engineer:
  - **MVP option A (no external API):** a simple lexicon/keyword-based classifier (well-documented approach, e.g., VADER-style scoring) run inside the Edge Function in TypeScript/Deno. Zero ongoing cost, zero external dependency, "good enough" for a 3-bucket classification used as a *hint*, not a hard signal.
  - **Enhancement option B:** call an LLM (e.g., Claude Haiku via the Anthropic API) for classification + a 1-sentence summary, if the business wants higher-quality categorization (e.g., auto-tagging "mentions: spice level, mentions: wait time"). This is an **enhancement**, not MVP, due to added cost/dependency — flagged in Section 11.
- Result stored in `reviews.sentiment` (enum: `positive`/`neutral`/`negative`/`unanalyzed`) and `reviews.sentiment_confidence` (float, nullable).
- **Divergence flag:** if `rating <= 2` AND `sentiment = 'positive'`, or `rating >= 4` AND `sentiment = 'negative'`, set `reviews.flagged_divergence = true`. Surfaced in `/admin/integrity` and on the dish detail page as a small badge — purely informational ("this might be sarcasm, a scale-misunderstanding, or worth a closer read").

**What this is explicitly NOT used for:** sentiment is never used to weight, exclude, or re-score numeric ratings. A 1★ rating with "neutral" sentiment text still counts as a full 1★ in every aggregate.

### 3.7 Handling brigading (coordinated negative — or positive — review bombing)

**Threat model:** a competitor, a disgruntled ex-employee, or an organized group submits many fast, low-effort, extreme reviews in a short window, from one or a few tables/devices.

**Mechanisms (detection, not deletion):**
- **Burst detection view** (`/admin/integrity`): a rolling computation flags any 30-minute window where review volume exceeds, e.g., **3x the trailing 7-day average for that hour-of-day**, AND the average rating in that window deviates by more than **1.5 points** from the trailing 7-day average. This surfaces as a banner: *"Unusual activity detected: 14 reviews between 9:47–10:02 PM, avg 1.2★ vs. typical 4.1★ for this time. Reviewed individually below."* — with a link to those specific (still-visible) reviews.
- **Per-table-per-hour rate limit** (Section 3.4 #4) is the primary technical brake — it makes brigading from a single table mechanically slow, without blocking legitimate large-party tables.
- **Low-effort flag** (Section 3.4 #5) — brigaded reviews are very often `is_low_effort = true` (submitted in seconds, no per-dish detail), so they're already segregated from headline numbers by default, while remaining visible and counted in the "raw" view.
- **The system does not auto-respond** (no auto-hiding, no auto-emailing the admin "your rating dropped, here's how to fix it" — that would be an incentive to game the *detection*, not the underlying experience). The burst banner is informational; what the admin does with that information (e.g., reviewing security footage for who placed QR scans, in extreme cases) is outside the system's scope.

**Trade-off:** a sufficiently patient brigade (low volume, spread over days, "reasonable-looking" low ratings) is **not detectable** by this system, and *that's by design* — the alternative (aggressive anomaly-based filtering) would also catch "this week genuinely was bad, the kitchen was short-staffed and 8 real diners noticed," which is exactly the signal the product exists to surface. We accept the residual risk of slow/subtle brigading rather than risk false-positive suppression of real negative trends.

### 3.8 No positivity-skewing incentives

**Mechanism — things this system will never do (a "won't build" list, stated explicitly because the temptation is real):**
- No discount, free item, loyalty points, or prize draw for completing a review. Any incentive tied to *completing* a review (regardless of content) is fine in principle but is **out of scope for MVP** specifically because even content-neutral incentives shift the *population* of who reviews (people motivated by the discount may rush, skewing toward low-effort/extreme responses) — flagged as an open question for the business (Section 12), not ruled out forever, but not in v1.
- No "would you recommend us to a friend" framed as a precursor to a public review platform redirect (the "review-gating" pattern, where only happy customers get funneled to leave a public Google review — this is against Google's own policies and is the single most common integrity violation in this space). This system is **entirely separate** from, and makes no reference to, any public review platform.
- No visible leaderboard, badge, or "top reviewer" status for diners (impossible anyway given anonymity, but stated for completeness — anonymity is partly *in service of* this principle).
- No star-rating defaults pre-set to anything other than **unselected/neutral**. A pre-filled 4★ or 5★ that the diner has to actively change downward is a textbook anchoring manipulation; every rating control starts empty/unselected and requires an explicit choice.

---

## 4. Information architecture & screens

### 4.1 Full screen inventory

| Route | Surface | Purpose | Auth |
|---|---|---|---|
| `/r/[tableCode]` | Diner | Landing — entry point from QR | None |
| `/r/[tableCode]/select` | Diner | Dish selection | None |
| `/r/[tableCode]/rate/[dishIndex]` | Diner | Per-dish rating (one screen per selected dish, client-routed) | None |
| `/r/[tableCode]/overall` | Diner | Overall visit rating | None |
| `/r/[tableCode]/thanks` | Diner | Thank-you / done | None |
| `/r/[tableCode]/already-reviewed` | Diner | Soft wall for repeat scans within service window | None |
| `/admin/login` | Admin | Auth | Public (form) |
| `/admin/dashboard` | Admin | Overview (KPIs, top/bottom dishes, trend, recent comments) | Required |
| `/admin/dishes` | Admin | Sortable/filterable per-dish table | Required |
| `/admin/dishes/[id]` | Admin | Dish detail (distribution, tags, comments, trend, divergence) | Required |
| `/admin/integrity` | Admin | Data-quality / burst-detection / low-effort view | Required |
| `/admin/export` | Admin | CSV export tool | Required |
| `/admin/settings` | Admin | Service-window config, category visibility, sentiment toggle (enhancement) | Required |

### 4.2 Per-screen states

Every diner-facing screen implements: **loading**, **empty** (where applicable), **error**, **success/populated**. Below, the non-obvious ones:

**`/r/[tableCode]` (Landing)**
- *Loading:* brand mark + ensō micro-animation while table/menu context resolves (target < 500ms; if it takes longer, the animation itself is the loading state — no spinner icon).
- *Error (invalid table code):* calm message — *"This code isn't recognized. Ask a member of staff for a fresh one."* No technical detail. Logged server-side for ops to notice misprinted QR codes.
- *Already reviewed:* redirects to `/r/[tableCode]/already-reviewed` (see 4.1).
- *Success:* normal landing with `[Begin →]`.

**`/r/[tableCode]/select` (Dish selection)**
- *Empty (no order context — table has no pre-loaded order):* shows the **full active menu**, organized by the 16 categories as collapsible sections (accordion), search box at top. This is the fallback path and must be just as polished as the "pre-loaded order" path (Section 6.3 discusses how order-context is optional infrastructure, not a hard dependency).
- *Pre-loaded order context (enhancement, not MVP — see 11):* if a `table_orders` linkage exists (e.g., from a future POS integration), the selection screen pre-checks those items, with an explicit "these are what we think you ordered — adjust if needed" note and full ability to add/remove.
- *Zero dishes selected, diner taps Continue:* not blocked — instead, a gentle inline prompt: *"No dishes selected — that's OK, you can still share your thoughts on the visit overall →"* which routes directly to `/overall`. This protects G1 (zero-friction floor).
- *Search with no matches:* *"No dishes match '_____'. Try a different search, or browse by category below."* — search never fully replaces the category browse.

**`/r/[tableCode]/rate/[dishIndex]`**
- *Loading:* none needed (data is already client-side from `/select`).
- *Success:* the rating form itself. Validation: the 1–5 scale has no default selection (3.8); tag chips and comment are optional; `[Next dish →]` is **always enabled** (a diner can skip rating a dish numerically — though if they do, that dish is recorded with `rating = null` and just the chips/comment if provided, or omitted entirely if nothing was filled in — see Section 5.2 nullability).
- *Last dish:* button label changes to `[Continue →]` and routes to `/overall` instead of the next dish.

**`/r/[tableCode]/overall`**
- *Success:* same pattern as per-dish but with visit-level tag chips (service, ambiance, speed, value, cleanliness) and the free-text "anything else?" field.
- *Submitting:* `[Submit]` → loading state (disabled, ensō spinner replaces label) → success routes to `/thanks`; network error shows inline retry (Section 2.2).

**`/r/[tableCode]/thanks`**
- *Success only* — sets the session cookie (`submitted_at` = now) as its first action so a refresh of this page doesn't re-trigger submission logic, and a re-scan of the QR within the service window redirects to `/already-reviewed`.

**`/r/[tableCode]/already-reviewed`**
- *Always this one state* — warm, brief, brand-true. Optionally (and clearly secondary, visually de-emphasized) a link: *"Something else on your mind? Leave a note"* → a minimal single free-text field, tagged `review_type = 'supplemental'`, not counted toward per-dish/overall numeric aggregates, shown separately in admin under "additional notes."

### 4.3 Admin screen states

- *Loading:* skeleton cards/tables in washi tones (no generic grey skeletons — Section 7).
- *Empty (`/admin/dashboard` with zero reviews ever):* *"No reviews yet. Once diners start scanning the table codes, results will appear here — usually within the first service."* with a small illustration using the ensō/seigaiha motif, not a stock "empty box" icon.
- *Empty (date range with zero reviews, but data exists elsewhere):* *"No reviews in this range. [View all-time →]"*
- *Error (Supabase/network):* *"We couldn't load this right now. [Retry]"* — never expose raw error objects; log them server-side (e.g., to Vercel logs) for debugging.
- *`/admin/dishes/[id]` for a dish with reviews but no free-text comments:* comments section shows *"No written comments yet for this dish — ratings and tags are shown above."*

### 4.4 Responsive / mobile-first behavior (diner side)

- **Diner flow is designed mobile-first, full stop** — no desktop layout is designed for `/r/*` routes beyond "doesn't break" (a centered single-column max-width ~480px on larger viewports, same as mobile, since nobody reviews a meal from a desktop).
- **Single-column, single-decision-per-screen** — the per-dish rating screen shows exactly one dish; no scrolling required to see the rating control, chips, and comment field on a standard phone viewport (iPhone SE width, 375px, is the floor design target).
- **Touch targets** ≥ 44×44px (Section 10), generous spacing between the 1–5 scale options so mis-taps are rare.
- **Sticky bottom action bar** for `[Next →]` / `[Submit]` — always reachable without scrolling, using `position: sticky` with a soft top-shadow separating it from content (avoids the classic "submit button below the fold" failure).
- **Keyboard handling:** when the comment `<textarea>` is focused, the layout doesn't jump/zoom (viewport meta + `font-size: 16px` minimum on inputs to prevent iOS auto-zoom).
- **Category accordion on `/select`** collapses by default with only category names + item counts visible, expanding on tap — keeps the initial scroll height manageable across 16 categories / 183 items.
- **Admin dashboard is responsive but desktop-primary** — charts and tables reflow to stacked cards on mobile/tablet (an owner checking from their phone should still get the KPI cards and top/bottom lists; dense tables scroll horizontally with sticky first column).

---

## 5. Data model

### 5.1 Entity overview

```
menu_categories ──┐
                    │ 1:N
                    ▼
              menu_items ──┐
                    │        │ 1:N
                    │ 1:N    ▼
                    │   review_dish_ratings
                    │        ▲
                    │        │ N:1
              review_sessions ◄── reviews (overall, 1:1 with session)
                    │
                    │ 1:N (rare; abuse-only)
                    ▼
              moderation_log

restaurant_tables (seed: table codes for QR generation)

admin_users — handled by Supabase Auth (auth.users), no custom table needed
              for MVP beyond a thin `admin_profiles` for role/display info.
```

### 5.2 SQL DDL sketch

```sql
-- =========================================================================
-- WABI-SABI ENTEBBE — REVIEW SYSTEM SCHEMA
-- =========================================================================

-- ---------------------------------------------------------------------
-- MENU (seeded from sample-menu/menu.json — 16 categories / 183 items)
-- ---------------------------------------------------------------------

create table menu_categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                 -- e.g. "Mains", "Sushi — Vegetarian (8pcs)"
  slug         text not null unique,          -- e.g. "mains", "sushi-vegetarian-8pcs"
  display_order int not null,                 -- preserves menu.json category order
  is_active    boolean not null default true, -- soft-disable a category without deleting history
  created_at   timestamptz not null default now()
);

create table menu_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references menu_categories(id) on delete restrict,
  name          text not null,
  description   text,                         -- nullable, matches menu.json (50/183 have one)
  -- Price is stored as text to preserve menu.json's variant strings
  -- (e.g. "40,000 / 45,000 / 45,000" for Veg/Chicken/Pork) without lossy parsing.
  -- A normalized `price_from` numeric is derived for sorting/display only.
  price_display text not null,                -- raw string as printed, e.g. "75,000" or "40,000 / 45,000 / 45,000"
  price_from    numeric(10,2),                 -- lowest numeric value parsed from price_display, for sorting
  currency      text not null default 'UGX',
  notes         text,                         -- transcription notes from menu.json, admin-only context
  display_order int not null,                 -- preserves item order within category
  is_active     boolean not null default true,-- soft-disable (e.g. seasonal item) without deleting review history
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_menu_items_category on menu_items(category_id) where is_active;
create index idx_menu_items_active on menu_items(is_active);

-- ---------------------------------------------------------------------
-- TABLES (for QR generation + table-level rate limiting)
-- ---------------------------------------------------------------------

create table restaurant_tables (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,          -- short human/QR code, e.g. "T12", "BAR-3"
  label        text not null,                 -- display label for staff, e.g. "Table 12 (Patio)"
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- REVIEW SESSIONS (one per diner "visit"; anonymity boundary)
-- ---------------------------------------------------------------------

create table review_sessions (
  id               uuid primary key default gen_random_uuid(), -- == client-side cookie value
  table_id         uuid references restaurant_tables(id) on delete set null,
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,                 -- null until the overall review is submitted
  time_spent_seconds int,                       -- client-measured, first paint -> submit
  is_low_effort    boolean not null default false, -- derived: time_spent_seconds < threshold
  user_agent_hash  text,                        -- SHA-256 of UA string ONLY (no IP) — coarse bot signal, not identity
  created_at       timestamptz not null default now()
);

-- Enforce "one submission per session" at the DB level
create unique index idx_review_sessions_one_submission
  on review_sessions(id)
  where submitted_at is not null;
  -- (functionally this is redundant with PK uniqueness; the real enforcement
  --  is the RLS policy below checking submitted_at IS NULL before allowing
  --  the UPDATE that sets it, combined with the reviews FK constraint.)

create index idx_review_sessions_table_time on review_sessions(table_id, started_at);

-- ---------------------------------------------------------------------
-- OVERALL VISIT REVIEW (one row per session, created at final submit)
-- ---------------------------------------------------------------------

create table reviews (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null unique references review_sessions(id) on delete cascade,
  table_id           uuid references restaurant_tables(id) on delete set null,

  overall_rating     smallint check (overall_rating between 1 and 5), -- nullable: diner could skip even this
  -- visit-level tag chips, fixed enum set, stored as text[] for simplicity + easy GIN index
  visit_tags         text[] not null default '{}',
    -- allowed values enforced by CHECK below: service, ambiance, speed, value, cleanliness
  comment            text,                       -- optional free text "anything else?"

  review_type        text not null default 'standard'
    check (review_type in ('standard', 'supplemental')),
    -- 'supplemental' = the optional secondary "leave a note" path from already-reviewed (4.2)

  -- integrity / sentiment metadata
  sentiment            text not null default 'unanalyzed'
    check (sentiment in ('positive','neutral','negative','unanalyzed')),
  sentiment_confidence numeric(4,3),
  flagged_divergence   boolean not null default false,

  -- moderation (MVP: always 'visible'; enum + columns exist, UI to change them does not ship in MVP)
  moderation_status  text not null default 'visible'
    check (moderation_status in ('visible','hidden_for_abuse')),

  created_at         timestamptz not null default now()
);

alter table reviews add constraint chk_visit_tags_valid
  check (visit_tags <@ array['service','ambiance','speed','value','cleanliness']::text[]);

create index idx_reviews_table_time on reviews(table_id, created_at);
create index idx_reviews_sentiment on reviews(sentiment);
create index idx_reviews_flagged on reviews(flagged_divergence) where flagged_divergence;
create index idx_reviews_created on reviews(created_at);

-- ---------------------------------------------------------------------
-- PER-DISH RATINGS (0..N rows per session — one per dish the diner rated)
-- ---------------------------------------------------------------------

create table review_dish_ratings (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references review_sessions(id) on delete cascade,
  review_id     uuid references reviews(id) on delete cascade, -- set once overall review row exists
  menu_item_id  uuid not null references menu_items(id) on delete restrict,

  rating        smallint check (rating between 1 and 5), -- nullable if diner only used chips/comment
  -- dish-level tag chips, fixed enum set
  dish_tags     text[] not null default '{}',
    -- allowed values: taste, portion, value, presentation
  comment       text,                                     -- optional per-dish free text

  sentiment            text not null default 'unanalyzed'
    check (sentiment in ('positive','neutral','negative','unanalyzed')),
  sentiment_confidence numeric(4,3),
  flagged_divergence   boolean not null default false,

  moderation_status  text not null default 'visible'
    check (moderation_status in ('visible','hidden_for_abuse')),

  created_at    timestamptz not null default now(),

  -- one rating per dish per session — the core anti-double-review constraint
  unique (session_id, menu_item_id)
);

alter table review_dish_ratings add constraint chk_dish_tags_valid
  check (dish_tags <@ array['taste','portion','value','presentation']::text[]);

create index idx_dish_ratings_item on review_dish_ratings(menu_item_id);
create index idx_dish_ratings_item_time on review_dish_ratings(menu_item_id, created_at);
create index idx_dish_ratings_sentiment on review_dish_ratings(sentiment);
create index idx_dish_ratings_flagged on review_dish_ratings(flagged_divergence) where flagged_divergence;

-- ---------------------------------------------------------------------
-- MODERATION LOG (append-only; abuse-handling audit trail)
-- ---------------------------------------------------------------------

create table moderation_log (
  id              uuid primary key default gen_random_uuid(),
  target_table    text not null check (target_table in ('reviews','review_dish_ratings')),
  target_id       uuid not null,
  action          text not null check (action in ('hidden_for_abuse','restored')),
  reason          text not null
    check (reason in ('hate_speech','personal_data_exposure','threat','spam_unrelated_content')),
  original_content_snapshot jsonb not null, -- full row snapshot at time of action
  performed_by    uuid not null references auth.users(id),
  performed_at    timestamptz not null default now()
);
-- No UPDATE/DELETE grants on this table for any role in normal operation (append-only).

-- ---------------------------------------------------------------------
-- ADMIN PROFILES (thin wrapper over Supabase auth.users)
-- ---------------------------------------------------------------------

create table admin_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role        text not null default 'admin' check (role in ('admin','owner')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- AGGREGATE VIEWS (admin-only reads; computed fresh, never edited)
-- ---------------------------------------------------------------------

create or replace view dish_rating_summary as
select
  mi.id as menu_item_id,
  mi.name,
  mc.name as category_name,
  count(rdr.id) filter (where rdr.rating is not null and not rs.is_low_effort) as rating_count,
  round(avg(rdr.rating) filter (where rdr.rating is not null and not rs.is_low_effort), 2) as avg_rating,
  count(rdr.id) filter (where rdr.rating is not null) as rating_count_raw,
  round(avg(rdr.rating) filter (where rdr.rating is not null), 2) as avg_rating_raw,
  count(rdr.id) filter (where rdr.flagged_divergence) as divergence_count
from menu_items mi
join menu_categories mc on mc.id = mi.category_id
left join review_dish_ratings rdr on rdr.menu_item_id = mi.id and rdr.moderation_status = 'visible'
left join review_sessions rs on rs.id = rdr.session_id
group by mi.id, mi.name, mc.name;

create or replace view visit_rating_trend as
select
  date_trunc('day', r.created_at) as day,
  count(*) filter (where not rs.is_low_effort) as review_count,
  round(avg(r.overall_rating) filter (where r.overall_rating is not null and not rs.is_low_effort), 2) as avg_overall_rating
from reviews r
join review_sessions rs on rs.id = r.session_id
where r.moderation_status = 'visible' and r.review_type = 'standard'
group by 1
order by 1;
```

### 5.3 Row-Level Security (RLS) policies

**Design principle:** the **anon key** (used by the diner-facing app) can `INSERT` into the review tables under tightly-scoped conditions and can `SELECT` from `menu_categories`/`menu_items`/`restaurant_tables` (read-only, public menu data) — and **nothing else**. It has **zero read access** to `reviews`, `review_dish_ratings`, `review_sessions`, or any aggregate view (enforcing 3.2 at the database layer). The **authenticated admin role** (via Supabase Auth, checked against `admin_profiles`) has full read access to everything and very limited write access (only via the moderation Edge Function, never raw table UPDATEs from the client).

```sql
-- Enable RLS everywhere
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table restaurant_tables enable row level security;
alter table review_sessions enable row level security;
alter table reviews enable row level security;
alter table review_dish_ratings enable row level security;
alter table moderation_log enable row level security;
alter table admin_profiles enable row level security;

-- Helper: is the current request from an authenticated admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from admin_profiles where id = auth.uid()
  );
$$ language sql stable security definer;

-- ---- MENU (public read, admin write) ----------------------------------
create policy "menu_categories_public_read" on menu_categories
  for select using (is_active = true or is_admin());
create policy "menu_categories_admin_write" on menu_categories
  for all using (is_admin()) with check (is_admin());

create policy "menu_items_public_read" on menu_items
  for select using (is_active = true or is_admin());
create policy "menu_items_admin_write" on menu_items
  for all using (is_admin()) with check (is_admin());

-- ---- RESTAURANT TABLES (public read of active codes only; needed to resolve QR) ----
create policy "tables_public_read_active" on restaurant_tables
  for select using (is_active = true or is_admin());
create policy "tables_admin_write" on restaurant_tables
  for all using (is_admin()) with check (is_admin());

-- ---- REVIEW SESSIONS (anon insert + limited self-update; admin read-all) ----
-- Anyone can create a session (first interaction)
create policy "sessions_anon_insert" on review_sessions
  for insert with check (submitted_at is null); -- can't pre-create an already-submitted session

-- A session can only be "submitted" once: allow UPDATE of submitted_at etc.
-- only while it is currently null, and only via the service role from the
-- API route (not directly from the anon client) — see §6.5. This policy
-- still exists as a defense-in-depth backstop if ever called from anon:
create policy "sessions_anon_update_once" on review_sessions
  for update using (submitted_at is null) with check (true);

-- Admin can read everything (for integrity dashboard)
create policy "sessions_admin_read" on review_sessions
  for select using (is_admin());
-- No anon SELECT policy at all -> anon cannot read session data back (3.1, 3.2)

-- ---- REVIEWS (anon insert only if parent session not yet submitted; admin read) ----
create policy "reviews_anon_insert" on reviews
  for insert with check (
    exists (
      select 1 from review_sessions rs
      where rs.id = session_id and rs.submitted_at is null
    )
  );
create policy "reviews_admin_read" on reviews
  for select using (is_admin());
create policy "reviews_admin_update_moderation" on reviews
  for update using (is_admin())
  with check (is_admin()); -- in practice only called via the moderation Edge Function
-- No anon SELECT, no anon UPDATE, no anon DELETE -> 3.2 / 3.5 enforced at DB layer

-- ---- REVIEW DISH RATINGS (anon insert only if parent session not yet submitted) ----
create policy "dish_ratings_anon_insert" on review_dish_ratings
  for insert with check (
    exists (
      select 1 from review_sessions rs
      where rs.id = session_id and rs.submitted_at is null
    )
  );
create policy "dish_ratings_admin_read" on review_dish_ratings
  for select using (is_admin());
create policy "dish_ratings_admin_update_moderation" on review_dish_ratings
  for update using (is_admin()) with check (is_admin());

-- ---- MODERATION LOG (admin read; insert only via Edge Function w/ service role) ----
create policy "moderation_log_admin_read" on moderation_log
  for select using (is_admin());
-- No insert/update/delete policy for anon or admin role directly —
-- only the service_role (used inside the Edge Function) bypasses RLS to insert.
-- This makes the log tamper-evident from the client's perspective.

-- ---- ADMIN PROFILES (self + admin read) ----
create policy "admin_profiles_self_read" on admin_profiles
  for select using (id = auth.uid() or is_admin());
create policy "admin_profiles_admin_write" on admin_profiles
  for all using (is_admin()) with check (is_admin());
```

**Why the "submit" step uses the service role, not raw anon UPDATE:** the final submission (Section 6.5) is handled by a Next.js Route Handler that uses the Supabase **service role key** (server-side only, never exposed to the browser) to atomically: (1) verify the session hasn't already submitted, (2) insert the `reviews` row, (3) backfill `review_id` on the session's `review_dish_ratings` rows, (4) set `review_sessions.submitted_at`. This single server-side transaction is simpler to reason about than relying on RLS alone for a multi-table atomic operation, while RLS remains the hard backstop against any direct REST calls bypassing the route handler.

---

## 6. Technical architecture

### 6.1 Route structure (Next.js App Router)

```
app/
├── layout.tsx                       -- root layout: fonts, theme CSS vars, ws-base class
├── globals.css                      -- imports design-system/tokens.css, Tailwind layers
├── page.tsx                         -- minimal landing/redirect (most traffic enters via /r/[tableCode])
│
├── r/
│   └── [tableCode]/
│       ├── layout.tsx               -- session bootstrap (cookie check), brand shell (no nav chrome)
│       ├── page.tsx                 -- LANDING (server component: resolves table code, checks session cookie)
│       ├── select/
│       │   └── page.tsx             -- DISH SELECTION (server: fetch menu via anon client; client: search/filter/select state)
│       ├── rate/
│       │   └── [dishIndex]/
│       │       └── page.tsx         -- PER-DISH RATING (client component; reads selection from client state/sessionStorage)
│       ├── overall/
│       │   └── page.tsx             -- OVERALL VISIT RATING (client component; on submit -> POST /api/reviews)
│       ├── thanks/
│       │   └── page.tsx             -- THANK YOU (server: sets cookie via Set-Cookie on first render)
│       └── already-reviewed/
│           └── page.tsx             -- ALREADY REVIEWED (server, + optional supplemental-note client form)
│
├── admin/
│   ├── layout.tsx                   -- auth guard (redirects to /admin/login if no session), admin nav shell
│   ├── login/
│   │   └── page.tsx                 -- Supabase Auth UI (email/password + magic link)
│   ├── dashboard/
│   │   └── page.tsx                 -- OVERVIEW (server component, queries views via authenticated server client)
│   ├── dishes/
│   │   ├── page.tsx                 -- PER-DISH TABLE
│   │   └── [id]/
│   │       └── page.tsx             -- DISH DETAIL
│   ├── integrity/
│   │   └── page.tsx                 -- burst detection / low-effort / divergence
│   ├── export/
│   │   └── page.tsx                 -- CSV export tool (form -> calls /api/admin/export)
│   └── settings/
│       └── page.tsx                 -- service-window config etc. (enhancement)
│
└── api/
    ├── reviews/
    │   └── route.ts                 -- POST: atomic final-submit transaction (service role)
    ├── sessions/
    │   └── route.ts                 -- POST: create/bootstrap a review_session (called on landing)
    └── admin/
        └── export/
            └── route.ts             -- GET: streamed CSV, authenticated, service role read
```

### 6.2 Server vs. client components

| Concern | Component type | Rationale |
|---|---|---|
| `/r/[tableCode]` landing | Server | Resolve table code → table row via anon client (RLS-readable), check cookie, render copy. No interactivity beyond a single CTA link — server-rendered for instant paint. |
| `/r/[tableCode]/select` | Server shell + Client island | Server fetches the full menu (categories + items) once via anon client (cacheable, read-only, public data). Client component (`<DishSelector />`) handles search/filter/multi-select state — this needs to be client because selection state must persist across the per-dish rating screens without a server round-trip per keystroke. |
| `/r/[tableCode]/rate/[dishIndex]` and `/overall` | Client | Entirely interactive forms; state (ratings, chips, comments for all selected dishes) is held in a single client-side reducer (e.g., `useReducer` or a tiny Zustand store) and persisted to `sessionStorage` so a refresh doesn't lose progress. Only the *final* `/overall` submit talks to the server. |
| `/r/[tableCode]/thanks`, `/already-reviewed` | Server | Static-ish brand copy; `thanks` sets the session cookie via `Set-Cookie` header on the server response (more reliable than client-side `document.cookie` across iOS Safari quirks). |
| `/admin/*` dashboard pages | Server (data) + Client (charts) | Server components fetch from Supabase views using the authenticated server client (cookie-based Supabase SSR auth) and pass serialized data as props to client chart components (Recharts or similar — Section 7.4). Keeps the Supabase service/auth keys server-side. |
| `/admin/login` | Client | Supabase Auth UI requires client-side interaction (form submission, redirect handling). |

**Why a client-side reducer for the whole diner review state, submitted once at the end (not per-dish):** This is the key architectural choice that makes 3.4's "one atomic submission" model possible, and also means a diner who abandons mid-flow (e.g., closes the tab after rating 2 of 4 dishes) **leaves zero database rows** — no `review_sessions` row even exists until the *first* API call. We considered an alternative (create the session + per-dish rows incrementally as the diner progresses, so partial data isn't lost on abandonment) — see Section 12 for why MVP picks the simpler all-or-nothing model and what the trade-off is.

*Correction/clarification on session creation timing:* to support the "already reviewed" soft-wall (4.2) and the service-window rate limiting (3.4) working correctly even for diners who *do* abandon, the **session row IS created early** (on first landing-page load, via `POST /api/sessions`, which inserts a `review_sessions` row with `submitted_at = null` and sets the `ws_review_session` cookie to its id) — but the **`reviews` and `review_dish_ratings` rows are created only at final submit**. An abandoned session is a row in `review_sessions` with `submitted_at = null` forever (harmless, prunable by a periodic cleanup job — Section 9) but contributes no rating data. This gives us both: early session-cookie issuance (so "already reviewed" works even if someone re-scans before finishing) and zero partial-rating pollution.

### 6.3 Supabase client usage

Three distinct Supabase client configurations:

1. **Anon browser client** (`lib/supabase/anon.ts`) — uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Used in:
   - Server components under `/r/*` for public menu reads (`menu_categories`, `menu_items`, `restaurant_tables`).
   - The `POST /api/sessions` and `POST /api/reviews` route handlers *also* use this for the initial `INSERT` into `review_sessions` (RLS policy `sessions_anon_insert` permits it) — but the **multi-table atomic write in `/api/reviews`** switches to the service-role client for the transaction (see 6.5).

2. **Server-side authenticated client** (`lib/supabase/server.ts`) — uses `@supabase/ssr`'s cookie-based session helper, `NEXT_PUBLIC_SUPABASE_ANON_KEY` + the admin's auth cookies. Used in all `/admin/*` server components and route handlers — RLS policies keyed on `is_admin()` apply naturally because the request carries the admin's JWT.

3. **Service role client** (`lib/supabase/service.ts`) — uses `SUPABASE_SERVICE_ROLE_KEY` (server-only env var, **never** prefixed `NEXT_PUBLIC_`). Used **only** inside:
   - `POST /api/reviews` (the atomic final-submit transaction, Section 5.3).
   - The `analyze-sentiment` Edge Function (Section 3.6).
   - The moderation Edge Function (Section 3.5, post-MVP).
   - `GET /api/admin/export` (bulk read for CSV — could alternatively use the authenticated client since the admin already has read access via RLS; service role is used here mainly for performance on large exports, not for permission reasons — documented inline in code).

### 6.4 QR generation / encoding (table + menu context)

**Encoding:** each QR code encodes a URL of the form:
```
https://review.wabisabi-entebbe.com/r/{tableCode}
```
where `{tableCode}` is the human-readable `restaurant_tables.code` (e.g., `t12`, `bar-3`, `patio-7`) — **not** a UUID, for two reasons: (1) shorter QR codes scan more reliably at a distance/angle, (2) staff can identify/reprint a specific table's code without a lookup tool.

**"Menu context" is encoded by the table code resolving server-side to a `restaurant_tables` row** — in MVP, this is purely identifying information (which table), used for:
- Attributing reviews to a table (`reviews.table_id`, `review_sessions.table_id`) for per-table rate limiting (3.4) and burst detection (3.7).
- Optionally grouping the dashboard by zone (e.g., "Patio" vs. "Sushi Bar" tables) if `restaurant_tables.label` encodes that.

**No live order-context (POS) integration in MVP** — the `/select` screen always shows the full menu (Section 4.2's "empty" state is, in fact, the *only* state in MVP). This is explicitly documented as a **post-MVP enhancement** (Section 11): if/when a POS integration exists, `table_orders` (a new table: `table_id`, `menu_item_id`, `ordered_at`) could pre-populate `/select`'s checked items — the schema in Section 5 is additive-compatible with this (no breaking changes needed later).

**Generation tooling:** QR codes are generated as static SVGs at build/seed time using a simple library (`qrcode` npm package) via a small admin-only script (`scripts/generate-qr-codes.ts`) that reads `restaurant_tables` and outputs one branded SVG per table (ensō-gold on washi, with the table label printed beneath — Section 7) to `public/qr/{code}.svg`. These are then printed onto table tents/cards by the restaurant — **physical printing is outside this system's scope**, but the SVGs are production-ready brand assets.

### 6.5 The atomic submission endpoint (`POST /api/reviews`)

Request body (from the client reducer state):
```ts
{
  sessionId: string;          // from ws_review_session cookie
  overall: {
    rating: number | null;
    visitTags: string[];
    comment: string | null;
  };
  dishes: Array<{
    menuItemId: string;
    rating: number | null;
    dishTags: string[];
    comment: string | null;
  }>;
  timeSpentSeconds: number;
  honeypot: string;           // must be empty
}
```

Server logic (using the **service role client**, single Postgres transaction via `supabase.rpc()` wrapping a `plpgsql` function, OR sequential calls inside a Postgres function called once — preferred for atomicity):

```sql
create or replace function submit_review(
  p_session_id uuid,
  p_overall_rating smallint,
  p_visit_tags text[],
  p_overall_comment text,
  p_dishes jsonb,            -- array of {menu_item_id, rating, dish_tags, comment}
  p_time_spent_seconds int,
  p_is_low_effort boolean
) returns uuid as $$
declare
  v_review_id uuid;
  v_already_submitted boolean;
begin
  select (submitted_at is not null) into v_already_submitted
    from review_sessions where id = p_session_id for update;

  if v_already_submitted is null then
    raise exception 'unknown_session';
  end if;
  if v_already_submitted then
    raise exception 'already_submitted';
  end if;

  insert into reviews (session_id, table_id, overall_rating, visit_tags, comment, review_type)
  select p_session_id, table_id, p_overall_rating, p_visit_tags, p_overall_comment, 'standard'
  from review_sessions where id = p_session_id
  returning id into v_review_id;

  insert into review_dish_ratings (session_id, review_id, menu_item_id, rating, dish_tags, comment)
  select p_session_id, v_review_id,
         (d->>'menu_item_id')::uuid,
         (d->>'rating')::smallint,
         coalesce((select array_agg(x) from jsonb_array_elements_text(d->'dish_tags') x), '{}'),
         d->>'comment'
  from jsonb_array_elements(p_dishes) d
  where (d->>'rating') is not null or (d->'dish_tags' != '[]'::jsonb) or (d->>'comment') is not null;
  -- only insert a per-dish row if the diner provided *something* for that dish

  update review_sessions
    set submitted_at = now(),
        time_spent_seconds = p_time_spent_seconds,
        is_low_effort = p_is_low_effort
    where id = p_session_id;

  return v_review_id;
end;
$$ language plpgsql security definer;
```

This function is called via the service-role client (`supabase.rpc('submit_review', {...})`), giving us a single round-trip, fully atomic operation with `FOR UPDATE` row-locking on the session to prevent a race (e.g., double-tap on Submit triggering two near-simultaneous requests).

### 6.6 Admin auth

- **Supabase Auth, email + password**, with magic-link as a secondary option (no public sign-up — admin accounts are created manually via the Supabase dashboard or a one-time seed script, since this is a single-restaurant tool with 1–3 admin users expected).
- Session managed via `@supabase/ssr` cookie helpers — `/admin/layout.tsx` is a server component that calls `supabase.auth.getUser()`; if null, redirect to `/admin/login`.
- `admin_profiles` row is created alongside each `auth.users` row (manually, or via a `handle_new_user` trigger if self-serve signup is ever enabled — not in MVP).
- **No password reset self-service flow required for MVP** (1-2 known users; Supabase's built-in "forgot password" email flow is enabled as a fallback at zero extra engineering cost, since Supabase Auth provides it out of the box).

### 6.7 Environment & secrets

| Variable | Scope | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | All clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon + server-authenticated clients |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** (Vercel env, server-only) | `/api/reviews`, Edge Functions, export |
| `NEXT_PUBLIC_SITE_URL` | Public | QR code generation (base URL) |
| `ANTHROPIC_API_KEY` | **Secret** (only if Section 3.6 Option B sentiment enhancement is enabled) | `analyze-sentiment` Edge Function |
| `LOW_EFFORT_THRESHOLD_SECONDS` | Config (e.g., `5`) | `/api/reviews` (computing `is_low_effort`) |
| `SERVICE_WINDOW_HOURS` | Config (e.g., `12`) | `/api/sessions`, `/r/*` already-reviewed check |

All secrets set via Vercel project environment variables (Production + Preview), never committed. Local development uses `.env.local` (gitignored) with values from a local/dev Supabase project (separate from production — Section 9 covers environment separation).

---

## 7. Brand & UI spec

### 7.1 Design-token mapping

Every diner- and admin-facing surface consumes `design-system/tokens.css` / the Tailwind theme extension directly — no new color/spacing/type values are introduced. Key mappings:

| Token | Diner-side usage | Admin-side usage |
|---|---|---|
| `--color-bg` (washi-100) | Page background throughout `/r/*` | Dashboard page background |
| `--color-surface` (washi-50) | Rating-screen cards, chip containers | KPI cards, table rows (alternating with washi-100) |
| `--color-surface-sunken` (washi-200) | Selected-dish summary strip, progress rail background | Sunken panel for the "needs attention" list |
| `--color-primary` / `--color-on-primary` (brass-500 / sumi-900) | The **single** primary CTA per screen (`[Continue →]`, `[Submit]`) — gold fill, dark ink text | Primary actions (export button, "apply filter") |
| `--color-ink` / `--color-ink-muted` / `--color-ink-subtle` | Headings / body / helper text hierarchy | Same hierarchy in dashboard copy |
| `--color-border` / `--color-border-strong` | Hairline dividers between dishes, chip outlines | Table row dividers, card borders |
| `--font-display` (Cormorant Garamond) | Dish names, screen headlines ("How was the *Salmon Nigiri*?") | Dashboard section headings, KPI numerals |
| `--font-sans` (Jost) | All body copy, buttons, chip labels, form fields | All dashboard UI text |
| `--tracking-widest` + uppercase | Eyebrow labels ("STEP 2 OF 4", "RATE THIS DISH") | Section eyebrows ("THIS WEEK", "NEEDS ATTENTION") |
| `--radius-lg` / `--radius-organic` | Cards use `--radius-lg`; **one** hero element per flow (the landing screen's central mark) uses `--radius-organic` for the "imperfect ceramic edge" signature | KPI cards use `--radius-lg`; charts avoid organic radius (would read as a bug in data viz) |
| `--shadow-sm` / `--shadow-md` | Resting card shadow / active-state lift on tap | Card shadows |
| `--ease-calm` / `--dur-fast` / `--dur-base` | All transitions — screen transitions use `--dur-base` (400ms), micro-interactions (chip toggle, button press) use `--dur-fast` (200ms) | Same — chart entrance animations, hover states |
| `--kintsugi-seam` | Thin gold divider between the per-dish rating and the tag-chip section (a literal "the imperfect becomes the considered detail" touch) | Divider between KPI row and trend chart |
| `--seigaiha` background | Very faint (≤16% opacity, per brand guidelines) full-bleed background texture on the Landing and Thank You screens only — never behind text-dense content | Faint texture on dashboard empty states only (keeps data screens clean) |
| `--ws-eyebrow` class | "RATE YOUR DISHES" type labels | "OVERVIEW", "TOP RATED", etc. |

### 7.2 Rating UI

**The 1–5 scale control** — *not* generic star icons (stars carry pre-loaded "5-star = excellent hotel" baggage that can anchor responses, per 3.3). Instead:

- A horizontal row of **5 circular touch targets** (min 48×48px, spaced with `--space-3` gaps), each containing a small **brush-stroke mark** that fills in with `--color-primary` (brass) as the diner taps that position and everything to its left — visually reading like a kintsugi gold seam being drawn left-to-right, **but each circle is independently tappable** (not just "fills up to here") so a diner can directly select position 2 without passing through 1.
- Below the row, **dynamic label text** (in `--font-sans`, `--text-sm`, `--color-ink-muted`) shows the symmetric behavioral label for the *currently highlighted* position (3.3's wording) — e.g., hovering/tapping position 2 shows "Below expectations." Nothing is shown before any tap (no default-highlighted position — 3.8).
- Unselected state: all 5 circles outlined in `--color-border-strong`, no fill, label area shows placeholder text in `--color-ink-subtle`: *"Tap to rate"*.
- Selected state: circles 1..N filled with `--gradient-brass`, circle N has a subtle `--shadow-sm` "lift," label updates.
- **Motion:** fill animates with `--ease-calm` over `--dur-fast` (200ms) — calm, not bouncy. Respects `prefers-reduced-motion` (Section 10) by cross-fading instead of animating a fill-width.

### 7.3 Tag chips

- Pill-shaped (`--radius-pill`), `--font-sans` `--text-sm`, uppercase with `--tracking-wide` (not the full `--tracking-widest`, which is reserved for eyebrows — chips need to stay compact).
- **Unselected:** `--color-border-strong` outline, transparent background, `--color-ink` text.
- **Selected:** filled `--color-surface-sunken` background (warm stone, *not* brass — brass stays reserved for the primary CTA and the rating fill per the "single accent" brand rule) with a thin `--border-ink` (1.5px sumi) outline and a small checkmark or filled-circle indicator. This keeps chip-selection visually distinct from the rating control's gold fill, avoiding two different UI elements competing for the same accent color.
- Multi-select, no minimum/maximum — diner can select zero, some, or all chips.
- Per-dish chip set: `Taste · Portion · Value · Presentation`. Per-visit chip set: `Service · Ambiance · Speed · Value · Cleanliness`. (Order matches the locked spec; "Value" intentionally appears in both sets since value-for-money can be a property of a specific dish *or* the visit as a whole.)
- Chip tap: `--dur-fast` background/border transition, `--ease-calm`.

### 7.4 Comment field

- `<textarea>`, 3 rows visible (auto-grows to ~6 rows max before internal scroll), `--color-surface` background, `--border-hairline`, `--radius-md`.
- Placeholder text per 3.3 ("Anything you noticed — good or otherwise") in `--color-ink-subtle`, `--font-sans`.
- Focus state: border transitions to `--color-focus` (brass-600) — the *only* other place brass appears besides the primary CTA and rating fill, and only as a 1.5px focus ring (meets 10's focus-visibility requirement without violating the "brass = sparing accent" rule, since focus rings are transient/interaction-only).
- Character counter only appears if the diner exceeds ~400 characters (soft guidance, not a hard limit below a generous cap of 1000) — *"Keep going if you'd like — 420/1000"* in `--color-ink-subtle`, `--text-xs`. No counter shown for short comments (avoids making the field feel like a form to be filled to a quota).

### 7.5 Admin dashboard charts

Using a lightweight charting library (Recharts — React-native, no extra runtime dependency beyond what's bundled, themeable via the token palette):

- **Trend line chart** (`visit_rating_trend` view): line in `--ws-brass-500`, area-fill gradient using `--gradient-brass` at low opacity, axis labels in `--font-sans` `--text-xs` `--color-ink-subtle`, gridlines in `--color-border` at reduced opacity (never harsh black gridlines).
- **Rating distribution histogram** (per-dish detail): 5 bars (1-5), bar fill `--color-accent-matcha` for bars 3-5 and `--color-accent-clay` for bars 1-2 — a deliberate, *subtle* dual-tone that helps the admin's eye parse "below vs. at/above midpoint" without resorting to alarming red/green (which would editorialize the data — the chart should look the same regardless of whether the distribution is good or bad, per 3.5's "no curation" principle. Clay and matcha are both muted earth tones from the existing palette, equally "calm").
- **Tag-chip frequency** (per-dish detail): horizontal bar chart, bars in `--color-surface-sunken` with `--border-ink` outline, length = frequency — reads like a minimalist "ink bar" rather than a typical SaaS dashboard bar.
- **KPI numerals**: `--font-display`, `--text-3xl`/`--text-4xl`, `--color-ink` — large serif numerals against small `--font-sans` uppercase labels (`--ws-eyebrow` style) is itself a premium-feeling pattern (editorial magazine numerals vs. generic dashboard sans-serif).
- All charts: entrance animation is a calm fade + slight upward translate (`--dur-base`, `--ease-calm`), respecting `prefers-reduced-motion`.

### 7.6 What makes it feel like $100k (premium signals)

1. **Restraint as luxury** — the diner flow has *one* accent color (brass) used for *exactly one thing per screen* (the primary action or the active rating fill). Everything else is washi/sumi/stone. Cheap products use color for everything; expensive products use it for one thing, deliberately.
2. **Generous `ma` (negative space)** — `--space-7`/`--space-8` (3rem/4rem) vertical rhythm between sections on every screen, even on mobile. The temptation on small screens is to compress; instead, content is allowed to require a small scroll rather than feeling cramped.
3. **Micro-interactions with intention** — the rating fill reads like a brush-stroke being drawn (7.2), chip selection has a soft settle (`--ease-calm`), the submit button's loading state is the ensō motif animating its stroke (not a generic spinner) — every animation *means something* tied to the brand's calligraphic motif, none are decorative-for-decoration's-sake.
4. **Typography as the primary luxury signal** — Cormorant Garamond headlines at generous sizes (`--text-2xl`/`--text-3xl`) for dish names and screen titles, set with `--leading-tight`, paired with small-caps/wide-tracking Jost labels. This serif/sans, large/small, tight/wide contrast is the same visual grammar as high-end hospitality menus and signage.
5. **The kintsugi seam as a structural device, not decoration** — used exactly once per screen, as a divider at a meaningful transition point (between "rate the dish" and "tell us more"), so it retains its meaning ("the considered detail") rather than becoming wallpaper.
6. **Haptic feedback on supported devices** (`navigator.vibrate` with a single short pulse, or the Web Vibration API where available) on rating-selection and submit-success — a tiny tactile confirmation that's common in premium native apps and rare in web forms, costs nothing to implement, and is wrapped in a feature-detection check + respects reduced-motion-adjacent preferences.
7. **No loading spinners, ever** — every async wait (page transition, submit) uses a brand-motif animation (ensō stroke completing) at a *calibrated minimum duration* (e.g., even if the API responds in 100ms, the animation completes its ~600ms cycle) — paradoxically, *adding* a small calibrated delay to a too-fast response makes the interaction feel more considered and less "did that even register?" (a well-known perceived-performance technique, used deliberately and sparingly only at true terminal points like final submit).
8. **Admin dashboard avoids generic SaaS chrome** — no sidebar with 20 icons, no notification bell, no avatar dropdown with 8 menu items. Top nav is five text links (Overview / Dishes / Integrity / Export / Settings) in `--font-sans` uppercase `--tracking-wide`, on a `--color-surface` bar with a `--border-hairline` bottom border. The dashboard looks like a considered editorial report, not a SaaS template.
9. **Empty and loading states are designed, not default** — Section 4.3's empty-state copy and the seigaiha-textured illustration treatment mean even a brand-new restaurant with zero reviews sees something intentional, not a broken-looking blank page.
10. **Consistent "one idea per screen"** — per the brand voice principles (knowledge-base/05), every diner screen asks exactly one question. No screen ever has two unrelated decisions competing for attention.

---

## 8. Higgsfield asset list

All assets are **ambiance/texture/motif only** — no fabricated photos of specific dishes (locked constraint). Assets generated via the Higgsfield MCP, delivered as still images (video noted where it adds value, kept minimal).

| # | Asset | Purpose & placement | Suggested prompt | Dimensions / aspect |
|---|---|---|---|---|
| 1 | **Landing screen hero texture** | Full-bleed background on `/r/[tableCode]` landing, behind the brand mark + CTA. Sets the calm tone for the whole flow. | "Extreme close-up macro photograph of washi paper texture with visible natural fiber grain, warm ivory tone (#F3EFE1), soft directional golden-hour light from upper left, very subtle, almost imperceptible concentric ripple (seigaiha) pattern barely visible in the texture, no text, no objects, shallow depth of field, photographic, calm and minimal" | 1080×1920 (mobile portrait, 9:16) |
| 2 | **Thank-you screen texture** | Full-bleed background on `/r/[tableCode]/thanks`. Should feel like a gentle close, slightly warmer/calmer than the landing. | "Macro photograph of a single antique brass/gold brushstroke (kintsugi-style seam) on warm ivory washi paper, the stroke is thin, imperfect, hand-drawn, asymmetric, positioned in the lower third of frame, vast empty warm-toned negative space above, soft natural light, photographic, serene" | 1080×1920 (mobile portrait, 9:16) |
| 3 | **Ensō loading/submit animation — source still** | Base image for the "ensō stroke completes" loading animation (7.6 #7) — exported as a still, then animated in CSS/SVG (stroke-dashoffset) rather than as video, for performance and reduced-motion compatibility. | "A single golden ensō (Zen brush circle), hand-painted with visible brush texture, antique brass/gold color (#B98A3C), open and uneven at one point (incomplete circle), on a transparent or pure warm-ivory background, high resolution, centered, no other elements" | 800×800 (square, transparent PNG/SVG-traced) |
| 4 | **Dish-selection category section dividers (x3 variants)** | Subtle background texture variants behind the category accordion on `/r/[tableCode]/select`, rotated across sections to add organic variety without being distracting. Low opacity overlay. | "Macro photograph of [variant: matte ceramic glaze / weathered wood grain / natural stone surface], warm neutral tones matching #E9E3D0 and #C9BFA6, soft even lighting, subtle texture, no objects, suitable as a low-opacity background overlay" | 1200×400 (wide, 3:1) — 3 variants |
| 5 | **Per-dish rating screen ambient backdrop** | Very subtle full-bleed texture behind the per-dish rating card — should not compete with the rating UI, just add warmth at the edges. | "Extremely subtle, soft-focus macro texture of natural linen or washi fiber in warm ivory (#F3EFE1) tones, almost flat with barely perceptible texture variation, vignette slightly darker at edges, no patterns, no objects, calm and unobtrusive, suitable as a background that text and UI elements sit on top of" | 1080×1920 (mobile portrait, 9:16) |
| 6 | **Overall-visit rating screen backdrop** | Companion to #5 but with a subtle motif difference (e.g., a faint seigaiha ripple) to signal "zooming out from dish to whole visit." | "Extremely subtle macro texture of warm ivory washi paper (#F3EFE1) with a barely-visible tone-on-tone seigaiha (concentric wave/ripple) pattern at under 10% contrast, soft and flat, no objects, calm, suitable as a UI background" | 1080×1920 (mobile portrait, 9:16) |
| 7 | **Already-reviewed screen texture** | Should feel warm and conclusive, distinct from thanks (slightly more "settled," less "fresh close") — e.g., a textural still life of tableware being cleared. | "Soft-focus macro photograph of the edge of a matte ceramic bowl and wooden chopsticks rest on a warm linen surface, muted earthen tones (clay #B07A56, stone #C9BFA6), natural soft window light, shallow depth of field, calm and quiet, no food visible, no people" | 1080×1920 (mobile portrait, 9:16) |
| 8 | **Admin dashboard empty-state illustration** | Used on `/admin/dashboard` (and other admin pages) when no data exists yet (4.3). Should feel intentional, not like a broken page. | "Minimalist line illustration in antique brass/gold (#B98A3C) on warm ivory, depicting a single open ensō circle with a small brush resting beside it, hand-drawn quality, lots of negative space, no text, suitable for an empty-state graphic in a calm admin interface" | 600×600 (square) |
| 9 | **Admin login screen backdrop** | Subtle full-bleed or side-panel texture for `/admin/login` — should feel calm and premium, distinct from the diner-facing textures (slightly more "ink/sumi" weighted, since this is the operator's side). | "Macro photograph of dark sumi-ink black (#16150F) brushed paper or stone texture transitioning subtly to warm ivory (#F3EFE1) at one edge, soft gradient, visible brush/grain texture, very subtle gold (#B98A3C) flecks or a single thin gold line near the transition, calm, premium, no text" | 1920×1080 (landscape, 16:9) |
| 10 | **General-purpose seigaiha texture tile (seamless)** | A seamless, tileable version of the seigaiha ripple pattern for use as a CSS `background-image` across multiple screens (replacing/complementing the CSS-only `--seigaiha` gradient with a higher-fidelity option for hero areas). | "Seamless tileable pattern of traditional Japanese seigaiha (overlapping wave/ripple circles), extremely subtle tone-on-tone, warm ivory base (#F3EFE1) with ripples in a barely-darker warm stone (#E9E3D0) at roughly 8-12% contrast, flat vector-like but with very slight hand-drawn imperfection in line weight, designed for seamless tiling" | 512×512 (square, seamless tile) |
| 11 | **QR code frame/card background (print asset)** | Background art for the printed table-tent QR cards (6.4) — the QR sits in the center, this is the surrounding card design. | "Elegant minimal card design background, warm ivory washi texture (#F3EFE1) with a single thin antique-gold (#B98A3C) hand-drawn line forming a partial, asymmetric frame near one edge (kintsugi-seam style, not a closed border), large empty central area reserved for a QR code, small reserved space at bottom for text, premium restaurant table-tent aesthetic, no other graphics" | 1050×1500 (print-ratio portrait, ~A6/postcard at 150dpi) |

**Total: 11 distinct assets** (13 generation jobs counting the 3 variants of #4). All are stills; no video generation is required for MVP (the ensō "loading" motion is achieved via CSS animation of asset #3, not generated video — keeping the interaction performant and reduced-motion-friendly). If a future enhancement wants a looping ambient video background for the landing screen, asset #1 could be regenerated as a 5-10s subtle loop via Higgsfield's video tools — flagged as optional in Section 11, not included in the count above.

---

## 9. Security & privacy

### 9.1 Anonymous data handling

- **No PII is ever collected** in the diner flow — no name, email, phone, or precise location beyond table code (which identifies a fixed restaurant fixture, not a person).
- `review_sessions.user_agent_hash` stores a **SHA-256 hash of the User-Agent string only** (computed server-side in the route handler, raw UA discarded immediately) — used solely as a coarse "is this the same browser/device class re-submitting" signal for the integrity dashboard, never reversible to an identity, and explicitly documented in code comments as non-PII.
- Free-text comments are stored as-is but **never displayed with any identifying metadata** (no "table 12 at 9:47pm said..." — admin sees comments grouped by dish/visit and date-bucketed, e.g., "this week," not down-to-the-minute timestamps, in the dashboard UI, even though the underlying row has a precise `created_at` for analytics).
- If a diner pastes PII into a free-text comment voluntarily (e.g., "my name is X and..."), this is a known residual risk of any open-text field — the moderation pathway (3.5, `personal_data_exposure` reason) exists specifically to handle this if it occurs, with the comment hidden (not deleted) and logged.

### 9.2 RLS as the primary access-control layer

Covered in depth in 5.3. Summary of the security model: **the anon key, even if extracted from client-side JS (which it always can be — it's public by design), grants only**: read access to active menu/table data, and insert access to `review_sessions` (only with `submitted_at IS NULL`) and `reviews`/`review_dish_ratings` (only for sessions not yet submitted). It grants **zero** read access to any review content or aggregate. This means even a full compromise of the anon key (trivial, expected) cannot leak review data or let an attacker read "what others said."

### 9.3 Rate limiting & abuse prevention

Layered approach from 3.4/3.7, summarized:
1. Per-session: one submission per `review_sessions` row, enforced by RLS + the `submit_review` function's `already_submitted` check.
2. Per-table: ~20 inserts/hour soft cap via a Postgres function checked inside `submit_review` (counts `reviews` rows for `table_id` in the trailing hour; if exceeded, the function raises a friendly `rate_limited` exception, surfaced to the diner as *"Thanks for your enthusiasm — we've reached our review capacity for this table right now. Please try again a bit later, or speak to a member of staff."* — graceful, on-brand, never a raw 429).
3. Honeypot field + `is_low_effort` flagging (3.4 #5) for sub-threshold submission times.
4. **Supabase built-in rate limiting** on the project's REST/Auth endpoints (configurable in the Supabase dashboard) as a final infrastructure-level backstop against gross abuse (e.g., thousands of requests/minute from one IP) — Supabase's edge infrastructure handles this without our schema needing IP storage.
5. **Vercel's platform-level DDoS protection** covers the Next.js routes themselves.

### 9.4 Admin auth hardening

- Supabase Auth with **email + password**, enforced minimum password strength (Supabase default policy: 8+ chars; recommend bumping to 12+ via Supabase Auth settings).
- **Optional but recommended: enable TOTP MFA** via Supabase Auth's MFA support for admin accounts — flagged as a Phase 5/6 hardening task (Section 11), not MVP-blocking given the small number of trusted users, but cheap to enable and meaningfully reduces account-takeover risk for the only privileged surface in the system.
- Session cookies are `httpOnly`, `secure`, `sameSite=lax` (Supabase SSR defaults) — admin JWT never accessible to client-side JS.
- `is_admin()` check (5.3) is `SECURITY DEFINER` but only ever reads `admin_profiles` keyed on `auth.uid()` — no privilege-escalation surface (it cannot be called with an arbitrary user id from the client).
- Service-role key is **never** sent to the browser, used only in: Route Handlers (`/api/reviews`, `/api/admin/export`), and Edge Functions. Verified by: (a) the env var is not prefixed `NEXT_PUBLIC_`, (b) a lint rule / code-review checklist item (Section 11 QA phase) confirms no client component imports `lib/supabase/service.ts`.

### 9.5 Data-protection considerations

- **Data minimization** is the core privacy posture — there is very little to protect because very little personal data exists by design.
- **Retention:** review content (ratings, tags, comments) has **no automatic deletion** in MVP (it's the core business asset — historical trend analysis depends on it). However, `review_sessions` rows where `submitted_at IS NULL` (abandoned sessions, 6.2) are pruned by a scheduled job (Supabase cron / pg_cron) after, e.g., **30 days** — pure housekeeping, no review data is in these rows.
- **`user_agent_hash`** could theoretically, combined with very granular timestamps and a small venue, narrow down "who" submitted a review to restaurant staff who happened to observe table activity — this is an inherent, low-severity residual risk of *any* system that timestamps anonymous feedback by table, and is mitigated by (a) not displaying precise timestamps to the admin (9.1), and (b) the hash being a hash, not a raw UA string.
- **GDPR/local data-protection framing:** since no personal data is collected from diners, most data-subject-rights obligations (access, erasure, portability) are largely moot for the diner-facing dataset. The admin/staff accounts (in `auth.users`/`admin_profiles`) **do** constitute personal data for those individuals and are handled per Supabase's own data-processing terms (Supabase is GDPR-compliant as a processor) — documented for completeness, not a blocker given the tiny user count.
- **Environment separation:** a separate Supabase project (or at minimum a separate schema/branch via Supabase branching) for development/staging vs. production, so test reviews never mix with real diner data and a developer's local `.env` never points at production secrets.

---

## 10. Accessibility (WCAG AA)

| Requirement | Implementation |
|---|---|
| **Color contrast** | Body text (`--color-ink` on `--color-bg`/`--color-surface`) is ~14:1 (brand guidelines confirm). All UI text meets AA (4.5:1 for normal text, 3:1 for large text ≥18px/24px-bold). **Gold (`--color-primary`) is never used as text color on light backgrounds** (confirmed in brand guidelines — used as fill with `--color-on-primary` (dark ink) text on top, which is ~10:1+). Tag-chip selected states use `--border-ink` (1.5px sumi) outlines, not color alone, to indicate selection (see "non-color indicators" below). |
| **Non-color indicators of state** | Selected rating position: filled + lifted shadow + label text change (not color alone). Selected chips: filled background + border-weight change + checkmark icon (not color alone). This serves both colorblind users and the AA "use of color" criterion (1.4.1). |
| **Keyboard navigation** | All interactive elements (rating circles, chips, textarea, buttons) are real `<button>`/`<input>`/`<textarea>` elements (not `<div onClick>`), so native tab order + Enter/Space activation work without custom JS. Rating control implemented as a `radiogroup` (`role="radiogroup"` with each option `role="radio"`, arrow-key navigation per WAI-ARIA radio pattern) so keyboard users can arrow between positions and the screen reader announces it as a single 5-option choice, not 5 separate buttons. |
| **Screen reader support** | Each screen has a single `<h1>` matching its visible headline (e.g., "How was the Salmon Nigiri?"). The rating control's `aria-label` includes the dynamic behavioral label (3.3) — e.g., `aria-label="Rating: Below expectations (2 of 5)"`. Progress indicator ("2 of 4 dishes") is announced via `aria-live="polite"` on screen transitions. Tag chips use `aria-pressed` for toggle state. Form errors (rate-limit message, network error) are in an `aria-live="assertive"` region so they're announced immediately. |
| **Touch target size** | All tappable elements ≥ 44×44px (rating circles are 48×48px per 7.2; chips have generous padding to exceed 44px height even though their visual "pill" might look smaller — padding extends the hit area). Spacing between adjacent targets ≥ 8px to prevent mis-taps. |
| **Motion reduction** | All `--ease-calm` transitions and the ensō-stroke loading animation are wrapped in `@media (prefers-reduced-motion: reduce)` queries that either remove the animation (instant state change) or replace motion-based transitions (fill-width, translate) with opacity cross-fades. The haptic feedback (7.6 #6) is unaffected by this media query (haptics aren't "motion" in the visual sense) but is itself gated behind a feature-detection check and is a single short pulse, never a pattern that could be disorienting. |
| **Focus visibility** | A visible focus ring (`--color-focus` / brass-600, 2px outline with offset) on every focusable element — critical since the design is intentionally low-contrast/calm, default browser focus styles (often a thin blue outline) would clash with the palette *and* might be invisible against washi tones if naively styled away. Focus styles are **never** removed (`outline: none` is banned in the codebase via a lint rule), only restyled to match the brand. |
| **Form labeling** | Every input (including the rating "radiogroup" and chip groups) has a programmatically-associated label (`<label>`/`aria-labelledby`) — even where the visual design treats the dish name as the "label" for the whole card, an `aria-labelledby` ties the rating control to that heading. |
| **Language & reading level** | Copy follows the brand voice (short, sensory, calm — knowledge-base/05) which incidentally aligns with WCAG's "plain language" guidance; no jargon, no idioms that don't translate (relevant given Entebbe's international hotel-guest audience — Section 12 notes potential future i18n). |
| **Admin dashboard charts** | Every chart has an accessible data-table alternative (visually hidden but screen-reader-accessible `<table>` with the same data, or a "View as table" toggle for dense charts) — charts alone are not an accessible way to convey the underlying KPIs. |
| **Zoom/text resize** | Layout uses relative units (`rem`, the `--text-*` scale) throughout; tested at 200% browser zoom without horizontal scroll or content loss on the diner flow (single-column design helps here inherently). |

---

## 11. Build phases / milestones

Each phase lists a task checklist. **MVP** = required for a usable, honest, on-brand launch. **Enhancement** = explicitly deferred, with the reason noted.

### Phase 0 — Project scaffold & environment (MVP)
- [ ] Initialize Next.js 14+ App Router project (TypeScript, Tailwind) inside `review-system/app/`
- [ ] Wire `design-system/tokens.css` + `tailwind.config.js` into the new project (extend, don't duplicate — import from `../design-system/`)
- [ ] Load Cormorant Garamond + Jost fonts (Google Fonts `next/font` for self-hosting/performance)
- [ ] Create Supabase project (via Supabase MCP `create_project`) — separate dev/staging project from the eventual production project
- [ ] Set up `lib/supabase/{anon,server,service}.ts` client factories
- [ ] Configure environment variables locally (`.env.local`) and document required Vercel env vars (6.7)
- [ ] Basic CI: typecheck + lint on push (GitHub Actions or Vercel's built-in checks)

### Phase 1 — Schema, RLS, and menu seed (MVP)
- [ ] Write migration files for all tables in Section 5.2 (via Supabase MCP `apply_migration`)
- [ ] Apply RLS policies from Section 5.3
- [ ] Write `submit_review` Postgres function (6.5)
- [ ] Write the rate-limiting check inside `submit_review` (9.3 #2)
- [ ] Build a one-time seed script (`scripts/seed-menu.ts`) that parses `sample-menu/menu.json` → `menu_categories` + `menu_items` (preserving order, handling the multi-variant price strings as `price_display`, parsing `price_from` for the lowest numeric value)
- [ ] Seed a handful of `restaurant_tables` rows (e.g., T1–T20, Bar-1–Bar-4, Patio-1–Patio-6 — adjust to real floor plan once available)
- [ ] Create `dish_rating_summary` and `visit_rating_trend` views
- [ ] Run Supabase advisors (`get_advisors`) to catch any RLS/schema issues early
- [ ] Verify with `list_tables` / a quick anon-key smoke test that anon truly cannot `SELECT` from `reviews`

### Phase 2 — Diner flow (MVP)
- [ ] `/r/[tableCode]` landing — table resolution, session bootstrap (`POST /api/sessions`), already-reviewed check via cookie + service-window logic
- [ ] `/r/[tableCode]/select` — menu fetch + render (16-category accordion + search), client-side multi-select state, "skip to overall" path
- [ ] Client-side reducer/store for in-progress review state, persisted to `sessionStorage`
- [ ] `/r/[tableCode]/rate/[dishIndex]` — per-dish rating screen (rating control, dish tag chips, comment field, progress indicator)
- [ ] `/r/[tableCode]/overall` — overall rating screen (visit tag chips, free-text, submit)
- [ ] `POST /api/reviews` — calls `submit_review`, handles `already_submitted`/`rate_limited` errors gracefully
- [ ] `/r/[tableCode]/thanks` — sets session cookie via `Set-Cookie`
- [ ] `/r/[tableCode]/already-reviewed` — soft wall + optional supplemental-note form
- [ ] All loading/empty/error states from Section 4.2
- [ ] Honeypot field + `time_spent_seconds` measurement + `is_low_effort` computation
- [ ] Mobile-first responsive pass on real devices (iPhone SE through standard Android, Section 4.4)

### Phase 3 — Admin dashboard (MVP)
- [ ] Supabase Auth setup, seed 1-2 admin users + `admin_profiles` rows
- [ ] `/admin/login`
- [ ] `/admin/layout.tsx` auth guard + nav shell
- [ ] `/admin/dashboard` — KPI cards, top/bottom dishes, trend chart, recent comments (querying the views from Phase 1)
- [ ] `/admin/dishes` — sortable/filterable table
- [ ] `/admin/dishes/[id]` — distribution histogram, tag frequency, comments, trend
- [ ] Date-range picker (Today/7d/30d/90d/Custom) wired to all dashboard queries
- [ ] All loading/empty/error states from Section 4.3

### Phase 4 — Integrity & export tooling (MVP)
- [ ] `/admin/integrity` — burst-detection banner logic, low-effort review breakdown, divergence-flag list
- [ ] `/admin/export` + `GET /api/admin/export` — CSV streaming (reviews + per-dish summary)
- [ ] Burst-detection SQL view/function (3.7)
- [ ] **`analyze-sentiment` Edge Function — Option A (lexicon-based)**, triggered on review insert, populating `sentiment`/`flagged_divergence`
- [ ] Wire divergence flags into `/admin/dishes/[id]` and `/admin/integrity`

### Phase 5 — Brand polish + Higgsfield assets (MVP, can run partly in parallel with Phase 2-4)
- [ ] Generate all 11 Higgsfield assets from Section 8 (via Higgsfield MCP), review against brand guidelines before integrating
- [ ] Implement the rating control's brush-stroke fill + ensō loading animation (7.2, 7.6)
- [ ] Implement kintsugi-seam dividers, seigaiha textures at correct opacity (≤16%)
- [ ] Haptic feedback wiring (feature-detected, 7.6 #6)
- [ ] Generate table QR codes (`scripts/generate-qr-codes.ts`) + the QR card background asset (#11)
- [ ] Full visual QA pass against `design-system/styleguide.html` for consistency

### Phase 6 — QA, accessibility, and security review (MVP)
- [ ] Full WCAG AA audit of diner flow (automated via axe + manual screen-reader pass on iOS VoiceOver/Android TalkBack — the realistic diner device context)
- [ ] Keyboard-only walkthrough of both diner and admin flows
- [ ] `prefers-reduced-motion` verification across all animated elements
- [ ] RLS penetration check: attempt anon reads of `reviews`/`review_dish_ratings`/`review_sessions`/views using only the public anon key — confirm all denied
- [ ] Rate-limit and one-review-per-dish enforcement testing (including direct REST calls bypassing the Next.js app)
- [ ] Cross-device QR scan testing (iOS Safari camera, Android Chrome, a few third-party QR apps)
- [ ] Load-test the per-table rate limiter and `submit_review` function under concurrent submissions (simulating a full table submitting simultaneously)
- [ ] Code-review checklist item: confirm no client bundle includes the service-role key (9.4)

### Phase 7 — Deploy (MVP)
- [ ] Production Supabase project provisioned (separate from dev/staging), migrations applied via Supabase MCP
- [ ] Production menu seed run (with real Wabi-Sabi menu once available — sample-menu is explicitly a placeholder, Section 5.2 notes)
- [ ] Vercel project linked, env vars configured (6.7), deploy via Vercel MCP
- [ ] Custom domain (`review.wabisabi-entebbe.com` or subpath of main site) configured
- [ ] Smoke test full diner flow + admin login on production
- [ ] Print and place QR table cards (physical step, outside system scope but tracked as a launch dependency)

### Post-MVP Enhancements (explicitly deferred, with reasons)

| Enhancement | Reason deferred |
|---|---|
| **POS/order-context integration** (pre-populating `/select` with actual ordered items) | Requires a POS API integration not yet scoped; the full-menu fallback (4.2) is fully functional and on-brand without it. Schema is additive-compatible (6.4). |
| **Moderation UI** (hide-for-abuse with reason codes, 3.5) | Deliberately shipped *without* its UI initially so the first version is structurally incapable of curation; add only if real abuse occurs, with the audit trail (`moderation_log`) as a hard requirement of that addition. |
| **LLM-based sentiment (Option B, 3.6)** | Adds external API dependency + cost; lexicon-based MVP sentiment is sufficient for the divergence-flag use case. Revisit if free-text volume grows and richer categorization (e.g., auto-tagging "mentions spice level") becomes valuable. |
| **Admin MFA (TOTP)** | Cheap to add but not MVP-blocking with 1-2 trusted users; scheduled for Phase 6 hardening if time allows, otherwise immediately post-launch. |
| **i18n / multi-language diner flow** | Entebbe's airport-hotel context means international guests; the brand voice (knowledge-base/05) and copy (3.3) are currently English-only. Flagged as a real consideration but not MVP-blocking — most hotel guests in this segment are comfortable with English, and adding a language switcher prematurely adds a decision to the landing screen that conflicts with G1. |
| **Cloudflare Turnstile / invisible CAPTCHA** | Documented escalation path (3.4) if observed brigading exceeds what burst-detection + rate-limiting handle. Not pre-emptively added (friction cost). |
| **"Popular dishes" public page** (fed from admin-curated, non-live data) | Tempting but directly adjacent to the anti-anchoring principle (3.2) — flagged for business discussion, not built without explicit sign-off that it's sourced from a separate, clearly-non-live dataset. |
| **Looping ambient video background** (Higgsfield video, Section 8 note) | Nice-to-have; static textures + CSS animation achieve the premium feel without video's performance/accessibility overhead. |
| **Incremental session/draft persistence to DB** (so abandoned reviews aren't fully lost) | The all-or-nothing model (6.2) is simpler and has zero partial-data integrity concerns; if abandonment rates from analytics (1.2) prove high *and* the lost partial data would be valuable, revisit with a clear plan for how partial rows interact with the "one-review-per-dish" constraint and aggregates (partial rows would need a `draft`/`final` status to avoid polluting averages). |

---

## 12. Risks & open questions

### 12.1 Open questions for the business/stakeholders

1. **Service-window definition (3.4):** is 12 hours the right boundary for "one visit"? Should it differ for breakfast (included in room rate, per knowledge-base) vs. dinner service? Recommend confirming with operations before Phase 1 seed.
2. **Real menu data:** `sample-menu/menu.json` is explicitly a placeholder (Izumi Restaurant transcription, per its own `_meta.disclaimer`). The schema/seed script (Phase 1) is built to be **re-run against the real Wabi-Sabi menu** once available — but category names, item counts, and price formats may differ from the 16/183 sample, and the multi-variant price-string handling (`price_display`) should be validated against real menu formatting conventions once seen.
3. **Floor plan / table codes:** Section 6.4's `restaurant_tables` seed (T1-20, Bar-1-4, Patio-1-6) is a placeholder structure — needs real table numbering/zoning from the venue.
4. **Incentives (3.8):** confirmed out of MVP, but is there business appetite for a *content-neutral* incentive (e.g., every Nth table gets a small thank-you regardless of what they said) as a future test? Flagged, not resolved.
5. **"Popular dishes" public-facing feature** — see Phase 11 table; needs explicit product sign-off given its tension with 3.2.
6. **Admin user count/roles** — schema supports `admin`/`owner` roles (5.2) but MVP doesn't differentiate permissions between them; confirm if a future "owner sees integrity page, manager doesn't" split is needed.

### 12.2 Technical/product risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Low scan rate** — diners don't notice/use the QR code at all | Medium | High (no data = no value) | Brand-quality QR card design (asset #11) at every table; staff can optionally mention it (not scripted/pressured — avoid 3.5's selective-solicitation trap by making any staff mention generic: "feel free to scan if you have a moment," never targeted at perceived-happy tables) |
| **Diners rate only 1 dish then abandon** (per-dish fatigue across a 4-6 dish order) | Medium | Medium (less per-dish coverage, but overall-visit + skip-path still capture signal) | The skip-to-overall path (4.2) means even fatigue mid-flow yields *some* data if the diner just hits Submit on `/overall` — verify the reducer allows reaching `/overall` with partial per-dish data intact, not just zero dishes |
| **All-positive bias regardless of mitigations** (people who bother to review skew toward extremes/positivity inherently — a known survey-research phenomenon, not fixable by UX alone) | High (inherent) | Low-Medium (doesn't invalidate relative comparisons between dishes, which is the main use case) | Frame this explicitly to the admin in dashboard copy/docs: absolute averages will likely run high; **relative** comparison (this dish vs. menu average) is the more reliable signal — bake this framing into `/admin/dashboard` copy itself, not just this plan |
| **Sentiment classifier (lexicon-based) misfires on sarcasm/local idiom** | Medium | Low (it's an informational flag, never gates anything — 3.6) | Document the limitation directly in the `/admin/integrity` UI copy ("Sentiment is a rough signal, not a verdict") |
| **Multi-variant price strings (`"40,000 / 45,000 / 45,000"`) don't map cleanly to a single `menu_item` for rating** — is a diner rating "Thai Red Curry" generally, or specifically the Chicken variant they ordered? | Medium | Medium (slight ambiguity in what's being rated) | MVP treats each menu row as one rateable entity regardless of variants (the dish name, e.g. "Thai Red Curry," is what's rated — variant choice affects price, not the rated entity). If real-menu data reveals variants are significant enough to warrant separate ratings (e.g., "Salmon Nigiri" vs "Salmon Sashimi" are different rows already — fine; but "Chicken Curry" vs "Veg Curry" as the *same row* with different prices is the edge case), revisit during Phase 1 seed against real data |
| **Supabase free/low tier limits** (connection pool, Edge Function invocations) under unexpectedly high traffic | Low (single restaurant, bounded table count) | Medium | Per-table rate limiting (9.3) keeps absolute volume bounded; monitor via Supabase dashboard; upgrade tier is a config change, not an architecture change |
| **QR code damage/loss at tables** (spills, wear) | Medium | Low | SVG source files retained for reprinting (6.4); consider laminated cards in Phase 7 |
| **Admin checks dashboard rarely, insights go stale** | Medium | Medium | Out of scope for the system itself, but the dashboard's "Δ vs prior period" framing (2.3) is designed to make even an infrequent check immediately informative ("up/down since last time you looked," not just a static snapshot) |

### 12.3 The "$100k quality bar" checklist

The finished product must pass **every** item below before launch is considered complete:

**Brand fidelity**
- [ ] Every color used is a token from `design-system/tokens.css` — zero hardcoded hex values in component code
- [ ] Brass/gold appears as exactly one accent per screen, never as a dominant fill or repeated decorative element
- [ ] Cormorant Garamond is used for every headline/dish-name; Jost for every body/UI text — no fallback-font flashes (fonts self-hosted via `next/font`)
- [ ] The kintsugi seam, ensō motif, and seigaiha texture each appear with clear *meaning* (structural divider, loading/completion, ambient calm) — never as random filler
- [ ] No element violates the "imperfect/handmade" principle by being rigidly symmetrical where the brand calls for organic asymmetry (e.g., the one `--radius-organic` hero element per flow, per 7.1)

**Diner experience**
- [ ] A first-time user can complete the full flow (landing → select → rate 2 dishes → overall → thanks) in under 90 seconds on a mid-range Android phone over 4G, measured, not estimated
- [ ] Every transition feels intentional — no jarring layout shifts, no flash-of-unstyled-content, no generic browser-default form elements visible anywhere
- [ ] The flow works correctly with the phone's screen rotated, zoomed to 200%, and with VoiceOver/TalkBack running
- [ ] Re-scanning the QR after submitting shows the already-reviewed screen, not a broken/duplicate form
- [ ] Network interruption mid-submit shows a calm retry, never a blank screen or browser error page

**Admin experience**
- [ ] A new admin, with zero training, can answer "what's our worst-performing dish this week and why" within 60 seconds of logging in
- [ ] Every chart has a no-jargon, one-line explanation of what it shows and why it matters (tooltip or inline caption)
- [ ] The dashboard looks intentionally designed — no default browser table styling, no Bootstrap-blue, no generic dashboard-template aesthetic
- [ ] Export produces a clean, immediately-usable CSV (correct headers, no encoding issues, opens cleanly in both Excel and Google Sheets)

**Integrity (the core promise)**
- [ ] An anon-key-only client (verified via direct REST calls, not just the UI) cannot read any review content, session data, or aggregate
- [ ] Submitting two reviews for the same dish in the same session is rejected at the database level even via direct API calls
- [ ] No UI control anywhere allows hiding/deleting an individual review's content from any calculation (MVP)
- [ ] The diner never sees any number, star average, or "X people said..." statistic before submitting
- [ ] Rating scale labels are symmetric/behavioral, not valence-loaded (3.3) — spot-check every label against the "would 'as expected' feel like an insult to type" test
- [ ] No default-selected rating value exists anywhere in the diner flow

**Performance & reliability**
- [ ] Lighthouse mobile score ≥ 90 for Performance, Accessibility, Best Practices on the diner flow
- [ ] All Higgsfield-generated images are served optimized (Next.js `<Image>`, appropriate formats/sizes) — no multi-MB hero images on mobile
- [ ] `submit_review` completes in < 500ms p95 under realistic load
- [ ] Zero console errors/warnings in production build across the full diner and admin flows

---

*End of plan. This document is the single source of truth for the build; any deviation during implementation should be reflected back here via a follow-up edit, not left as undocumented drift.*
