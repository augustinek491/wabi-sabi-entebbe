/**
 * Menu helpers — Wabi-Sabi Entebbe diner review flow.
 *
 * Normalizes the `get_table_context(...).menu` shape (raw `jsonb`) into the
 * typed `DinerMenuCategory[]` / `DinerMenuItem[]` used by `src/lib/diner` and
 * `src/components/diner`, and provides search/flatten helpers for the "what
 * did you have?" screen (PLAN §4.2 — search + category browse, never forced
 * scrolling of all 183 items).
 */

import type { DinerMenuCategory, DinerMenuItem, MenuItemVariant, TableContextResult } from "./types";

/**
 * `menu_items.variants` is `jsonb`, default `[]`, with no DB-enforced inner
 * shape documented beyond "variants[]" (PLAN-ADDENDUM §C2). Accept either:
 *   - an array of plain strings, e.g. ["Veg", "Chicken", "Pork"]
 *   - an array of objects, e.g. [{ "label": "Chicken", "price_display": "45,000" }]
 * and normalize both to `MenuItemVariant[]`. Anything else (null, malformed)
 * becomes `[]` — a single-variant item, which is the safe default.
 */
function normalizeVariants(raw: unknown): MenuItemVariant[] {
  if (!Array.isArray(raw)) return [];

  const out: MenuItemVariant[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const label = entry.trim();
      if (label) out.push({ label });
    } else if (entry && typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      const label =
        typeof obj.label === "string"
          ? obj.label
          : typeof obj.name === "string"
            ? obj.name
            : null;
      if (label && label.trim()) {
        const priceDisplay =
          typeof obj.price_display === "string"
            ? obj.price_display
            : typeof obj.priceDisplay === "string"
              ? obj.priceDisplay
              : null;
        out.push({ label: label.trim(), priceDisplay });
      }
    }
  }
  return out;
}

/**
 * Parse the raw `jsonb` result of `get_table_context(p_code)` into typed
 * `TableContextResult`. Returns `null` for `null`/invalid input (the RPC
 * returns `null` for an unrecognized/inactive table code).
 */
export function parseTableContext(raw: unknown): TableContextResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const tableRaw = obj.table as Record<string, unknown> | undefined;
  if (!tableRaw || typeof tableRaw.id !== "string" || typeof tableRaw.label !== "string") {
    return null;
  }

  const menuRaw = Array.isArray(obj.menu) ? obj.menu : [];
  const menu: DinerMenuCategory[] = menuRaw.map((catRaw) => {
    const cat = catRaw as Record<string, unknown>;
    const itemsRaw = Array.isArray(cat.items) ? cat.items : [];
    const items: DinerMenuItem[] = itemsRaw.map((itemRaw) => {
      const item = itemRaw as Record<string, unknown>;
      return {
        id: String(item.id),
        name: typeof item.name === "string" ? item.name : "",
        description: typeof item.description === "string" ? item.description : null,
        priceDisplay: typeof item.price_display === "string" ? item.price_display : null,
        variants: normalizeVariants(item.variants),
      };
    });

    return {
      id: typeof cat.id === "string" ? cat.id : String(cat.id ?? ""),
      slug: typeof cat.slug === "string" ? cat.slug : "",
      name: typeof cat.name === "string" ? cat.name : "",
      sortOrder: typeof cat.sort_order === "number" ? cat.sort_order : 0,
      items,
    };
  });

  return {
    table: { id: String(tableRaw.id), label: tableRaw.label },
    menu,
  };
}

/** A menu item flattened with its parent category — used for search results and selection lookups. */
export interface FlatMenuItem extends DinerMenuItem {
  categoryId: string;
  categoryName: string;
}

/** Flatten all categories' items into a single list, each tagged with its category name. */
export function flattenMenu(menu: DinerMenuCategory[]): FlatMenuItem[] {
  const out: FlatMenuItem[] = [];
  for (const category of menu) {
    for (const item of category.items) {
      out.push({ ...item, categoryId: category.id, categoryName: category.name });
    }
  }
  return out;
}

/**
 * Case-insensitive substring search across item name + description.
 * Returns items in their original menu order. Empty/whitespace query
 * returns an empty array (the caller should fall back to category browse —
 * PLAN §4.2 "search never fully replaces category browse").
 */
export function searchMenuItems(items: FlatMenuItem[], query: string): FlatMenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((item) => {
    const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}

/** Total item count across all categories — used for the "browse N dishes" framing copy. */
export function countMenuItems(menu: DinerMenuCategory[]): number {
  return menu.reduce((sum, cat) => sum + cat.items.length, 0);
}
