# Wabi-Sabi Entebbe Review System — Technical Red-Team Critique

**Reviewed:** IMPLEMENTATION-PLAN.md v1.0 (§5 data model, §5.3 RLS, §6 architecture, §6.5 atomic submission, §9 security)
**Reviewer posture:** skeptical staff engineer + appsec — assume bugs/holes exist, find them.
**Verdict in one line:** see end of document.

---

## Scores by lens (1–10, 10 = no notes)

| Lens | Score | One-line reason |
|---|---|---|
| 1. RLS correctness & data exposure | **3/10** | The anon-write policies on `reviews`/`review_dish_ratings`/`review_sessions`, intended as "defense in depth," are independently a complete bypass of the atomic function, rate limits, and anti-anchoring guarantee — and aggregate views have no stated grants/security_invoker, so they may leak straight past RLS. |
| 2. Submission integrity | **4/10** | `submit_review` itself is well-designed (row lock, atomic), but it is not the *only* write path (see Lens 1), it's not retry-idempotent from the diner's perspective, one bad `menu_item_id` nukes the whole submission, and the documented rate-limit check doesn't exist in the SQL. |
| 3. Anonymity vs. abuse | **6/10** | No PII leaks into anti-abuse signals (good), but the "service window" concept described in §3.4 #3 isn't actually implemented anywhere, and the only real per-table brake (the rate limit) is keyed on an anon-mutable `table_id`. |
| 4. Architecture & feasibility | **6/10** | Mostly realistic for an MVP, but table codes are both guessable *and* fully enumerable via RLS, sentiment analysis is meaningfully over-scoped for "MVP," and a few async/grant details are left implicit. |
| 5. Accessibility (technical) | **7/10** | Strong on contrast, semantics, ARIA, and reduced-motion *intent*, but route-transition focus management is unaddressed and the "calibrated minimum duration" pattern (§7.6 #7) actively conflicts with `prefers-reduced-motion` as currently scoped. |

---

## CRITICAL findings

### C1. The "defense-in-depth" anon INSERT policies on `reviews` / `review_dish_ratings` are a complete, unrestricted alternative write path that bypasses `submit_review` entirely

**Section:** §5.3 (`reviews_anon_insert`, `dish_ratings_anon_insert`), §6.5 (`submit_review`).

**The problem:**
- `reviews_anon_insert` and `dish_ratings_anon_insert` each allow `INSERT` whenever `exists (select 1 from review_sessions rs where rs.id = session_id and rs.submitted_at is null)` — i.e., *any session that hasn't submitted yet*.
- `submit_review` is `security definer`. A `SECURITY DEFINER` function executes its internal DML as the **function owner** (typically a superuser/`postgres`-class role applied via migrations), which **bypasses RLS entirely** for those statements. That means `submit_review`'s own `INSERT INTO reviews ...` and `INSERT INTO review_dish_ratings ...` **do not need any anon INSERT policy to work** — the policies described as "defense-in-depth backstop" are not load-bearing for the intended path at all.
- Because they're not load-bearing but *are* present, they constitute a second, fully independent way to write to these tables — straight from the public anon key via PostgREST, with **none** of `submit_review`'s guarantees:
  - No `already_submitted` check (the policy only checks `submitted_at IS NULL`, which is the *default and permanent* state if `submitted_at` is simply never set).
  - No per-table rate limit (§9.3 says this lives "inside `submit_review`" — never invoked on this path).
  - No honeypot / `time_spent_seconds` / `is_low_effort` computation (also `submit_review`-only).
  - No FK/CHECK validation failure rolls back "the whole review" because there *is* no whole-review transaction — each table is inserted independently.

**Concrete exploit (3 unauthenticated REST calls, repeatable indefinitely):**
```http
POST /rest/v1/review_sessions   { }                      -- anon insert OK (submitted_at defaults null)
                                  -> returns new session id S

POST /rest/v1/reviews
  { "session_id": "S", "overall_rating": 1, "comment": "<script>...</script>", "visit_tags": ["service"] }
  -- passes reviews_anon_insert: a row exists in review_sessions with id=S and submitted_at is null

POST /rest/v1/review_dish_ratings   (repeat for any/all menu_item_id)
  { "session_id": "S", "menu_item_id": "<any dish>", "rating": 1, "comment": "..." }
  -- passes dish_ratings_anon_insert for the same reason
```
`submitted_at` is **never set** by this path, so the *same trick* (mint a new `review_sessions` row, then one `reviews` + N `review_dish_ratings` inserts) can be repeated without limit. Every row created here is `moderation_status = 'visible'` by default and is **included, unfiltered, in `dish_rating_summary` and `visit_rating_trend`** (those views only filter on `moderation_status`/`is_low_effort`/`review_type`, not on whether the parent session ever finished `submit_review`).

**Risk:** This is the inverse of the product's entire premise. §1.2 frames "is this data trustworthy" as the metric that matters most, and §3.5 goes to great lengths to prevent *admin*-side curation — but this hole lets **anyone with the public anon key (which is public by design, §9.2) inject unlimited, unrated-by-any-honeypot, unrate-limited rows directly into the numbers David sees**, including arbitrary free text rendered in the admin dashboard (see C2/H4 for the comment-content angle). A single disgruntled person or competitor can script this in minutes; no QR scan, no table visit, no rate limit, no `is_low_effort` segregation (it's not "low effort," it's *zero effort, scripted*).

**Fix:** Drop both anon INSERT policies on `reviews` and `review_dish_ratings`. `submit_review` (owned by a role that bypasses RLS as a `SECURITY DEFINER` function) continues to work unchanged — it was never relying on them.

```sql
-- Remove entirely — not load-bearing, and independently exploitable as written.
drop policy if exists "reviews_anon_insert" on reviews;
drop policy if exists "dish_ratings_anon_insert" on review_dish_ratings;

-- reviews / review_dish_ratings now have:
--   - admin SELECT (existing)
--   - admin UPDATE for moderation (existing)
--   - NO insert policy for anon or authenticated at all
-- All writes happen exclusively inside submit_review's RLS-bypassing context.
```
Verify the owner of `submit_review` after creation is **not** a low-privilege role:
```sql
select proowner::regrole from pg_proc where proname = 'submit_review';
-- should be a role with rls bypass / superuser-equivalent in your Supabase project (default migration owner is fine)
```
Add to Phase 6's RLS penetration checklist explicitly: *"attempt direct `POST /rest/v1/reviews` and `POST /rest/v1/review_dish_ratings` with a freshly-minted unsubmitted session — confirm both are rejected with no INSERT policy found."*

---

### C2. The same logic applies to `review_sessions` — `sessions_anon_update_once` lets anon directly mutate `submitted_at`, `table_id`, and other columns with `with check (true)`

**Section:** §5.3 (`sessions_anon_update_once`).

**The problem:**
```sql
create policy "sessions_anon_update_once" on review_sessions
  for update using (submitted_at is null) with check (true);
```
- `using (submitted_at is null)` gates which **existing rows** can be targeted.
- `with check (true)` places **no constraint whatsoever** on the **new row values**.
- Like C1, this is described as a "defense-in-depth backstop" for a step (`submit_review` setting `submitted_at`) that — being inside a `SECURITY DEFINER` function — doesn't need an anon UPDATE policy to function.

**Concrete exploits via direct `PATCH /rest/v1/review_sessions?id=eq.<S>`:**
1. **Set `submitted_at = now()` directly**, with no `reviews` row ever created. This silently desyncs the "already-reviewed" soft wall from reality and, combined with C1, lets an attacker create rows that the admin sees as a finished review while the *session itself* never went through `submit_review` — undermining any future logic that assumes `submitted_at IS NOT NULL ⟺ a `reviews` row exists ⟺ "real" data.
2. **Rewrite `table_id` to a different table's UUID** before/instead of submitting — attributing a review (created via C1) to a table the diner was never at. Combined with §3.7's burst-detection ("14 reviews between 9:47–10:02 PM... typical 4.1★ for this time") and §9.3's per-table rate limit, this lets an attacker **frame a specific table** for triggering burst-detection or exhausting its rate-limit budget, while their own scripted traffic is attributed elsewhere.
3. **Rewrite `time_spent_seconds` / `is_low_effort`** directly — e.g., set `is_low_effort = false` on a session that was actually a 1-second scripted submission, **defeating the one mechanism (§3.4 #5) meant to segregate exactly this kind of traffic from headline averages**.

**Risk:** Same family as C1 — an anon-writable column set with no value constraints, on the table that is the *anchor* for every other table's RLS checks (`reviews_anon_insert`/`dish_ratings_anon_insert` both key off `review_sessions.submitted_at`). Even after fixing C1, leaving this policy in place means an attacker can still corrupt `table_id` attribution and `is_low_effort` flags on real sessions.

**Fix:** Drop the policy entirely.
```sql
drop policy if exists "sessions_anon_update_once" on review_sessions;
-- review_sessions now has: anon INSERT (sessions_anon_insert), admin SELECT.
-- No UPDATE policy for anon or authenticated — submit_review's internal
-- UPDATE review_sessions SET submitted_at = ... bypasses RLS as SECURITY DEFINER.
```
If a *future* feature genuinely needs an anon-callable UPDATE on `review_sessions` (none currently do), scope `with check` to the **exact** columns/values intended, e.g. `with check (submitted_at is null and table_id = (select table_id from review_sessions where id = old.id))` style column-pinning — but as of this plan, no such feature exists, so the safest fix is removal.

---

### C3. Aggregate views (`dish_rating_summary`, `visit_rating_trend`) have no stated grants or `security_invoker`, and may be readable by `anon`/`authenticated` regardless of base-table RLS

**Section:** §5.2 (view DDL), §5.3 (RLS), §3.2 ("the diner-facing app... has no RLS-granted read access to any aggregate view").

**The problem:**
- §3.2 makes a strong, specific architectural claim: *"the public (anon) Supabase client used by the diner app has no RLS-granted read access to any aggregate view or the `reviews` table itself... the database refuses it."*
- But **views in Postgres run with the privileges of the view's owner by default**, not the querying role — and crucially, prior to `security_invoker = true` (PG15+, must be set explicitly), **RLS policies on the underlying tables are evaluated against the *view owner*, not the caller**. If `dish_rating_summary`/`visit_rating_trend` are created (as shown) without `security_invoker = true`, and the view owner is a role that bypasses RLS (e.g., the default migration-owning role often does, or at minimum has elevated read rights), the view can return real aggregate data **regardless of the caller's RLS-denied access to `reviews`/`review_dish_ratings`/`review_sessions`**.
- Separately — and independently of the `security_invoker` question — **is there a `GRANT SELECT` on these views to `anon`/`authenticated` at all?** The plan shows no `GRANT`/`REVOKE` statements for *any* object. In a default Supabase project, objects created in the `public` schema commonly inherit `GRANT` to `anon, authenticated` via `ALTER DEFAULT PRIVILEGES` set up by Supabase's bootstrap — meaning these views could be `SELECT`-able by the anon role **the moment they're created**, with RLS being the *only* thing standing between anon and their contents — and per the point above, RLS on a view without `security_invoker=true` may not even apply.

**Risk:** This is the single mechanism §3.2 calls out as the *architectural* (not just UI-level) guarantee of anti-anchoring — "a future feature can't accidentally leak this... the database refuses it." As specified, the database may not refuse it at all for these two views. If anon can `GET /rest/v1/dish_rating_summary`, the entire anti-anchoring design collapses: a diner (or anyone) can see `avg_rating`/`rating_count` per dish *before* rating it themselves.

**Fix:** Two independent fixes, both required:

1. **Pin `security_invoker = true`** on both views (PG15+, which current Supabase Postgres versions support) so RLS is evaluated against the *querying role*, not the view owner:
```sql
create or replace view dish_rating_summary
  with (security_invoker = true) as
select ... -- unchanged body
```
```sql
create or replace view visit_rating_trend
  with (security_invoker = true) as
select ... -- unchanged body
```
With `security_invoker = true`, anon querying these views hits the *same* "no SELECT policy on `reviews`/`review_dish_ratings`/`review_sessions`" wall as querying those tables directly — returning an empty result set, not real aggregates.

2. **Explicitly revoke from `anon`/`authenticated` and grant only to the role `is_admin()` checks against** (belt-and-suspenders, and makes the intent auditable instead of implicit):
```sql
revoke all on dish_rating_summary, visit_rating_trend from anon, authenticated;
grant select on dish_rating_summary, visit_rating_trend to authenticated;
-- `authenticated` + security_invoker=true means a logged-in non-admin authenticated
-- user would *still* get empty rows from the underlying RLS (no admin SELECT policy
-- matches them) -- but explicit grants make the access boundary self-documenting.
```

3. Add to Phase 1's verification step (currently: *"Verify with `list_tables`/a quick anon-key smoke test that anon truly cannot SELECT from `reviews`"*) — extend this to **explicitly include both views and the `submit_review`-bypass paths from C1/C2**, not just the base `reviews` table.

---

## HIGH findings

### H1. `submit_review` is all-or-nothing per dish — one stale/invalid `menu_item_id` discards the diner's *entire* review (overall rating included)

**Section:** §6.5.

**The problem:** The function body is a single implicit transaction. The per-dish INSERT:
```sql
insert into review_dish_ratings (session_id, review_id, menu_item_id, rating, dish_tags, comment)
select p_session_id, v_review_id,
       (d->>'menu_item_id')::uuid, ...
from jsonb_array_elements(p_dishes) d
where ...
```
relies on `menu_item_id uuid not null references menu_items(id) on delete restrict` and `check (rating between 1 and 5)`. If **any single element** of `p_dishes` has:
- a `menu_item_id` that no longer exists (e.g., the menu item was deactivated/re-seeded between the diner loading `/select` and submitting 90 seconds later — `is_active` items can be soft-disabled per §5.2, but the FK references `menu_items(id)` regardless of `is_active`, so this specifically requires a *deleted* row, which `on delete restrict` should prevent... but a re-seed/migration that drops and recreates rows with new UUIDs would do exactly this), or
- a `rating` outside 1–5 (shouldn't happen from the UI, but this function is reachable via direct `rpc()` call too), or
- a `dish_tags`/`visit_tags` value outside the allowed enum (`chk_dish_tags_valid`/`chk_visit_tags_valid`)

...the **entire function raises an exception, the transaction rolls back**, `v_review_id` and the `submitted_at` UPDATE are both discarded — and the diner's `overall_rating`, `visit_tags`, free-text comment, and **every other dish's valid rating** are lost along with the one bad entry.

**Risk:** Medium-frequency, high-frustration failure mode. A diner who carefully rated 4 dishes plus the overall visit gets a generic error because dish #3's `menu_item_id` happens to reference a row that was re-seeded that afternoon — and per §3.4/§6.5, **retrying re-sends the same payload with the same bad ID**, so retry doesn't help; the diner's only path is to abandon (zero rows persisted — directly contradicts the "data held in local state, not lost" framing in §2.2, since the *data* is held client-side but can never successfully reach the DB while the stale ID remains in the reducer state).

**Fix:** Validate and filter `p_dishes` against live, active `menu_items` **before** the insert, and skip (don't fail on) individually-invalid dish entries — only the *overall* rating/comment/tags should be hard requirements for the function to fail (since those have no external-reference risk beyond the enum CHECKs, which the client UI already constrains to valid values):

```sql
-- Filter to only menu_item_ids that currently exist, logging a count of dropped entries
-- (optional: return this count to the caller for telemetry, without failing the submission)
with valid_dishes as (
  select d
  from jsonb_array_elements(p_dishes) d
  join menu_items mi on mi.id = (d->>'menu_item_id')::uuid
  -- intentionally NOT filtering on is_active: a diner should still be able to rate
  -- a dish that was active when they ordered it even if since deactivated
)
insert into review_dish_ratings (session_id, review_id, menu_item_id, rating, dish_tags, comment)
select p_session_id, v_review_id,
       (d->>'menu_item_id')::uuid,
       (d->>'rating')::smallint,
       coalesce((select array_agg(x) from jsonb_array_elements_text(d->'dish_tags') x), '{}'),
       d->>'comment'
from valid_dishes d
where (d->>'rating') is not null or (d->'dish_tags' != '[]'::jsonb) or (d->>'comment') is not null;
```
For the `rating`/tag-enum CHECK violations specifically (which *shouldn't* happen from the real UI but are reachable via raw `rpc()`), either (a) accept the current all-or-nothing behavior for *malformed RPC calls* (reasonable — that's a client bug, not a real-diner scenario) but **wrap the per-dish insert in its own sub-transaction/exception handler** (`begin...exception when check_violation then` inside a loop) so a malformed entry from a buggy client doesn't take down an otherwise-valid submission, or (b) validate `rating between 1 and 5` and tag membership in `plpgsql` *before* the insert and silently drop offending fields (set to `null`/`'{}'`) rather than raising.

---

### H2. The documented per-table rate limit (§9.3 #2) does not exist in the `submit_review` SQL — and even if added, `table_id` is both anon-mutable (C2) and nullable

**Section:** §9.3 ("Per-table: ~20 inserts/hour soft cap via a Postgres function checked **inside `submit_review`**"), §6.5 (actual function body).

**The problem:**
- The `submit_review` body shown in §6.5 contains **zero** rate-limiting logic — no count query, no `rate_limited` exception path. §9.3's description of *where* this lives doesn't match the SQL that's supposed to be the authoritative implementation sketch.
- This means either (a) the rate limit doesn't exist yet and §9.3 is aspirational, or (b) it exists somewhere undocumented. Either way, as specified, **`submit_review` has no rate limit**, which — combined with C1 (an even-easier bypass path that skips `submit_review` altogether) — means **the only "per-table 20/hour" brake mentioned anywhere in the plan is currently not implemented at all**.
- *If/when* added, it would presumably be keyed on `review_sessions.table_id` (read via the session row, same as the `reviews.table_id` backfill). But:
  - Per C2, `table_id` is anon-mutable pre-submission (no constraint via `with check (true)`), so an attacker can pick *which* table's counter they increment.
  - `table_id uuid references restaurant_tables(id) on delete set null` — **nullable**. A session whose `table_id` is `NULL` (table deleted/deactivated mid-session, or never set) would either (a) be excluded from any `table_id = X` count entirely — meaning **NULL-table sessions get unlimited submissions**, or (b) need a separate `table_id IS NULL` bucket, which the plan doesn't address.

**Risk:** As things stand, there is **no implemented anti-brigading rate limit** for the primary documented threat model (§3.7 — "a competitor... submits many fast, low-effort, extreme reviews... from one or a few tables"). Even the *design* for one has a NULL-handling gap and depends on a column (C2) that's independently attacker-writable.

**Fix:**
1. Implement the counter inside `submit_review`, after the `already_submitted` check, **using the session's `table_id` read with the same row lock**, and treat `table_id IS NULL` as its own bounded bucket (or reject submission from sessions with no resolvable table — a session should always have a `table_id` if `POST /api/sessions` correctly resolves the `tableCode` route param):

```sql
declare
  v_table_id uuid;
  v_recent_count int;
begin
  select submitted_at is not null, table_id
    into v_already_submitted, v_table_id
    from review_sessions where id = p_session_id for update;

  if v_already_submitted is null then
    raise exception 'unknown_session';
  end if;
  if v_already_submitted then
    raise exception 'already_submitted';
  end if;

  if v_table_id is not null then
    select count(*) into v_recent_count
      from reviews
      where table_id = v_table_id
        and created_at > now() - interval '1 hour';

    if v_recent_count >= 20 then
      raise exception 'rate_limited';
    end if;
  end if;
  -- ... rest of function unchanged
```
2. Fix C2 first (remove `sessions_anon_update_once`) so `table_id` can only be set at session-creation time (`POST /api/sessions`, server-side, from the resolved `tableCode`) and is immutable thereafter — making this counter meaningful.
3. Add an index to support the counter query efficiently: `idx_reviews_table_time on reviews(table_id, created_at)` — **already exists** in §5.2, good, just confirm the rate-limit query uses it (it will, as written).

---

### H3. `submit_review` is `SECURITY DEFINER` with no pinned `search_path` — classic privilege-escalation surface

**Section:** §6.5.

**The problem:** The function is declared:
```sql
$$ language plpgsql security definer;
```
with no `set search_path = ...`. `SECURITY DEFINER` functions that don't pin `search_path` are a well-known Postgres footgun (and a standard finding from Supabase's `get_advisors` linter, which Phase 1 already runs — but the *sketch* in the plan should reflect the fix it expects advisors to flag, since "fix what advisors say" without the function being written defensively means a developer might suppress the warning instead of fixing it). An attacker who can create objects in a schema that appears earlier in the *default* search path (e.g., if `public` is writable by `authenticated` and a malicious function/table named to shadow an unqualified reference inside `submit_review` is created) could have `submit_review`'s unqualified table references resolve to attacker-controlled objects, executing with the function owner's elevated privileges.

**Risk:** Low likelihood in a single-tenant single-restaurant project with no self-serve schema-creation surface for non-admins — but it's a zero-cost fix and a guaranteed advisor finding, so it should be in the *plan's* SQL sketch, not discovered-and-patched during Phase 1.

**Fix:**
```sql
create or replace function submit_review(...)
returns uuid as $$
... unchanged body ...
$$ language plpgsql security definer
   set search_path = public, pg_temp;
```
Apply the same `set search_path` to `is_admin()` as well (also `security definer`, §5.3).

---

### H4. No server-side length/size caps on free-text fields or the `p_dishes` array — abusive-payload and stored-content risk

**Section:** §5.2 (`reviews.comment text`, `review_dish_ratings.comment text`), §6.5 (`p_dishes jsonb`), §7.4 (client-side "soft" 1000-char guidance only).

**The problem:**
- `comment text` on both `reviews` and `review_dish_ratings` has **no `check (char_length(comment) <= N)`** constraint. §7.4 explicitly describes the 1000-char counter as "soft guidance, not a hard limit."
- `p_dishes jsonb` has no array-length bound, and no per-element size bound on `d->>'comment'`.
- Combined with C1 (the unrestricted direct-insert path) or even just a modified `rpc()` call to `submit_review` (which anon *can* call, by design), this allows:
  - Multi-megabyte `comment` values stored per row — storage-cost and dashboard-rendering concerns (the "Recent Comments" widget, §2.3, would need to truncate defensively, which isn't mentioned).
  - A `p_dishes` array with hundreds/thousands of elements — even with H1's fix (filtering invalid `menu_item_id`s), a payload with 183 valid entries (one per real menu item, all with max-length comments) is a **large, slow `INSERT ... SELECT FROM jsonb_array_elements(...)`** that a script can fire repeatedly.

**Risk:** Storage/DoS-adjacent, and a precondition for H4's sibling concern below (XSS payload size isn't bounded either). Low-to-medium severity given the project's scale, but trivial to fix and currently entirely unbounded.

**Fix:**
```sql
alter table reviews
  add constraint chk_reviews_comment_length check (char_length(comment) <= 2000);

alter table review_dish_ratings
  add constraint chk_dish_ratings_comment_length check (char_length(comment) <= 2000);
```
And inside `submit_review`, before the per-dish insert, reject (or truncate via `left(..., 2000)`) oversized `p_overall_comment`/`d->>'comment'`, and cap `jsonb_array_length(p_dishes)` to a sane bound (e.g., `<= 50` — generously above the real 183-item menu's "a diner rates a handful of dishes" reality, but well below "every item on the menu twice"):
```sql
if jsonb_array_length(p_dishes) > 50 then
  raise exception 'too_many_dishes';
end if;
```

---

### H5. Free-text `comment` fields are stored raw with no documented sanitization or output-encoding policy for the admin dashboard — stored XSS risk in the only privileged session

**Section:** §5.2 (`comment text`, no sanitization mentioned), §2.3 ("RECENT COMMENTS... most recent 10"), §9.4 (admin is "the only privileged surface in the system").

**The problem:** The plan never states *how* `comment` is rendered in `/admin/dashboard`, `/admin/dishes/[id]`, or `/admin/integrity`. React/JSX auto-escapes `{comment}` interpolation by default, which would make this moot — but:
- The plan doesn't commit to this as a rule, and
- §11's enhancement list mentions Markdown-adjacent richness is *not* currently planned, but feature creep ("let admins format their export," "render comment with line breaks via `dangerouslySetInnerHTML`") is exactly the kind of change that gets bolted on later without re-deriving this guarantee.
- Given C1 (anyone can insert arbitrary `comment` text into `reviews`/`review_dish_ratings` with **zero authentication**), this field is fully attacker-controlled, unauthenticated, unsanitized input that flows directly into the **one authenticated, privileged surface** in the entire system.

**Risk:** If any future code path renders `comment` via `dangerouslySetInnerHTML`, an `<iframe>`/`<img onerror>`/`<script>`-bearing comment becomes stored XSS executing in the admin's session — which (per §9.4) holds the only JWT with write access to `admin_profiles`, moderation actions (once that ships), and export triggers. Even "just" reading `httpOnly` cookies isn't needed for impact: an XSS payload can call authenticated Supabase REST/RPC endpoints using the admin's ambient session to, e.g., trigger `/api/admin/export` and exfiltrate the response, or (post-moderation-UI) hide/restore arbitrary reviews.

**Fix:**
1. State explicitly in the plan (and enforce via lint/code-review checklist, alongside the existing service-role-key check in §9.4): **`comment` and all other diner-supplied free text is rendered exclusively via JSX text interpolation (`{comment}`), never `dangerouslySetInnerHTML`, never as Markdown/HTML.** If formatting (line breaks) is desired, use CSS `white-space: pre-wrap` on the escaped text node, not HTML injection.
2. Add a Content-Security-Policy header on `/admin/*` routes (e.g., via `next.config.js` headers or middleware) with a restrictive `script-src` (no `unsafe-inline`) as defense-in-depth against any future regression of (1).
3. Combine with H4's length cap — bounds the blast radius even if (1)/(2) are bypassed.
4. Fix C1 — removes the unauthenticated injection vector entirely, which is the actual root cause here. H5 is a *consequence* of C1; fixing C1 downgrades H5 to a standard "don't use `dangerouslySetInnerHTML`" hygiene item rather than an exploitable-today path.

---

## MEDIUM findings

### M1. `restaurant_tables` is fully enumerable by anon, and table codes are short/guessable — multiplies the (currently-nonexistent, H2) per-table rate limit by the table count

**Section:** §5.3 (`tables_public_read_active`), §6.4 (QR encoding: `{tableCode}` is a short human code like `t12`, `bar-3`).

**The problem:** `for select using (is_active = true or is_admin())` with **no column restriction** means `GET /rest/v1/restaurant_tables?select=*` returns **every active table's `id`, `code`, and `label`** to anyone holding the (public-by-design) anon key. Combined with H2 (per-table rate limit, once implemented, is ~20/hour *per table*), an attacker who enumerates ~30 tables via this single call can submit up to `30 × 20 = 600` reviews/hour distributed across all tables — the rate limit's purpose (bound *total* abuse) is defeated by simply spreading load across the now-trivially-discoverable table list. It also makes the "ask staff for a fresh code" error path (§4.2, for *invalid* codes) somewhat moot — an attacker never needs to guess; they can list.

**Risk:** Medium — doesn't expose review *content* (that's C1/C2/C3's domain), but undermines the *only* rate-limiting unit of measure once H2 is fixed, and is a free reconnaissance step for any of the other findings.

**Fix:** Restrict the anon-readable columns to only what `/r/[tableCode]` actually needs to resolve a *known* code — i.e., **the policy should only permit lookups by exact `code` match, not arbitrary enumeration**. RLS policies can't directly restrict to "only if queried with an equality filter," but the practical fix is:
1. Don't expose `restaurant_tables` to anon via the general PostgREST table endpoint at all. Instead, resolve `tableCode → table_id` via a `SECURITY DEFINER` RPC (`resolve_table_code(p_code text) returns table_id`, or returning just `{id, label}` for the one matching code) that does a single-row lookup — never a listable `SELECT *`.
```sql
create or replace function resolve_table_code(p_code text)
returns table (id uuid, label text, is_active boolean)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select id, label, is_active from restaurant_tables where code = p_code;
$$;

revoke all on restaurant_tables from anon, authenticated;
grant execute on function resolve_table_code(text) to anon;
```
2. `/r/[tableCode]` server component calls `supabase.rpc('resolve_table_code', { p_code: tableCode })` instead of a direct table `SELECT`. A non-existent code returns zero rows → the existing "this code isn't recognized" error path (§4.2) is unchanged.
3. Admin-side table management (`/admin/settings` or equivalent, for staff to see/manage the full table list) uses the **authenticated** client, gated by `is_admin()` — keep `tables_admin_write`/an admin-read policy for that surface only.

---

### M2. The "service window" (§3.4 #3) is described as a server-enforced 12-hour-rolling-visit concept, but no mechanism in §5/§6.5 implements anything beyond per-session uniqueness

**Section:** §3.4 #2–3.

**The problem:** §3.4 #2 says: *"`review_sessions` has one row per session with a `submitted_at` that, once set, is checked by the insert RLS policy — a session that has already submitted cannot insert again **for the same visit window**."* §3.4 #3 then defines the "service window" as a 12-hour rolling window "from first interaction," framed as something that "allows... two separate reviews (legitimately different experiences)."

But the actual mechanism (`submitted_at IS NOT NULL` on a *specific* `review_sessions.id`) only prevents **that one session row** from submitting twice — it has no concept of "12 hours," "table," or "visit" at all. A diner who clears cookies (or a script that mints a fresh `review_sessions` row each time, per C1) gets a **brand-new session with `submitted_at = NULL`**, fully eligible to submit, **regardless of how recently the same table/browser submitted**. The "12-hour window" is purely a **client-side cookie-expiry UX hint** (governing when the "already reviewed" *soft wall* stops showing) — it is not, as §3.4 #2's wording implies, enforced "at the database level" in any sense beyond per-session.

**Risk:** Medium — this is partly an *accepted* trade-off per §3.1 ("a sufficiently motivated person can submit multiple times by clearing cookies... we accept this"), so the *security* posture isn't worse than documented elsewhere. But §3.4 #2's specific claim — "this is enforced at the database level, not just in the Next.js API route, so it can't be bypassed by hitting the Supabase REST endpoint directly" — is **not true for the "service window"/"same visit" framing**, only for "this exact session row." A reader (or a future engineer extending the system) could reasonably believe a 12-hour/table-level enforcement exists in the DB when it doesn't.

**Fix:** Either (a) implement a real per-table-per-window check (e.g., `submit_review` additionally checks `select count(*) from reviews where table_id = v_table_id and created_at > now() - interval '12 hours'` and applies *some* differential policy — though this risks blocking legitimate large-party tables, which §3.4 #4's rate limit already handles more gracefully), or — more honestly — (b) **correct the prose in §3.4 #2–3** to state plainly: *"Per-session submission is enforced at the DB level (one row, one `submitted_at` transition). The 'service window' is a client-side cookie-expiry concept only, governing the soft-wall UX; it has no independent server-side enforcement, and is not a security boundary — see §3.1's accepted trade-off."* This is a documentation fix, but an important one: it prevents future work from assuming a guarantee that isn't there.

---

### M3. Route-transition focus management is unspecified for the 5-screen client-routed diner flow

**Section:** §10 (accessibility table), §6.1 (`/select` → `/rate/[dishIndex]` → `/overall` → `/thanks`, "client-routed").

**The problem:** §10 covers `aria-live="polite"` for the progress indicator and `aria-live="assertive"` for errors, plus a thorough non-color/contrast/keyboard treatment of the *rating control itself*. But the diner flow is a sequence of **client-side route changes** within a single-page-app-like shell (§6.1: "client-routed" per-dish screens). Nothing specifies where **focus** goes when the diner advances from `/rate/0` to `/rate/1`, or from `/select` to `/rate/0`, etc. Without explicit handling, a Next.js client-side route transition typically leaves focus on the now-unmounted "Next dish →" button (a "lost focus" state, where the screen reader doesn't announce the new screen at all) or resets to `<body>` (announces nothing useful).

**Risk:** For a VoiceOver/TalkBack user — the realistic device context per §4.4 — navigating a 4-6-screen flow with no focus cues means each new screen ("How was the *Wagyu Steak*?") may go **completely unannounced**, and the user has to manually explore from the top of the DOM to discover they're on a new dish. This directly undermines §10's otherwise-solid "each screen has a single `<h1>`" design — the `<h1>` exists, but nothing directs attention to it.

**Fix:** On each client-routed diner screen, move focus programmatically to the screen's `<h1>` (made focusable via `tabindex="-1"`) on mount:
```tsx
// shared across /select, /rate/[dishIndex], /overall, /thanks, /already-reviewed
const headingRef = useRef<HTMLHeadingElement>(null);
useEffect(() => {
  headingRef.current?.focus();
}, [/* route param that changes per screen, e.g. dishIndex */]);

