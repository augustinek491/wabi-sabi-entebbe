"use client";

import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import { Card, Button } from "@/components/ui";
import { flattenMenu, searchMenuItems, type FlatMenuItem } from "@/lib/diner/menu";
import { formatPriceDisplay } from "@/lib/format";
import type { DinerMenuCategory, MenuItemVariant } from "@/lib/diner/types";
import type { DraftDishEntry } from "@/lib/diner/types";

export interface DishSelectorProps {
  menu: DinerMenuCategory[];
  /** Currently-selected dishes (with chosen variant), keyed by `${menuItemId}::${variant ?? ""}`. */
  selected: DraftDishEntry[];
  onAdd: (item: FlatMenuItem, variant: MenuItemVariant | null) => void;
  onRemove: (menuItemId: string, variant: string | null) => void;
}

function selectionKey(menuItemId: string, variant: string | null): string {
  return `${menuItemId}::${variant ?? ""}`;
}

/**
 * DishSelector — "What did you have?" (PLAN §2.2 DISH SELECTION,
 * PLAN-ADDENDUM §C1/§C2).
 *
 * - Search box at top (filters by name/description, case-insensitive).
 * - Category browse below as a collapsible accordion (16 categories) — the
 *   diner never has to scroll all 183 items to find their dishes (C1).
 * - Multi-variant items (PLAN-ADDENDUM §C2) expand an inline variant picker
 *   when tapped; the chosen variant becomes part of the selection key, so
 *   "Thai Green Curry (Chicken)" and "Thai Green Curry (Veg)" are tracked as
 *   distinct selections if both were ordered at the table.
 * - Selected items render as a small "what you've picked" summary strip
 *   (sunken card) so the diner can see/remove their picks without losing
 *   their place in the menu.
 * - No aggregate/rating data is shown anywhere on this screen (PLAN §3.2).
 */
