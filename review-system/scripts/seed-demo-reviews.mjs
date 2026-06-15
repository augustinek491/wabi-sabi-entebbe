// Generates synthetic demo reviews via the public RPC path (anon key) — exactly as a real
// diner would — then verifies with the service-role key. Weighted so a few dishes cross N>=5
// (appear in rankings) while others stay below (exercise the min-N gate).
// Run from review-system/:  node --env-file=.env.local scripts/seed-demo-reviews.mjs
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !ANON || !SR) { console.error('Missing env (URL / ANON / SERVICE_ROLE)'); process.exit(1); }

const anonH = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };
const srH = { apikey: SR, Authorization: `Bearer ${SR}` };
const rpc = async (fn, args) => {
  const r = await fetch(`${U}/rest/v1/rpc/${fn}`, { method: 'POST', headers: anonH, body: JSON.stringify(args) });
  return { status: r.status, body: await r.text() };
};
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const TAGS = ['taste', 'portion', 'value', 'presentation'];
const COMMENTS = ['Beautifully plated.', 'A little salty for me.', 'Loved the texture.', 'Came out a bit cold.',
  'Best sushi in Entebbe.', 'Generous portion.', 'Would order again.', '', '', ''];

// 1. Pull the real menu via the diner RPC
const ctx = JSON.parse((await rpc('get_table_context', { p_code: 'DEMO' })).body);
const items = (ctx.menu || []).flatMap(c => (c.items || []).map(i => ({ id: i.id, name: i.name })));
if (items.length < 8) { console.error('Not enough menu items seeded:', items.length); process.exit(1); }
const hot = items.slice(0, 3);   // these will get many reviews (>=5)
const mid = items.slice(3, 8);   // these get few (<5)
console.log('Hot dishes (target N>=5):', hot.map(d => d.name).join(', '));

// 2. Simulate ~12 anonymous sessions
let sessions = 0, dishRatings = 0;
for (let s = 0; s < 12; s++) {
  const sid = JSON.parse((await rpc('start_session', { p_code: 'DEMO' })).body);
  const picks = [];
  hot.forEach(d => { if (Math.random() < 0.8) picks.push(d); });      // hot dishes appear often
  mid.forEach(d => { if (Math.random() < 0.25) picks.push(d); });     // mid dishes rarely
  if (picks.length === 0) picks.push(rnd(hot));
  const dishes = picks.map(d => ({
    menu_item_id: d.id, variant: null,
    rating: rnd([5, 5, 4, 4, 4, 3, 3, 2]),
    tags: TAGS.filter(() => Math.random() < 0.4),
    comment: rnd(COMMENTS) || null,
  }));
  const res = await rpc('submit_review', {
    p_session_id: sid, p_overall: rnd([5, 5, 4, 4, 4, 3, 2]),
    p_comment: rnd(COMMENTS) || null, p_time_spent: rnd([18, 35, 52, 70, 95, 120, 3]),
    p_dishes: dishes,
  });
  const parsed = JSON.parse(res.body);
  if (!parsed.ok) { console.error('submit failed:', res.body); process.exit(1); }
  sessions++; dishRatings += parsed.inserted;
}
console.log(`Submitted ${sessions} sessions, ${dishRatings} dish ratings.`);

// 3. Verify with service-role (bypasses RLS)
const count = async (t) => {
  const r = await fetch(`${U}/rest/v1/${t}?select=*&limit=1`, { headers: { ...srH, Prefer: 'count=exact' } });
  return r.headers.get('content-range')?.split('/')[1];
};
console.log('\nVERIFY (service-role):');
console.log('  reviews            =', await count('reviews'));
console.log('  review_sessions    =', await count('review_sessions'));
console.log('  review_dish_ratings=', await count('review_dish_ratings'));
const ids = hot.map(d => d.id).join(',');
const summ = await (await fetch(`${U}/rest/v1/dish_rating_summary?select=name,review_count,avg_rating&menu_item_id=in.(${ids})`, { headers: srH })).json();
console.log('\nHot-dish aggregates (should show N>=5):');
summ.forEach(d => console.log(`  ${d.name.padEnd(34)} n=${d.review_count}  avg=${d.avg_rating}`));
