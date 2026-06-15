// Seeds menu_categories + menu_items from ../../sample-menu/menu.json
// Run from review-system/:  node --env-file=.env.local scripts/seed-menu.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local)');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const __dirname = dirname(fileURLToPath(import.meta.url));
const menu = JSON.parse(readFileSync(resolve(__dirname, '../../sample-menu/menu.json'), 'utf8'));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const categories = menu.categories ?? [];
let catCount = 0, itemCount = 0;

for (let ci = 0; ci < categories.length; ci++) {
  const c = categories[ci];
  const { data: cat, error: cErr } = await supabase
    .from('menu_categories')
    .upsert({ slug: slugify(c.name), name: c.name, sort_order: ci }, { onConflict: 'slug' })
    .select('id')
    .single();
  if (cErr) { console.error(`category "${c.name}":`, cErr.message); process.exit(1); }
  catCount++;

  const rows = (c.items ?? []).map((it, ii) => ({
    category_id: cat.id,
    name: it.name,
    description: it.description ?? null,
    price_display: it.price != null ? String(it.price) : null,
    variants: Array.isArray(it.variants) ? it.variants : [],
    sort_order: ii,
    is_active: true,
  }));
  if (rows.length) {
    const { error: iErr } = await supabase
      .from('menu_items')
      .upsert(rows, { onConflict: 'category_id,name' });
    if (iErr) { console.error(`items in "${c.name}":`, iErr.message); process.exit(1); }
    itemCount += rows.length;
  }
}
console.log(`Seeded ${catCount} categories, ${itemCount} items.`);
