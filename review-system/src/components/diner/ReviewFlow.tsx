"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  EnsoLoader,
  Eyebrow,
  KintsugiDivider,
  SectionHeading,
} from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { ANONYMITY_NOTICE, GENERIC_ERROR_MESSAGE } from "@/lib/constants";
import { loadDraft, saveDraft, clearDraft } from "@/lib/diner/draft";
import { countMenuItems } from "@/lib/diner/menu";
import type { DinerDraft, DraftDishEntry, SubmitReviewResult, TableContextResult } from "@/lib/diner/types";
import type { MenuItemVariant } from "@/lib/diner/types";
import type { FlatMenuItem } from "@/lib/diner/menu";
import { AnonymityNotice } from "./AnonymityNotice";
import { DishRatingCard } from "./DishRatingCard";
import { DishSelector, SkipToOverallPrompt } from "./DishSelector";
import { OverallRatingForm } from "./OverallRatingForm";
import { ProgressDots } from "./ProgressDots";
import { StickyActionBar } from "./StickyActionBar";

export interface ReviewFlowProps {
  tableCode: string;
  context: TableContextResult;
}

type Step =
  | { name: "intro" }
  | { name: "select" }
  | { name: "rate"; dishIndex: number }
  | { name: "overall" }
  | { name: "submitting" }
  | { name: "thanks" };

/**
 * ReviewFlow — the diner journey orchestrator (PLAN §2.2):
 *   intro -> select dishes -> rate each dish -> overall -> submit -> thanks
 *
 * State management:
 * - The full in-progress review (`DinerDraft`) lives in component state and
 *   is mirrored to `sessionStorage` on every change (lib/diner/draft.ts) —
 *   a refresh mid-flow restores progress, but nothing reaches the server
 *   until the final `submit_review(...)` call (abandoned sessions leave
 *   zero rating rows).
 * - `start_session(code)` is called lazily: on the first rating interaction
 *   (first tap on any RatingScale) OR at submit time if it hasn't happened
 *   yet, per the brief's requirement §7.
 * - Anti-anchoring (PLAN §3.2 / §3.8): no aggregate is ever fetched or
 *   rendered; `RatingScale` always starts `null`; each per-dish screen is
 *   independent.
 */
