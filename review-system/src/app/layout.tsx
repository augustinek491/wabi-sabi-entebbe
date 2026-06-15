import type { Metadata } from "next";
import "./globals.css";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Reviews`,
  description: BRAND_TAGLINE,
};

/**
 * Root layout — fonts, base CSS vars, ws-base class.
 *
 * Fonts (Cormorant Garamond + Jost) are loaded via the Google Fonts
 * `@import` in globals.css. Route groups (`(diner)`, `(admin)`) provide
 * their own shells/chrome on top of this minimal base.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="ws-base min-h-screen antialiased">{children}</body>
    </html>
  );
}
