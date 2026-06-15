import type { ReactNode } from "react";
import clsx from "clsx";
import { Card, Eyebrow } from "@/components/ui";

export interface KpiCardProps {
  label: string;
  /** Large display-font numeral/value, e.g. "4.3" or "142". */
  value: ReactNode;
  /** Optional supporting line below the value, e.g. "n=142" or "vs menu avg 4.1". */
  helper?: ReactNode;
  className?: string;
}

/**
 * KpiCard — large serif numeral + small uppercase label (PLAN §7.5):
 * "large serif numerals against small font-sans uppercase labels
 * (--ws-eyebrow style) is itself a premium-feeling pattern."
 */
export function KpiCard({ label, value, helper, className }: KpiCardProps) {
  return (
    <Card className={clsx("flex flex-col gap-2", className)}>
      <Eyebrow>{label}</Eyebrow>
      <p className="font-display text-3xl sm:text-4xl text-ink leading-tight">{value}</p>
      {helper ? <p className="text-sm text-ink-subtle">{helper}</p> : null}
    </Card>
  );
}