export function ReviewFlow({ tableCode, context }: ReviewFlowProps) {
  const [draft, setDraftState] = useState<DinerDraft>(() => loadDraft(tableCode));
  const [step, setStep] = useState<Step>(() =>
    draft.dishes.length > 0 || draft.overallRating !== null ? { name: "select" } : { name: "intro" }
  );
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Array<{ menu_item_id: string; reason: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
  /**
   * Focus target for route/step transitions (PLAN-ADDENDUM §F1) — each
   * screen attaches this to its outermost content wrapper (tabIndex={-1}),
   * so focus moves to the new screen's content (including its <h1> via
   * `SectionHeading`) without needing ref-forwarding through shared UI.
   */
  const headingRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  const totalItems = useMemo(() => countMenuItems(context.menu), [context.menu]);

  // Persist the draft to sessionStorage on every change.
  const setDraft = useCallback((updater: (prev: DinerDraft) => DinerDraft) => {
    setDraftState((prev) => {
      const next = updater(prev);
      saveDraft(next);
      return next;
    });
  }, []);

  // Move focus to the new step's heading on every step change (PLAN-ADDENDUM §F1).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  /**
   * Ensure a session id exists, calling `start_session(code)` if needed.
   * Idempotent within a render cycle via `sessionPromiseRef` so rapid taps
   * (e.g. the first RatingScale interaction) don't fire duplicate RPCs.
   */
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (draft.sessionId) return draft.sessionId;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    const promise = (async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.rpc("start_session", { p_code: tableCode });
        if (error || !data) {
          setSessionError(GENERIC_ERROR_MESSAGE);
          return null;
        }
        const sessionId = String(data);
        setDraft((prev) => ({ ...prev, sessionId }));
        setSessionError(null);
        return sessionId;
      } catch {
        setSessionError(GENERIC_ERROR_MESSAGE);
        return null;
      } finally {
        sessionPromiseRef.current = null;
      }
    })();

    sessionPromiseRef.current = promise;
    return promise;
  }, [draft.sessionId, setDraft, tableCode]);

  // --- Dish selection -----------------------------------------------------

  const handleAddDish = useCallback(
    (item: FlatMenuItem, variant: MenuItemVariant | null) => {
      const entry: DraftDishEntry = {
        menuItemId: item.id,
        name: item.name,
        categoryName: item.categoryName,
        variant: variant?.label ?? null,
        rating: null,
        tags: [],
        comment: null,
      };
      setDraft((prev) => ({ ...prev, dishes: [...prev.dishes, entry] }));
    },
    [setDraft]
  );

  const handleRemoveDish = useCallback(
    (menuItemId: string, variant: string | null) => {
      setDraft((prev) => ({
        ...prev,
        dishes: prev.dishes.filter((d) => !(d.menuItemId === menuItemId && d.variant === variant)),
      }));
    },
    [setDraft]
  );

  const handleUpdateDish = useCallback(
    (index: number, patch: Partial<Pick<DraftDishEntry, "rating" | "tags" | "comment">>) => {
      setDraft((prev) => {
        const dishes = [...prev.dishes];
        const current = dishes[index];
        if (!current) return prev;
        dishes[index] = { ...current, ...patch };
        return { ...prev, dishes };
      });
      // First rating interaction lazily bootstraps the session (requirement §7).
      if (patch.rating !== undefined) {
        void ensureSession();
      }
    },
    [ensureSession, setDraft]
  );

  // --- Navigation -----------------------------------------------------------

  const goToSelect = () => setStep({ name: "select" });

  const goToFirstRatingOrOverall = () => {
    if (draft.dishes.length > 0) {
      setStep({ name: "rate", dishIndex: 0 });
    } else {
      setStep({ name: "overall" });
    }
  };

  const goNextFromRating = (currentIndex: number) => {
    if (currentIndex + 1 < draft.dishes.length) {
      setStep({ name: "rate", dishIndex: currentIndex + 1 });
    } else {
      setStep({ name: "overall" });
    }
  };

  const goBackFromRating = (currentIndex: number) => {
    if (currentIndex > 0) {
      setStep({ name: "rate", dishIndex: currentIndex - 1 });
    } else {
      setStep({ name: "select" });
    }
  };

  const handleOverallRatingChange = (value: 1 | 2 | 3 | 4 | 5) => {
    setDraft((prev) => ({ ...prev, overallRating: value }));
    void ensureSession();
  };

  const handleOverallCommentChange = (value: string) => {
    setDraft((prev) => ({ ...prev, overallComment: value || null }));
  };

  // --- Submission -------------------------------------------------------

  const buildDishesPayload = (dishes: DraftDishEntry[]) =>
    dishes
      .filter((d) => d.rating !== null || d.tags.length > 0 || (d.comment && d.comment.trim()))
      .map((d) => ({
        menu_item_id: d.menuItemId,
        variant: d.variant,
        rating: d.rating,
        tags: d.tags,
        comment: d.comment,
      }));

  const submitReview = useCallback(
    async (dishesOverride?: DraftDishEntry[]) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const sessionId = draft.sessionId ?? (await ensureSession());
        if (!sessionId) {
          setSubmitError(GENERIC_ERROR_MESSAGE);
          setIsSubmitting(false);
          setStep({ name: "overall" });
          return;
        }

        if (draft.overallRating === null) {
          setSubmitError("Please choose a rating for your overall visit before submitting.");
          setIsSubmitting(false);
          setStep({ name: "overall" });
          return;
        }

        const dishes = dishesOverride ?? draft.dishes;
        const timeSpentSeconds = Math.max(0, Math.round((Date.now() - draft.startedAt) / 1000));

        const supabase = createBrowserClient();
        const { data, error } = await supabase.rpc("submit_review", {
          p_session_id: sessionId,
          p_overall: draft.overallRating,
          p_comment: draft.overallComment ?? "",
          p_time_spent: timeSpentSeconds,
          p_dishes: buildDishesPayload(dishes),
        });

        if (error) {
          if (error.message?.includes("already_submitted")) {
            // This session already has a submitted review — treat as success
            // (idempotent re-visit), no duplicate data was written.
            setDraft((prev) => ({ ...prev, submitted: true }));
            clearDraft(tableCode);
            setStep({ name: "thanks" });
            return;
          }
          setSubmitError(GENERIC_ERROR_MESSAGE);
          setIsSubmitting(false);
          return;
        }

        const result = data as unknown as SubmitReviewResult;
        if (result?.skipped?.length) {
          setSkipped(result.skipped);
        }

        setDraft((prev) => ({ ...prev, submitted: true }));
        clearDraft(tableCode);
        setStep({ name: "thanks" });
      } catch {
        setSubmitError(GENERIC_ERROR_MESSAGE);
      } finally {
        setIsSubmitting(false);
      }
    },
    [draft, ensureSession, setDraft, tableCode]
  );

  const handleSubmit = () => {
    setStep({ name: "submitting" });
    void submitReview();
  };

  /** Retry just the dishes that were skipped, re-submitting via `submit_review` again. */
  const handleRetrySkipped = () => {
    const retryDishes = draft.dishes.filter((d) =>
      skipped.some((s) => s.menu_item_id === d.menuItemId)
    );
    setSkipped([]);
    setStep({ name: "submitting" });
    void submitReview(retryDishes);
  };

  // --- Render -------------------------------------------------------------

  if (step.name === "intro") {
    return <IntroScreen totalItems={totalItems} headingRef={headingRef} onBegin={goToSelect} />;
  }

  if (step.name === "select") {
    return (
      <SelectScreen
        menu={context.menu}
        draft={draft}
        headingRef={headingRef}
        onAdd={handleAddDish}
        onRemove={handleRemoveDish}
        onContinue={goToFirstRatingOrOverall}
      />
    );
  }

  if (step.name === "rate") {
    const dish = draft.dishes[step.dishIndex];
    if (!dish) {
      // Defensive: index out of range (e.g. dish removed mid-flow) — fall back to overall.
      setStep({ name: "overall" });
      return null;
    }
    return (
      <RateScreen
        dish={dish}
        index={step.dishIndex}
        total={draft.dishes.length}
        headingRef={headingRef}
        onChange={(patch) => handleUpdateDish(step.dishIndex, patch)}
        onBack={() => goBackFromRating(step.dishIndex)}
        onNext={() => goNextFromRating(step.dishIndex)}
        sessionError={sessionError}
      />
    );
  }

  if (step.name === "overall") {
    return (
      <OverallScreen
        draft={draft}
        headingRef={headingRef}
        onRatingChange={handleOverallRatingChange}
        onCommentChange={handleOverallCommentChange}
        onBack={() => {
          if (draft.dishes.length > 0) {
            setStep({ name: "rate", dishIndex: draft.dishes.length - 1 });
          } else {
            setStep({ name: "select" });
          }
        }}
        onSubmit={handleSubmit}
        canSubmit={draft.overallRating !== null}
        submitError={submitError}
        sessionError={sessionError}
      />
    );
  }

  if (step.name === "submitting") {
    return <SubmittingScreen />;
  }

  return (
    <ThanksScreen
      skipped={skipped}
      onRetrySkipped={handleRetrySkipped}
      isRetrying={isSubmitting}
      announceRef={announceRef}
      headingRef={headingRef}
    />
  );
}

