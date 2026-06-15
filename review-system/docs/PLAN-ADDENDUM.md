# Implementation Plan — Addendum v1.1 (Red-Team Resolutions)

> Read **alongside** `IMPLEMENTATION-PLAN.md`. Where this conflicts with v1.0, **this wins.**
> Consolidates the must-fixes from `CRITIQUE-product.md` and `CRITIQUE-technical.md`.
> Date: 2026-06-16. Status: **vetted — ready to build once these are folded in.**

## Red-team scorecard (v1.0)
| Lens | Score | | Lens | Score |
|---|---|---|---|---|
| Bias & integrity | 6/10 | | RLS correctness | **3/10** |
| Diner UX / friction | **4/10** | | Submission integrity | **4/10** |
| Admin usefulness | 5/10 | | Anonymity vs abuse | 6/10 |
| Brand / $100k feel | 6/10 | | Architecture / feasibility | 6/10 |

The bias *taxonomy* and design-token system are best-in-class; the failures are in **execution detail** — fixable on paper before Phase 1.

---

## A. Security & data integrity (CRITICAL — blocks Phase 1)

The core promise — "the database itself refuses to reveal others' ratings" — is **not delivered by v1.0's policies.** Corrected model: **all writes go through SECURITY DEFINER RPCs only; the anon role gets no direct table DML and no aggregate reads.**

- **A1 (was T1):** **Drop** `reviews_anon_insert` and `dish_ratings_anon_insert`. Anon must NOT hold direct INSERT on `reviews`/`review_dish_ratings`/`review_sessions`. All inserts happen inside `submit_review()` (SECURITY DEFINER). Anon is granted `EXECUTE` on `start_session()` and `submit_review()` **only**.
- **A2 (was T2):** **Drop** `sessions_anon_update_once` (its `with check (true)` lets anon PATCH `submitted_at`, `table_id`, `is_low_effort`, etc.). Session state transitions happen only inside the RPCs.
- **A3 (was T3):** Recreate `dish_rating_summary` and `visit_rating_trend` with **`security_invoker = true`** and **no grant to `anon`** (admin/authenticated + service role only). Add a Phase-1 test that asserts the anon key gets `0 rows / permission denied` on every aggregate **view**, not just base tables.
- **A4 (was T4):** Make `submit_review()` **per-dish non-fatal** — invalid/stale `menu_item_id` is skipped (and returned in a `skipped[]` result), never rolling back the whole review. Overall rating + valid dish ratings always persist. Client keeps state to retry only the skipped rows.
- **A5 (was T5):** Implement the §9.3 **rate limit for real**, inside the RPC: bucket by `(table_id, hashed-IP)` over the service window using a salted hash (no raw IP stored = no PII). Handle the NULL-`table_id` case explicitly (reject).
- **A6 (was T6):** Replace enumerable/guessable table codes with **opaque, signed codes** resolved by a single `get_table_context(code)` RPC (returns minimal, non-enumerable context). `restaurant_tables` is not directly selectable by anon.
- **A7 (was T8):** Pin `search_path = ''` (schema-qualify everything) on every `SECURITY DEFINER` function.
- **A8 (was T7):** Enforce the **service-window** ("one visit") boundary **server-side** in `start_session()`/`submit_review()`, not just per-session-cookie.
- **A9 (was T9):** Cap `comment` length (**≤ 600 chars**, enforced in RPC + DB check). Admin renders free text as React text nodes only — **never `dangerouslySetInnerHTML`** (XSS-safe by construction).
- **A10:** Phase 1 exit gate ⇒ run the RLS verification suite against **writes AND reads** with the anon key (attempt direct INSERT/UPDATE/SELECT on every protected table/view; all must fail).

## B. Bias & integrity (CRITICAL/HIGH)

