"use client";

import { useId, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import {
  COMMENT_COUNTER_THRESHOLD,
  COMMENT_MAX_LENGTH,
  COMMENT_PLACEHOLDER,
} from "@/lib/constants";

export interface CommentFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "maxLength"> {
  value: string;
  onChange: (value: string) => void;
  /** Visible label, e.g. "Anything you noticed about the Salmon Nigiri?" */
  label: string;
}

/**
 * CommentField — shared optional free-text input (PLAN §3.3 / §7.4).
 *
 * - Never required, regardless of rating (PLAN §3.3 — uniform optionality
 *   avoids suppressing critical feedback relative to positive).
 * - Placeholder explicitly licenses criticism ("Anything you noticed — good
 *   or otherwise").
 * - `font-size: 16px` minimum (via `text-base`) to prevent iOS auto-zoom on
 *   focus (PLAN §4.4).
 * - Soft character counter only appears past `COMMENT_COUNTER_THRESHOLD`
 *   (400) — never shown for short comments, hard cap at `COMMENT_MAX_LENGTH`
 *   (600, PLAN-ADDENDUM §A9).
 */
export function CommentField({ value, onChange, label, className, id, ...props }: CommentFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const counterId = `${fieldId}-counter`;
  const showCounter = value.length > COMMENT_COUNTER_THRESHOLD;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
        <span className="ml-1 font-normal text-ink-subtle">(optional)</span>
      </label>
      <textarea
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, COMMENT_MAX_LENGTH))}
        placeholder={COMMENT_PLACEHOLDER}
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        aria-describedby={showCounter ? counterId : undefined}
        className={clsx(
          "min-h-[5rem] max-h-48 resize-y rounded-md border-[1.5px] border-interactive-border bg-surface p-3",
          "text-base text-ink placeholder:text-ink-subtle",
          "transition-colors duration-200 ease-calm",
          "focus:border-focus focus-visible:outline-none",
          className
        )}
        {...props}
      />
      {showCounter ? (
        <p id={counterId} className="text-xs text-ink-subtle" aria-live="polite">
          Keep going if you&apos;d like — {value.length}/{COMMENT_MAX_LENGTH}
        </p>
      ) : null}
    </div>
  );
}