// ===========================================================================
// Step screens
// ===========================================================================

interface IntroScreenProps {
  totalItems: number;
  headingRef: React.RefObject<HTMLDivElement>;
  onBegin: () => void;
}

function IntroScreen({ totalItems, headingRef, onBegin }: IntroScreenProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Cinematic ambient hero — autoplay silent loop, poster is the hero still */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/brand/brand-hero-still.png"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
          <source src="/brand/brand-ambient-loop.mp4" type="video/mp4" />
        </video>
        {/* Gradient fade to page background at the bottom edge */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(22,21,15,0.18) 0%, transparent 45%, var(--color-bg) 100%)",
          }}
        />
      </div>

      <div ref={headingRef} tabIndex={-1} className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-6 pb-6 pt-4">
        <Eyebrow>Quick visit feedback</Eyebrow>
        <SectionHeading
          as="h1"
          title="How was your meal?"
          description={`Pick out the ${totalItems > 0 ? "dishes" : "things"} you tried, rate them, and share a few thoughts on the visit — usually around two minutes, less if you'd rather just rate the visit overall.`}
        />

        <AnonymityNotice tone="prominent" />

        <KintsugiDivider />

        <p className="text-sm text-ink-muted">
          Nothing is shown to you about how others rated anything, before or after — this isn&apos;t
          a popularity contest, just a quiet way to let the kitchen know.
        </p>
      </div>

      <StickyActionBar>
        <Button variant="primary" fullWidth onClick={onBegin}>
          Begin →
        </Button>
        <Button
          variant="link"
          fullWidth
          onClick={() => {
            onBegin();
          }}
        >
          Just rate the visit overall instead
        </Button>
      </StickyActionBar>
    </div>
  );
}