- **B1 (was P5):** **All reviews count in headline averages by default.** "Low-effort" is a *transparent label only*, never auto-excluded. Any filtering is explicit, opt-in, and written to the append-only `moderation_log`. (v1.0's "excluded by default" is the exact curation lever §3.5 forbids — removed.)
- **B2 (was P2):** Add calm, explicit **perceived-anonymity** copy at session start and at submit, e.g. *"Anonymous. We can't see who you are — the kitchen hears the food, not the table."* De-emphasize the table number in the UI; collect zero name/contact fields. Perception drives honesty.
- **B3 (was P3):** **Minimum-sample gate** on the admin side: dishes with `N < 5` show *"Not enough feedback yet,"* are **excluded from Top-Rated / Needs-Attention rankings**, and sample size + a confidence cue appear on every figure. Never rank on tiny N.
- **B4:** Brigading defense stays (burst detection in RPC) but only ever **flags for transparency**, never silently drops — consistent with B1.

## C. Diner UX (CRITICAL/HIGH)

- **C1 (was P1):** Drop the unrealistic `<90s` claim. New targets: **≤45s** overall-only quick path; **≤2 min** for a typical 2–3 dish review. Diners **pick only the dishes they had** (search + category, not all 183); never asked to scroll the full menu.
- **C2 (was P6):** Multi-variant dishes (e.g. Veg/Chicken/Beef curries, multi-price sushi) present the **variant as part of "what did you have,"** and the chosen variant is stored on the dish rating. Seed script keeps `price_display` and adds `variants[]`.
- **C3:** Handle real-table edge cases: shared/family-style dishes (rate by "did you taste it"), large parties (one device, multiple submissions allowed within window), "I didn't order that" (easy removal), poor signal (optimistic local state + retry), no finish state required.

## D. Admin usefulness (HIGH/MED)

- **D1 (was P7):** **Remove the ⚠️ emoji** (and all emoji) from admin UI — violates the brand's "no emoji clutter." Use a thin **brass left-border** / small ensō dot as the attention indicator.
- **D2:** Dashboard framing is **relative to menu average**, with sample size always visible; lead with "what changed" and "what needs a look (with enough data)," not vanity totals.

## E. Brand & visuals (CRITICAL/MED)

- **E1 (was P4):** **Contrast fix.** `--color-border-strong` (#A89E86) is **2.31:1** on washi-100 — fails WCAG **1.4.11 (3:1)** for non-text UI state indicators (unselected rating circles/chips). Add `--color-interactive-border: #7C7666` (stone-600, **≥3:1** verified) for all interactive control outlines; keep #C9BFA6 for decorative dividers only. Gold stays decorative — never the sole state indicator. Add an automated contrast check to the QA gate.
- **E2 (was P8):** **Higgsfield "hand-made" acceptance test.** Every generated texture/ambiance asset must read as organic and imperfect (washi grain, real brush, natural light) — **reject & regenerate anything uncanny or obviously-AI**, since synthetic-looking texture directly contradicts wabi-sabi's "made by a human hand." Human-review each of the ~11 assets before use; prefer subtle, low-contrast, asymmetric.

## F. Accessibility (MED)

- **F1 (was T10):** Add **focus management** on route transitions (move focus to the new view's heading). The "calibrated minimum loading duration" must be **bypassed under `prefers-reduced-motion`** (no artificial waits, no ensō spin).
- **F2:** AA throughout: ≥44px touch targets, visible focus rings (`--color-focus`), labelled controls, screen-reader announcements on submit success/skip.

---

## Updated $100k quality-bar gate (additions)
- [ ] Anon key fails **every** direct read/write on protected tables AND views (A10).
- [ ] No review is ever silently excluded; all curation is opt-in + audit-logged (B1/B4).
- [ ] Diner can complete a 2-dish review in ≤2 min on a phone, one-handed (C1).
- [ ] No dish is ranked on N<5; sample size visible everywhere (B3).
- [ ] All interactive outlines ≥3:1 contrast; zero emoji; gold decorative only (E1/D1).
- [ ] Every Higgsfield asset passes the hand-made test (E2).
- [ ] Full keyboard + reduced-motion + SR pass (F1/F2).

## Build readiness
**GO**, conditioned on folding A1–A10 and E1 into Phase 1 before app code. Product fixes (B, C, D) land in their respective phases. This addendum + the v1.0 plan together are the build contract.

---

## Build decisions (v1.2 — confirmed at kickoff, 2026-06-16)
- **Repo:** PUBLIC GitHub repo `wabi-sabi-entebbe`, whole project. ⚠️ Secrets hygiene is now critical: `.env*` is git-ignored; the Supabase **service-role key is NEVER committed** (lives in `.env.local` / Vercel env only). The Supabase **anon key + project URL are public-safe by design** (protected by RLS).
- **Backend:** a NEW Supabase project (`wabi-sabi-reviews`); schema / RLS / RPCs applied via migrations; menu seeded from `sample-menu/menu.json`.
- **Admin auth: DEFERRED** (not yet sold to client). Integrity is still preserved: the anon (diner) role **cannot read reviews/aggregates** (anti-anchoring holds at the DB layer per §A). The **admin dashboard reads via a server-side service-role client only** (never shipped to the browser) and lives under an `(admin)` route group + layout that is the explicit insertion point for auth later (flag `ADMIN_AUTH_ENABLED`). ⚠️ **Before any PUBLIC deploy, add a gate** (Supabase Auth or Vercel password) so `/admin` isn't world-readable.
- **Parallelization:** foundation-first → Diner ∥ Admin (parallel) → QA agent. Feature agents **write files only**; the orchestrator owns all git commits/pushes at wave boundaries.
- **Components:** bespoke, hand-built to the wabi-sabi brand (Radix primitives only where they add real a11y value); no off-the-shelf UI kit whose defaults fight the aesthetic.
- **Stack:** Next.js (App Router, TS) + Tailwind (preset generated from `design-system/tokens.json`) + `@supabase/supabase-js`; QR via `qrcode`; charts via a lightweight lib (e.g. Recharts). npm. ~12 sample tables seeded with QR codes.
