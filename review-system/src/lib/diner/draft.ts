/**
 * Draft persistence — Wabi-Sabi Entebbe diner review flow.
 *
 * Holds the in-progress review (`DinerDraft`) in `sessionStorage`, keyed by
 * table code, so a refresh / accidental nav-back doesn't lose progress —
 * but nothing is sent to the server until the final `submit_review(...)`
 * call. An abandoned session therefore leaves zero rating rows (PLAN §6.2 /
 * the diner-flow brief's draft-persistence requirement).
 *
 * `sessionStorage` (not `localStorage`) is deliberate: it's tab-scoped and
 * cleared when the tab closes, which is the right lifetime for "one visit."
 */

import { createEmptyDraft, type DinerDraft } from "./types";

function storageKey(tableCode: string): string {
  return `ws_review_draft:${tableCode}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

/**
 * Load the draft for a table code, or create a fresh empty one if none
 * exists / the stored value is malformed or from an old schema version.
 */
export function loadDraft(tableCode: string): DinerDraft {
  if (!isBrowser()) return createEmptyDraft(tableCode);

  try {
    const raw = window.sessionStorage.getItem(storageKey(tableCode));
    if (!raw) return createEmptyDraft(tableCode);

    const parsed = JSON.parse(raw) as Partial<DinerDraft>;
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      parsed.tableCode === tableCode &&
      Array.isArray(parsed.dishes)
    ) {
      return parsed as DinerDraft;
    }
  } catch {
    // Fall through to a fresh draft on any parse/shape error.
  }

  return createEmptyDraft(tableCode);
}

/** Persist the draft. Silently no-ops if sessionStorage is unavailable (e.g. SSR, privacy mode). */
export function saveDraft(draft: DinerDraft): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(storageKey(draft.tableCode), JSON.stringify(draft));
  } catch {
    // Storage full / disabled — the in-memory state still works for this tab session.
  }
}

/** Remove the draft entirely (e.g. after a successful submit, to prevent re-submission via back-nav). */
export function clearDraft(tableCode: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(storageKey(tableCode));
  } catch {
    // no-op
  }
}
