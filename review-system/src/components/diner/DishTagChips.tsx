"use client";

import { TagChip } from "@/components/ui";
import { DISH_TAGS, TAG_LABELS } from "@/lib/constants";
import type { DishTag } from "@/lib/types";

export interface DishTagChipsProps {
  selected: DishTag[];
  onChange: (next: DishTag[]) => void;
  /** Accessible label for the chip group, e.g. "Tags for the Salmon Nigiri". */
  label: string;
}

/**
 * DishTagChips — the per-dish tag-chip group (PLAN §7.3): Taste · Portion ·
 * Value · Presentation. Multi-select, no minimum/maximum, neutral nouns —
 * the rating (not the chip) carries the valence (PLAN §3.3).
 */
export function DishTagChips({ selected, onChange, label }: DishTagChipsProps) {
  const toggle = (tag: DishTag) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink" id={`${label}-tags-heading`}>
        Anything stand out?
        <span className="ml-1 font-normal text-ink-subtle">(optional)</span>
      </p>
      <div role="group" aria-labelledby={`${label}-tags-heading`} className="flex flex-wrap gap-2">
        {DISH_TAGS.map((tag) => (
          <TagChip key={tag} selected={selected.includes(tag)} onToggle={() => toggle(tag)}>
            {TAG_LABELS[tag]}
          </TagChip>
        ))}
      </div>
    </div>
  );
}
