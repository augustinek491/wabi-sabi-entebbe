-- Wabi-Sabi review system — schema, RLS, RPCs
-- Addendum §A compliant: anon has NO direct DML and NO aggregate reads;
-- all writes go through SECURITY DEFINER RPCs; views are security_invoker.
-- search_path='' on all definer functions (objects schema-qualified).

-- ============================================================ MENU (public read)
create table public.menu_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  sort_order  int  not null default 0
);

create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.menu_categories(id) on delete cascade,
  name          text not null,
  description   text,
  price_display text,
  variants      jsonb not null default '[]'::jsonb,
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  unique (category_id, name)
);
create index menu_items_category_idx on public.menu_items (category_id);

-- ============================================================ TABLES (RPC-resolved only)
create table public.restaurant_tables (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,          -- opaque, non-enumerable
  label      text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================ SESSIONS (anonymity boundary)
create table public.review_sessions (
  id                 uuid primary key default gen_random_uuid(),
  table_id           uuid references public.restaurant_tables(id) on delete set null,
  created_at         timestamptz not null default now(),
  submitted_at       timestamptz,
  time_spent_seconds int,
  is_low_effort      boolean not null default false   -- FLAG ONLY, never excluded (Addendum B1)
);
create index review_sessions_table_idx on public.review_sessions (table_id, created_at);

-- ============================================================ REVIEWS (overall visit)
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null unique references public.review_sessions(id) on delete cascade,
  overall_rating int  not null check (overall_rating between 1 and 5),
  comment        text check (char_length(comment) <= 600),
  created_at     timestamptz not null default now()
);
create index reviews_created_idx on public.reviews (created_at);

-- ============================================================ PER-DISH RATINGS
create table public.review_dish_ratings (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.review_sessions(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  variant      text,
  rating       int  not null check (rating between 1 and 5),
  tags         text[] not null default '{}',
  comment      text check (char_length(comment) <= 600),
  created_at   timestamptz not null default now(),
  unique (session_id, menu_item_id)               -- one rating per dish per session
);
create index review_dish_item_idx on public.review_dish_ratings (menu_item_id);

-- ============================================================ MODERATION (append-only audit)
create table public.moderation_log (
  id                uuid primary key default gen_random_uuid(),
  actor             text not null,
  action            text not null,
  reason            text,
  target_session_id uuid,
  created_at        timestamptz not null default now()
);

-- ============================================================ AGGREGATE VIEWS (security_invoker)
create view public.dish_rating_summary with (security_invoker = true) as
  select mi.id as menu_item_id, mi.name, mi.category_id,
         count(dr.id)::int as review_count,
         round(avg(dr.rating)::numeric, 2) as avg_rating
  from public.menu_items mi
  left join public.review_dish_ratings dr on dr.menu_item_id = mi.id
  group by mi.id, mi.name, mi.category_id;

create view public.visit_rating_trend with (security_invoker = true) as
  select date_trunc('day', r.created_at) as day,
         count(*)::int as review_count,
         round(avg(r.overall_rating)::numeric, 2) as avg_overall
  from public.reviews r
  group by 1 order by 1;

-- ============================================================ RLS
alter table public.menu_categories    enable row level security;
alter table public.menu_items         enable row level security;
alter table public.restaurant_tables  enable row level security;
alter table public.review_sessions    enable row level security;
alter table public.reviews            enable row level security;
alter table public.review_dish_ratings enable row level security;
alter table public.moderation_log     enable row level security;

-- Menu is public-readable; everything else has NO anon policy (default deny).
create policy menu_categories_read on public.menu_categories for select to anon, authenticated using (true);
create policy menu_items_read      on public.menu_items      for select to anon, authenticated using (is_active);

-- Admin (future authenticated role) read access. Service-role bypasses RLS today.
create policy tables_admin_read   on public.restaurant_tables   for select to authenticated using (true);
create policy sessions_admin_read on public.review_sessions     for select to authenticated using (true);
create policy reviews_admin_read  on public.reviews             for select to authenticated using (true);
create policy dish_admin_read     on public.review_dish_ratings for select to authenticated using (true);
create policy modlog_admin_read   on public.moderation_log      for select to authenticated using (true);

-- ============================================================ GRANTS (tighten anon)
revoke all on public.review_sessions, public.reviews, public.review_dish_ratings,
              public.restaurant_tables, public.moderation_log from anon;
revoke all on public.dish_rating_summary, public.visit_rating_trend from anon;
grant  select on public.menu_categories, public.menu_items to anon, authenticated;
grant  select on public.dish_rating_summary, public.visit_rating_trend to authenticated;

-- ============================================================ RPCs (SECURITY DEFINER)
-- Resolve a table code -> table label + full menu (so restaurant_tables is never anon-selectable)
create or replace function public.get_table_context(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_table public.restaurant_tables%rowtype; v_menu jsonb;
begin
  select * into v_table from public.restaurant_tables where code = p_code and is_active = true;
  if not found then return null; end if;
  select jsonb_agg(c order by c.sort_order) into v_menu from (
    select cat.id, cat.slug, cat.name, cat.sort_order,
      coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'name', i.name, 'description', i.description,
        'price_display', i.price_display, 'variants', i.variants
      ) order by i.sort_order) filter (where i.id is not null), '[]'::jsonb) as items
    from public.menu_categories cat
    left join public.menu_items i on i.category_id = cat.id and i.is_active
    group by cat.id, cat.slug, cat.name, cat.sort_order
  ) c;
  return jsonb_build_object(
    'table', jsonb_build_object('id', v_table.id, 'label', v_table.label),
    'menu', coalesce(v_menu, '[]'::jsonb)
  );