interface SelectScreenProps {
  menu: TableContextResult["menu"];
  draft: DinerDraft;
  headingRef: React.RefObject<HTMLDivElement>;
  onAdd: (item: FlatMenuItem, variant: MenuItemVariant | null) => void;
  onRemove: (menuItemId: string, variant: string | null) => void;
  onContinue: () => void;
}

function SelectScreen({ menu, draft, headingRef, onAdd, onRemove, onContinue }: SelectScreenProps) {
  const [showSkipPrompt, setShowSkipPrompt] = useState(false);

  const handleContinue = () => {
    if (draft.dishes.length === 0) {
      setShowSkipPrompt(true);
      return;
    }
    onContinue();
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <div ref={headingRef} tabIndex={-1} className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 pb-6">
        <SectionHeading
          as="h1"
          eyebrow="What did you have?"
          title="Tell us what you tried"
          description="Search for the dishes you ordered, or browse by category. Pick a variant if there's more than one."
        />

        <DishSelector menu={menu} selected={draft.dishes} onAdd={onAdd} onRemove={onRemove} />

        {showSkipPrompt && draft.dishes.length === 0 ? (
          <SkipToOverallPrompt onContinue={onContinue} />
        ) : null}
      </div>

      <StickyActionBar>
        <Button variant="primary" fullWidth onClick={handleContinue}>
          {draft.dishes.length > 0
            ? `Continue with ${draft.dishes.length} ${draft.dishes.length === 1 ? "dish" : "dishes"} →`
            : "Continue →"}
        </Button>
      </StickyActionBar>
    </div>
  );
}

interface RateScreenProps {
  dish: DraftDishEntry;
  index: number;
  total: number;
  headingRef: React.RefObject<HTMLDivElement>;
  onChange: (patch: Partial<Pick<DraftDishEntry, "rating" | "tags" | "comment">>) => void;
  onBack: () => void;
  onNext: () => void;
  sessionError: string | null;
}