return <h1 ref={headingRef} tabIndex={-1}>How was the {dishName}?</h1>;
```
This causes screen readers to announce the new heading text on each transition — combine with (not instead of) the existing `aria-live="polite"` progress announcement. Add this to §10's table as its own row ("Focus management on route transitions") and to Phase 6's "keyboard-only walkthrough" / screen-reader pass as an explicit check.

---

### M4. The "calibrated minimum duration" pattern (§7.6 #7) is not reconciled with `prefers-reduced-motion` (§10) — risk of a mystery freeze with no feedback

**Section:** §7.6 #7 ("even if the API responds in 100ms, the animation completes its ~600ms cycle"), §10 (motion-reduction row).

**The problem:** §10 says animations are removed/cross-faded under `prefers-reduced-motion: reduce`. §7.6 #7 describes a *separate* mechanism — an **artificial minimum-duration delay** applied to the submit action regardless of actual response time, justified as "paradoxically... feels more considered." These two mechanisms are never reconciled. If a reduced-motion user has the *animation* suppressed (per §10) but the *artificial delay* (per §7.6 #7) is untouched (since it's not framed as "motion," it's framed as timing), the result is: button is pressed → **nothing visibly changes for ~500ms** (no spinner, no animation, because those were correctly removed) → then the success screen appears. This is **worse** than either having the animation (which at least communicates "working") or not having the delay (instant transition).

**Risk:** Low-medium — purely a polish/UX-accessibility issue, not a security hole, but it's the kind of thing that ships invisibly (works fine for the 95% of users without reduced-motion enabled, who see the intended calm animation) and only manifests for the accessibility-sensitive cohort §10 is otherwise careful about.

**Fix:** Explicitly state the rule: **`prefers-reduced-motion: reduce` disables both the animation *and* the calibrated minimum-duration delay** — under reduced motion, transitions are instant and reflect actual response time (a `submit_review` p95 < 500ms per §12.3 means this is rarely even noticeable as "too fast"). One-line addition to §10's motion-reduction row: *"The calibrated minimum-duration pattern (7.6 #7) is itself considered an animation for this purpose and is skipped under reduced motion — transitions become immediate/response-time-bound."*

---

## LOW findings

### L1. `user_agent_hash` (SHA-256 of raw UA string) has near-zero discriminating entropy for common devices

**Section:** §5.2 (`review_sessions.user_agent_hash`), §9.1/§9.5.

Millions of iPhones on the same iOS/Safari build share an identical UA string, hence identical hash. The stated purpose ("coarse 'is this the same browser/device class re-submitting' signal") is honestly scoped as "coarse," and there's no PII concern (correctly hashed, raw UA discarded) — but as specified, this signal is so coarse it's close to a no-op for any popular device, and the integrity dashboard (§2.3/§3.7) shouldn't be designed to lean on it for anything beyond "extremely unusual/rare UA strings stand out." No fix required, but recommend a one-line caveat in §9.5 so a future reader doesn't over-trust this field: *"Note: for common mobile browsers, this hash is shared by a large population of devices and should not be treated as a meaningful per-device signal — its main value is flagging rare/unusual UA strings (e.g., obvious bot/script user-agents), not distinguishing one diner's phone from another's."*

### L2. Diner-side session cookie (`ws_review_session`) likely cannot be `httpOnly` given the client-reducer architecture — minor session-griefing vector

**Section:** §6.2 (cookie set at `POST /api/sessions` and again at `/thanks`), §6.5 (`sessionId` is read client-side and sent in the `/api/reviews` POST body), §9.4 (only *admin* cookies are explicitly specified as `httpOnly`).

If `ws_review_session` must be readable by client JS (to populate `sessionId` in the reducer's submit payload), it can't be `httpOnly`. This means any other script with page access (a future analytics/tag-manager snippet, or an XSS in the *diner-facing* app — lower-stakes than admin XSS but still relevant) can read a diner's session ID and call `submit_review`/`POST /api/reviews` *as that session* before the real diner finishes, consuming their one-shot submission ("session griefing" — the real diner then sees `already_submitted` and a graceful-but-confusing error). Low severity (no PII, narrow blast radius — one diner's one review), but worth a one-line acknowledgment in §9.1 alongside the other accepted anonymity trade-offs, and a recommendation that **no third-party scripts/tags are loaded on `/r/*` routes** (which is already implied by "no upsell, no ads" in §2.2, but for a different reason — worth cross-referencing).

### L3. Burst-detection (§3.7) computation cost is unspecified — fine at current scale, but should be designed as pre-aggregated rather than recomputed-per-pageview from the start

**Section:** §3.7, §2.3 (`/admin/integrity`).

"A rolling computation flags any 30-minute window where review volume exceeds 3x the trailing 7-day average for that hour-of-day" — if implemented as a live query over 7 days of raw `reviews` rows every time `/admin/integrity` loads, it's a non-issue at this restaurant's volume (hundreds of reviews total) but is exactly the kind of query that becomes a slow dashboard load if the system is ever reused for a multi-location rollout. Recommend: implement as a materialized view refreshed on a schedule (pg_cron, e.g., every 15 min) rather than a live aggregate, even though it's not *necessary* at MVP scale — cheap to do right the first time, annoying to retrofit. No action required before launch; flag for Phase 4 implementation notes.

### L4. Sentiment-analysis Edge Function's relationship to the `submit_review` transaction (sync vs. async) is left ambiguous

**Section:** §3.6 ("triggered asynchronously (via a Postgres trigger → `pg_net` webhook, **or** a lightweight queue table polled by a scheduled function)").

The "or" here matters for the `submit_review` p95 < 500ms goal (§12.3): if implemented as a synchronous trigger that waits on an HTTP call to the Edge Function, it directly adds to the transaction's latency and failure surface (an Edge Function timeout/error inside a trigger could fail the entire `submit_review` transaction — reintroducing an H1-style all-or-nothing risk, this time for an *informational* feature). `pg_net` webhooks are fire-and-forget by design (good), but the plan should **commit to `pg_net` async dispatch (not a synchronous trigger)** explicitly, so Phase 4 doesn't accidentally implement the blocking variant. One-line fix to §3.6: *"The trigger dispatches via `pg_net.http_post` (async, fire-and-forget) — `submit_review`'s transaction does not wait on or depend on the sentiment Edge Function's response or success."*

---

## Must fix before build

1. **C1** — Drop `reviews_anon_insert` and `dish_ratings_anon_insert` policies (complete unrestricted alternative write path).
2. **C2** — Drop `sessions_anon_update_once` policy (anon-writable `submitted_at`/`table_id`/`is_low_effort` with no value constraints).
3. **C3** — Add `security_invoker = true` to `dish_rating_summary` and `visit_rating_trend`, and explicitly `revoke`/`grant` their SELECT privileges (verify §3.2's "database refuses it" claim is actually true for views, not just base tables).
4. **H1** — Make per-dish validation in `submit_review` non-fatal to the overall submission (filter invalid `menu_item_id`s rather than rolling back everything).
5. **H2** — Implement the per-table rate limit *inside* `submit_review` as documented in §9.3 (it currently doesn't exist in the SQL), with explicit `table_id IS NULL` handling — and sequence this *after* fixing C2, since the limit's key (`table_id`) is currently attacker-writable.
6. **H3** — Pin `set search_path = public, pg_temp` on `submit_review` and `is_admin()`.
7. **H4/H5** — Add `char_length` CHECK constraints on all `comment` columns and a `p_dishes` array-size cap; explicitly document the no-`dangerouslySetInnerHTML` rule for admin-rendered free text (as a Phase 6 checklist item alongside the existing service-role-key check).
8. **M1** — Replace the listable `restaurant_tables` anon SELECT policy with a single-row `resolve_table_code()` RPC; revoke direct table access from anon.
9. Re-run Phase 1's RLS verification step against the *fixed* schema, explicitly including: direct `POST`/`PATCH` to `reviews`, `review_dish_ratings`, and `review_sessions` from the anon key (not just `SELECT` on `reviews`), and `SELECT` on both aggregate views.

## Verdict

The diner-facing UX, integrity philosophy, and accessibility scaffolding are thoughtful and largely sound — but the RLS layer as written doesn't deliver the database-enforced guarantees §3.2/§3.5/§9.2 claim it does, because the "defense-in-depth" anon write/update policies on `reviews`, `review_dish_ratings`, and `review_sessions` are each independently a complete bypass of `submit_review`, rate-limiting, and the honeypot/low-effort flagging — **fix C1–C3 (all one-line policy drops/additions) before writing a single line of application code**, and the rest of the plan is a reasonable MVP foundation.
