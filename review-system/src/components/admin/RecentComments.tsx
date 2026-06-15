import { Card, Eyebrow, TagChip } from "@/components/ui";
import { EmptyState } from "./EmptyState";
import { TAG_LABELS } from "@/lib/constants";
import { formatAvgRating } from "@/lib/format";
import type { AdminRecentComment } from "@/lib/admin/types";

export interface RecentCommentsProps {
  title?: string;
  comments: AdminRecentComment[];
  emptyDescription: string;
}

/**
 * RecentComments — free-text comment feed (PLAN §2.3 "RECENT COMMENTS").
 *
 * XSS-SAFE BY CONSTRUCTION (PLAN-ADDENDUM §A9): `comment.comment` is a plain
 * `string` from `src/lib/admin/queries.ts` and is interpolated directly as a
 * React child below (`<p>{comment.comment}</p>`) — React escapes string
 * children by default, and this file contains NO `dangerouslySetInnerHTML`
 * anywhere. Do not introduce one here.
 *
 * Each comment shows: dish name (or "Overall visit" if null), the numeric
 * rating it accompanied (always shown alongside text — PLAN §1.2's
 * "free-text sentiment vs. numeric rating" framing), its tag chips
 * (read-only, rendered via the shared `TagChip` in a disabled/inert style),
 * and a relative-ish date.
 */
export function RecentComments({ title = "Recent comments", comments, emptyDescription }: RecentCommentsProps) {
  return (
    <Card className="flex flex-col gap-4">
      <Eyebrow>{title}</Eyebrow>
      {comments.length === 0 ? (
        <EmptyState title="No written comments yet" description={emptyDescription} />
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 border-b border-border pb-4 last:border-none last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-base text-ink">
                  {entry.dishName ?? "Overall visit"}
                </span>
                <span className="flex items-center gap-2 text-xs text-ink-subtle">
                  {entry.rating !== null ? (
                    <span className="font-sans">{formatAvgRating(entry.rating)} / 5</span>
                  ) : null}
                  <time dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </span>
              </div>
              {/* Plain text node — never dangerouslySetInnerHTML (PLAN-ADDENDUM §A9). */}
              <p className="text-sm text-ink-muted whitespace-pre-wrap">{entry.comment}</p>
              {entry.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-label="Tags noted">
                  {entry.tags.map((tag) => (
                    <TagChip key={tag} selected aria-disabled="true" tabIndex={-1} onToggle={() => {}}>
                      {TAG_LABELS[tag]}
                    </TagChip>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