function RateScreen({ dish, index, total, headingRef, onChange, onBack, onNext, sessionError }: RateScreenProps) {
  const isLast = index + 1 === total;

  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <div ref={headingRef} tabIndex={-1} className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 pb-6">
        <ProgressDots current={index + 1} total={total} />

        <SectionHeading
          as="h1"
          eyebrow={dish.categoryName}
          title={
            <>
              How was the <em>{dish.name}</em>
              {dish.variant ? <span className="text-ink-subtle"> ({dish.variant})</span> : null}?
            </>
          }
        />

        <DishRatingCard dish={dish} onChange={onChange} />

        {sessionError ? <p className="text-sm text-accent-clay">{sessionError}</p> : null}
      </div>

      <StickyActionBar>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button variant="primary" onClick={onNext} className="flex-1">
            {isLast ? "Continue →" : "Next dish →"}
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}

interface OverallScreenProps {
  draft: DinerDraft;
  headingRef: React.RefObject<HTMLDivElement>;
  onRatingChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  onCommentChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitError: string | null;
  sessionError: string | null;
}

function OverallScreen({
  draft,
  headingRef,
  onRatingChange,
  onCommentChange,
  onBack,
  onSubmit,
  canSubmit,
  submitError,
  sessionError,
}: OverallScreenProps) {
  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <div ref={headingRef} tabIndex={-1} className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 pb-6">
        <SectionHeading
          as="h1"
          eyebrow="Last step"
          title="How was the visit overall?"
          description="One more rating, and an optional note if anything's on your mind."
        />

        <OverallRatingForm
          rating={draft.overallRating}
          comment={draft.overallComment ?? ""}
          onRatingChange={onRatingChange}
          onCommentChange={onCommentChange}
        />

        <AnonymityNotice tone="prominent" />

        {sessionError || submitError ? (
          <p role="alert" className="text-sm text-accent-clay">
            {submitError ?? sessionError}
          </p>
        ) : null}
      </div>

      <StickyActionBar>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex-1"
          >
            Submit
          </Button>
        </div>
        {!canSubmit ? (
          <p className="text-center text-xs text-ink-subtle">
            Choose a rating above to submit.
          </p>
        ) : null}
      </StickyActionBar>
    </div>
  );
}

function SubmittingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <EnsoLoader label="Submitting your review" size={64} />
      <p className="text-sm text-ink-subtle">Sending your thoughts along…</p>
    </div>
  );
}

interface ThanksScreenProps {
  skipped: Array<{ menu_item_id: string; reason: string }>;
  onRetrySkipped: () => void;
  isRetrying: boolean;
  announceRef: React.RefObject<HTMLDivElement>;
  headingRef: React.RefObject<HTMLDivElement>;
}

function ThanksScreen({ skipped, onRetrySkipped, isRetrying, announceRef, headingRef }: ThanksScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-6 py-12 text-center seigaiha-bg">
      {/* Kintsugi background accent — very low opacity, adds warmth and depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url(/brand/brand-kintsugi.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.07,
        }}
      />

      <div
        ref={announceRef}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        Thank you — your review has been submitted.
      </div>

      <div ref={headingRef} tabIndex={-1} className="relative flex w-full max-w-[480px] flex-col items-center gap-6">
        <SectionHeading
          as="h1"
          eyebrow="Thank you"
          title="That's it — thank you."
          description="Your thoughts have gone straight to the people running the kitchen. Nothing more to do."
          className="items-center text-center"
        />

        <p className="text-sm text-ink-subtle">{ANONYMITY_NOTICE}</p>

        {skipped.length > 0 ? (
          <Card tone="sunken" className="flex w-full flex-col gap-3 text-left">
            <p className="text-sm text-ink-muted">
              Everything else saved, but {skipped.length === 1 ? "one dish couldn't be" : `${skipped.length} dishes couldn't be`}{" "}
              recorded — it may have changed since you started.
            </p>
            <Button variant="ghost" onClick={onRetrySkipped} disabled={isRetrying}>
              {isRetrying ? "Retrying…" : "Try again for those"}
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
