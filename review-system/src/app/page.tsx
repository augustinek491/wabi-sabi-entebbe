import Link from "next/link";
import { Button, ButtonLink, Eyebrow, KintsugiDivider } from "@/components/ui";
import { BRAND_NAME, BRAND_TAGLINE, DEMO_TABLE_CODE } from "@/lib/constants";

/**
 * Landing page — explains the tool, links to a demo table.
 *
 * This is the project's own marketing/explainer page (distinct from
 * `/r/[code]`, which is the diner-facing QR landing for a specific table).
 * Kept deliberately calm and restrained per brand guidelines: one accent
 * color used once (the primary CTA), generous negative space, no emoji.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-container flex-col px-6 py-12 sm:px-10 sm:py-20">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl tracking-tight">{BRAND_NAME}</span>
        <Eyebrow>Review System</Eyebrow>
      </header>

      <section className="flex flex-1 flex-col items-start justify-center gap-6 py-16 sm:py-24">
        <Eyebrow>{BRAND_TAGLINE}</Eyebrow>
        <h1 className="max-w-measure text-4xl sm:text-5xl">
          A quiet way to hear how the meal really was.
        </h1>
        <p className="max-w-measure text-lg text-ink-muted leading-relaxed">
          Diners scan a code at their table, rate the dishes they had and the
          visit overall, and are done in under two minutes — no account, no
          login, nothing kept that could identify them. What they share stays
          unseen by anyone else until it reaches the people running the
          kitchen.
        </p>

        <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
          <Link href={`/r/${DEMO_TABLE_CODE}`} passHref legacyBehavior>
            <ButtonLink variant="primary">View a demo table →</ButtonLink>
          </Link>
          <Link href="/admin" passHref legacyBehavior>
            <ButtonLink variant="ghost">Admin dashboard</ButtonLink>
          </Link>
        </div>
      </section>

      <KintsugiDivider />

      <footer className="flex flex-col gap-4 pb-4 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-measure">
          Anonymous by design — the kitchen hears the food, not the table.
          Built for {BRAND_NAME}.
        </p>
        <Button variant="link" type="button" disabled aria-disabled="true">
          Privacy &amp; data
        </Button>
      </footer>
    </main>
  );
}