export function DishSelector({ menu, selected, onAdd, onRemove }: DishSelectorProps) {
  const [query, setQuery] = useState("");
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(menu[0]?.id ?? null);
  const [openVariantItemId, setOpenVariantItemId] = useState<string | null>(null);
  const searchId = useId();

  const flatItems = useMemo(() => flattenMenu(menu), [menu]);
  const searchResults = useMemo(() => searchMenuItems(flatItems, query), [flatItems, query]);
  const isSearching = query.trim().length > 0;

  const selectedKeys = useMemo(
    () => new Set(selected.map((d) => selectionKey(d.menuItemId, d.variant))),
    [selected]
  );

  const isItemFullySelected = (item: FlatMenuItem): boolean => {
    if (item.variants.length === 0) return selectedKeys.has(selectionKey(item.id, null));
    // For multi-variant items, "fully selected" means every variant has been picked.
    return item.variants.every((v) => selectedKeys.has(selectionKey(item.id, v.label)));
  };

  const handleItemTap = (item: FlatMenuItem) => {
    if (item.variants.length > 0) {
      setOpenVariantItemId((current) => (current === item.id ? null : item.id));
      return;
    }
    const key = selectionKey(item.id, null);
    if (selectedKeys.has(key)) {
      onRemove(item.id, null);
    } else {
      onAdd(item, null);
    }
  };

  const handleVariantTap = (item: FlatMenuItem, variant: MenuItemVariant) => {
    const key = selectionKey(item.id, variant.label);
    if (selectedKeys.has(key)) {
      onRemove(item.id, variant.label);
    } else {
      onAdd(item, variant);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Selected-dish summary strip */}
      {selected.length > 0 ? (
        <Card tone="sunken" className="flex flex-col gap-3 p-4">
          <p className="ws-eyebrow text-xs">
            {selected.length} {selected.length === 1 ? "dish" : "dishes"} selected
          </p>
          <ul className="flex flex-col gap-2">
            {selected.map((dish) => (
              <li
                key={selectionKey(dish.menuItemId, dish.variant)}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-ink">
                  {dish.name}
                  {dish.variant ? (
                    <span className="text-ink-subtle"> · {dish.variant}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(dish.menuItemId, dish.variant)}
                  className="min-h-[44px] min-w-[44px] rounded-md px-2 text-sm text-ink-subtle underline-offset-4 transition-colors duration-200 ease-calm hover:text-ink hover:underline"
                  aria-label={`Remove ${dish.name}${dish.variant ? ` (${dish.variant})` : ""} from your selection`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Search */}
      <div className="flex flex-col gap-2">
        <label htmlFor={searchId} className="text-sm font-medium text-ink">
          Search the menu
        </label>
        <input
          id={searchId}
          type="search"
          inputMode="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. salmon, curry, miso…"
          className="min-h-[44px] rounded-md border-[1.5px] border-interactive-border bg-surface px-4 text-base text-ink placeholder:text-ink-subtle transition-colors duration-200 ease-calm focus:border-focus focus-visible:outline-none"
        />
      </div>

      {isSearching ? (
        <SearchResults
          results={searchResults}
          query={query}
          selectedKeys={selectedKeys}
          openVariantItemId={openVariantItemId}
          onItemTap={handleItemTap}
          onVariantTap={handleVariantTap}
          isItemFullySelected={isItemFullySelected}
        />
      ) : (
        <CategoryAccordion
          menu={menu}
          openCategoryId={openCategoryId}
          onToggleCategory={(id) => setOpenCategoryId((current) => (current === id ? null : id))}
          selectedKeys={selectedKeys}
          openVariantItemId={openVariantItemId}
          onItemTap={handleItemTap}
          onVariantTap={handleVariantTap}
          isItemFullySelected={isItemFullySelected}
        />
      )}
    </div>
  );
}

interface ItemRowProps {
  item: FlatMenuItem;
  isFullySelected: boolean;
  isVariantPickerOpen: boolean;
  selectedKeys: Set<string>;
  onItemTap: (item: FlatMenuItem) => void;
  onVariantTap: (item: FlatMenuItem, variant: MenuItemVariant) => void;
}

function MenuItemRow({
  item,
  isFullySelected,
  isVariantPickerOpen,
  selectedKeys,
  onItemTap,
  onVariantTap,
}: ItemRowProps) {
  const hasVariants = item.variants.length > 0;

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onItemTap(item)}
        aria-pressed={!hasVariants ? isFullySelected : undefined}
        aria-expanded={hasVariants ? isVariantPickerOpen : undefined}
        className={clsx(
          "flex w-full min-h-[44px] items-start justify-between gap-4 py-3 text-left",
          "transition-colors duration-200 ease-calm"
        )}
      >
        <span className="flex flex-col gap-0.5">
          <span className={clsx("text-base", isFullySelected ? "text-ink" : "text-ink")}>
            {item.name}
          </span>
          {item.description ? (
            <span className="text-sm text-ink-subtle">{item.description}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {item.priceDisplay ? (
            <span className="text-sm text-ink-subtle">
              {formatPriceDisplay(item.priceDisplay)}
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ease-calm",
              isFullySelected
                ? "border-transparent bg-gradient-brass"
                : "border-interactive-border bg-transparent"
            )}
          >
            {isFullySelected ? (
              <span className="block h-1.5 w-1.5 rounded-full bg-on-primary/70" />
            ) : hasVariants ? (
              <span className="text-xs text-ink-subtle">{isVariantPickerOpen ? "−" : "+"}</span>
            ) : null}
          </span>
        </span>
      </button>

      {hasVariants && isVariantPickerOpen ? (
        <div className="flex flex-wrap gap-2 pb-3" role="group" aria-label={`Choose a variant of ${item.name}`}>
          {item.variants.map((variant) => {
            const key = `${item.id}::${variant.label}`;
            const selected = selectedKeys.has(key);
            return (
              <button
                key={variant.label}
                type="button"
                aria-pressed={selected}
                onClick={() => onVariantTap(item, variant)}
                className={clsx(
                  "inline-flex min-h-[44px] items-center gap-2 rounded-pill px-4 py-2 text-sm transition-[background,border-color] duration-200 ease-calm",
                  selected
                    ? "border-[1.5px] border-sumi-900 bg-surface-sunken text-ink"
                    : "border-[1.5px] border-interactive-border bg-transparent text-ink"
                )}
              >
                {selected ? (
                  <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full bg-sumi-900" />
                ) : null}
                {variant.label}
                {variant.priceDisplay ? (
                  <span className="text-ink-subtle">{formatPriceDisplay(variant.priceDisplay)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}

interface SearchResultsProps {
  results: FlatMenuItem[];
  query: string;
  selectedKeys: Set<string>;
  openVariantItemId: string | null;
  onItemTap: (item: FlatMenuItem) => void;
  onVariantTap: (item: FlatMenuItem, variant: MenuItemVariant) => void;
  isItemFullySelected: (item: FlatMenuItem) => boolean;
}

function SearchResults({
  results,
  query,
  selectedKeys,
  openVariantItemId,
  onItemTap,
  onVariantTap,
  isItemFullySelected,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No dishes match &ldquo;{query.trim()}&rdquo;. Try a different search, or clear it to
        browse by category below.
      </p>
    );
  }

  return (
    <ul className="flex flex-col" aria-label={`${results.length} search results`}>
      {results.map((item) => (
        <MenuItemRow
          key={item.id}
          item={item}
          isFullySelected={isItemFullySelected(item)}
          isVariantPickerOpen={openVariantItemId === item.id}
          selectedKeys={selectedKeys}
          onItemTap={onItemTap}
          onVariantTap={onVariantTap}
        />
      ))}
    </ul>
  );
}

interface CategoryAccordionProps {
  menu: DinerMenuCategory[];
  openCategoryId: string | null;
  onToggleCategory: (id: string) => void;
  selectedKeys: Set<string>;
  openVariantItemId: string | null;
  onItemTap: (item: FlatMenuItem) => void;
  onVariantTap: (item: FlatMenuItem, variant: MenuItemVariant) => void;
  isItemFullySelected: (item: FlatMenuItem) => boolean;
}

function CategoryAccordion({
  menu,
  openCategoryId,
  onToggleCategory,
  selectedKeys,
  openVariantItemId,
  onItemTap,
  onVariantTap,
  isItemFullySelected,
}: CategoryAccordionProps) {
  return (
    <div className="flex flex-col gap-2">
      {menu.map((category) => {
        const isOpen = openCategoryId === category.id;
        const selectedCount = category.items.filter((item) =>
          item.variants.length === 0
            ? selectedKeys.has(selectionKey(item.id, null))
            : item.variants.some((v) => selectedKeys.has(selectionKey(item.id, v.label)))
        ).length;
        const panelId = `category-panel-${category.id}`;

        return (
          <Card key={category.id} tone="raised" className="p-0">
            <button
              type="button"
              onClick={() => onToggleCategory(category.id)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex min-h-[44px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 ease-calm sm:px-6"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-display text-lg">{category.name}</span>
                <span className="text-sm text-ink-subtle">({category.items.length})</span>
                {selectedCount > 0 ? (
                  <span className="ws-eyebrow text-xs">{selectedCount} selected</span>
                ) : null}
              </span>
              <span aria-hidden="true" className="text-ink-subtle">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <ul id={panelId} className="border-t border-border px-5 sm:px-6">
                {category.items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={{ ...item, categoryId: category.id, categoryName: category.name }}
                    isFullySelected={isItemFullySelected({
                      ...item,
                      categoryId: category.id,
                      categoryName: category.name,
                    })}
                    isVariantPickerOpen={openVariantItemId === item.id}
                    selectedKeys={selectedKeys}
                    onItemTap={onItemTap}
                    onVariantTap={onVariantTap}
                  />
                ))}
              </ul>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

/**
 * SkipToOverallPrompt — gentle inline prompt shown when the diner taps
 * Continue with zero dishes selected (PLAN §4.2 "Zero dishes selected").
 * Exported separately so the parent flow can render it inline near the
 * action bar without re-rendering the whole selector.
 */
export function SkipToOverallPrompt({ onContinue }: { onContinue: () => void }) {
  return (
    <Card tone="sunken" className="flex flex-col gap-3 p-4 text-sm">
      <p className="text-ink-muted">
        No dishes selected — that&apos;s OK. You can still share your thoughts on the visit
        overall.
      </p>
      <Button type="button" variant="ghost" onClick={onContinue}>
        Continue to overall rating →
      </Button>
    </Card>
  );
}