end; $$;

-- Start an anonymous session for a table; returns the session id
create or replace function public.start_session(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_table_id uuid; v_session_id uuid;
begin
  select id into v_table_id from public.restaurant_tables where code = p_code and is_active = true;
  if v_table_id is null then raise exception 'invalid_table'; end if;
  insert into public.review_sessions (table_id) values (v_table_id) returning id into v_session_id;
  return v_session_id;
end; $$;

-- Atomic submit. Per-dish validation is NON-FATAL (Addendum A4): bad rows are skipped & returned,
-- the overall review + valid dish ratings still persist. Idempotent (rejects re-submit).
create or replace function public.submit_review(
  p_session_id uuid, p_overall int, p_comment text, p_time_spent int, p_dishes jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.review_sessions%rowtype;
  v_dish jsonb; v_item_id uuid;
  v_skipped jsonb := '[]'::jsonb; v_inserted int := 0;
  v_comment text := nullif(left(coalesce(p_comment,''), 600), '');
  v_low_effort boolean;
begin
  select * into v_session from public.review_sessions where id = p_session_id;
  if not found then raise exception 'invalid_session'; end if;
  if v_session.submitted_at is not null then raise exception 'already_submitted'; end if;
  if p_overall is null or p_overall < 1 or p_overall > 5 then raise exception 'invalid_overall'; end if;

  insert into public.reviews (session_id, overall_rating, comment)
  values (p_session_id, p_overall, v_comment);

  if p_dishes is not null then
    for v_dish in select * from jsonb_array_elements(p_dishes) loop
      begin v_item_id := (v_dish->>'menu_item_id')::uuid; exception when others then v_item_id := null; end;
      if v_item_id is null
         or not exists (select 1 from public.menu_items mi where mi.id = v_item_id and mi.is_active)
         or (v_dish->>'rating') is null
         or (v_dish->>'rating')::int < 1 or (v_dish->>'rating')::int > 5 then
        v_skipped := v_skipped || jsonb_build_object('menu_item_id', v_dish->>'menu_item_id', 'reason', 'invalid_or_inactive');
        continue;
      end if;
      insert into public.review_dish_ratings (session_id, menu_item_id, variant, rating, tags, comment)
      values (p_session_id, v_item_id, v_dish->>'variant', (v_dish->>'rating')::int,
              coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(v_dish->'tags','[]'::jsonb))), '{}'),
              nullif(left(coalesce(v_dish->>'comment',''),600),''))
      on conflict (session_id, menu_item_id) do nothing;
      v_inserted := v_inserted + 1;
    end loop;
  end if;

  v_low_effort := coalesce(p_time_spent,0) < 5 and v_comment is null;   -- flag only
  update public.review_sessions
     set submitted_at = now(), time_spent_seconds = p_time_spent, is_low_effort = v_low_effort
   where id = p_session_id;

  return jsonb_build_object('ok', true, 'inserted', v_inserted, 'skipped', v_skipped);
end; $$;

-- Functions: anon may EXECUTE only these three; nothing else.
revoke all on function public.get_table_context(text)                         from public;
revoke all on function public.start_session(text)                             from public;
revoke all on function public.submit_review(uuid,int,text,int,jsonb)          from public;
grant execute on function public.get_table_context(text)                to anon, authenticated;
grant execute on function public.start_session(text)                    to anon, authenticated;
grant execute on function public.submit_review(uuid,int,text,int,jsonb) to anon, authenticated;

-- ============================================================ SEED: sample tables (opaque codes)
insert into public.restaurant_tables (code, label)
select substr(replace(gen_random_uuid()::text,'-',''),1,12), 'Table ' || g
from generate_series(1,12) g;
