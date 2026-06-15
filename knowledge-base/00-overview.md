# Wabi-Sabi Entebbe — Brand Knowledge Base

> **Master overview & synthesis.** Last updated: **2026-06-15**.
> Status: **v1 — built from publicly reachable owned sources only.** Several primary
> sources are gated (see [§5](#5-data-gaps--whats-locked)).

---

## 1. Snapshot

| Field | Value | Confidence |
|---|---|---|
| **Name** | Wabi-Sabi (stylised `WABI-SABI`) | ✅ Verified (logo) |
| **Locality tag** | Entebbe | ✅ Verified |
| **Tagline** | "A Japanese Fusion Restaurant" | ✅ Verified (logo) |
| **Cuisine** | Japanese / Asian fusion + dedicated sushi bar; wood-fired pizza; cocktails | ✅ Verified (logo + venue site) |
| **Venue** | Inside **Hemingways Hotel**, Mugwanya Rd, Entebbe, Uganda | ✅ Verified |
| **Setting** | Boutique hotel overlooking Lake Victoria, minutes from Entebbe Int'l Airport | ✅ Verified |
| **Phone** | +256 709 768 663 | ✅ Verified (Linktree) |
| **Website** | https://wabisabi-ug.com | ⚠️ Exists but **private/locked** |
| **Instagram** | [@wabisabi_entebbe](https://instagram.com/wabisabi_entebbe) | ✅ Exists / ⚠️ content walled |
| **TikTok** | [@wabisabi.entebbe](https://tiktok.com/@wabisabi.entebbe) | ✅ Exists / ⚠️ content walled |
| **Established / online since** | ~June 2026 (Linktree created June 2026) | ✅ Verified |

**One-line positioning (inferred):** an elegant, hotel-based Japanese-fusion restaurant and
sushi bar on the shore of Lake Victoria, trading on a refined *wabi-sabi* aesthetic — beauty
in imperfection, natural materials, and calm.

---

## 2. What we know (verified facts)

- **It is a real, new establishment.** The brand's Linktree was created in **June 2026**; it
  has essentially no third-party web footprint yet (no TripAdvisor/Booking/aggregator entries),
  which is consistent with a just-launched business.
- **Cuisine is Japanese/Asian fusion with a sushi bar.** The logo states *"A Japanese Fusion
  Restaurant."* Hemingways Hotel's own site describes *"Asian fusion cuisine alongside
  international favourites and traditional dishes,"* *"fresh sushi and beautifully plated
  dinners,"* handcrafted cocktails, and a poolside wood-fired pizza oven.
- **It is the signature restaurant of Hemingways Hotel Entebbe** — a refined, purpose-built
  boutique hotel on Mugwanya Rd, overlooking Lake Victoria, minutes from the airport. Breakfast
  is included in room rates and served here.
- **Brand identity is fully formed** (logo, palette, tagline) even though the digital channels
  are thin — see [05-brand-identity.md](05-brand-identity.md).

> ⚠️ **Naming note:** the logo says *Japanese* fusion; the hotel website says *Asian* fusion.
> The logo is the brand's own voice, so we treat **"Japanese fusion"** as the authoritative
> brand descriptor, with "Asian fusion" as the broader kitchen reality.

---

## 3. Brand identity at a glance

The logo (`assets/brand-hero.jpeg`) is the richest brand artifact we have:

- **Mark:** a golden **ensō** (Zen brush-circle) crossed by black **sumi brushstrokes** —
  reading as chopsticks / calligraphy. Asymmetric, handmade, deliberately imperfect.
- **Wordmark:** `WABI-SABI` in letter-spaced gold capitals → `ENTEBBE` → tagline.
- **Palette:** warm **washi ivory** ground · **antique brass/gold** · **sumi black**, over a
  subtle tone-on-tone **seigaiha** (concentric ripple) pattern.

Full breakdown → [05-brand-identity.md](05-brand-identity.md). Buildable tokens, guidelines,
and a live styleguide → [`../design-system/`](../design-system/).

---

## 4. Channels & digital presence

| Channel | Handle / URL | Role | Status |
|---|---|---|---|
| Linktree | [linktr.ee/wabisabi_entebbe](https://linktr.ee/wabisabi_entebbe) | Hub / link-in-bio | ✅ Live (source of truth) |
| Website | [wabisabi-ug.com](https://wabisabi-ug.com) | Menu · story · booking | ⚠️ Private (HTTP 401) |
| Instagram | [@wabisabi_entebbe](https://instagram.com/wabisabi_entebbe) | "See Menu · See Food" | ✅ Live · content login-walled |
| TikTok | [@wabisabi.entebbe](https://tiktok.com/@wabisabi.entebbe) | Video | ✅ Live · content bot-walled |
| Phone | +256 709 768 663 | Direct contact | ✅ Verified |
| Google Maps | [Wabi-Sabi Entebbe](https://maps.app.goo.gl/LHSFDCamSVV1BpMj9) | Find us | ✅ Listed |

Per-channel detail: [01-website.md](01-website.md) · [02-instagram.md](02-instagram.md) ·
[03-tiktok.md](03-tiktok.md) · [04-location-contact.md](04-location-contact.md).

---

## 5. Data gaps & what's locked

This v1 is honest about its limits. The following are **not yet captured** because the sources
are gated to automated access:

1. **Full menu & prices** — live on the private website and/or Instagram; not retrievable.
2. **Brand story / "about" copy** — expected on the website.
3. **Opening hours, service options, price tier** — not exposed on the Google listing yet.
4. **Real social content** — bios, post captions, follower counts, feed photography. Both IG
   and TikTok return **zero** public data to a server fetch (verified 2026-06-15).
5. **Brand fonts (actual files/names)** — inferred from the logo, not confirmed.

---

## 6. How to enrich (next steps)

| To unlock… | Provide / do this |
|---|---|
| Menu, story, hours, booking | Share the **Squarespace site password** for wabisabi-ug.com → full crawl |
| Social voice & visuals | Allow a **Claude-in-Chrome** pass on a logged-in IG/TikTok session |
| Accurate design system | Hand over **logo files, brand fonts, menu (PDF), photography** |

---

## 7. Knowledge-base index

```
knowledge-base/
├── 00-overview.md           ← you are here (synthesis)
├── 01-website.md            website status + expected content
├── 02-instagram.md          IG channel notes + status
├── 03-tiktok.md             TikTok channel notes + status
├── 04-location-contact.md   venue, location, contact, cuisine (detailed)
├── 05-brand-identity.md     logo, palette, motifs, voice → design bridge
└── data/
    ├── brand.json           machine-readable brand facts
    ├── channels.json        all links/handles + status
    ├── contact-location.json  phone, address, coords, venue
    └── menu.json            known offerings (no fabricated items)
```

**Confidence legend:** ✅ Verified from an owned/official source · 🟡 Inferred (labelled) ·
⚠️ Gap / unverified.
