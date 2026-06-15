# Wabi Sabi (Entebbe) — Location, Google Business Profile & Contact Facts

Research date: 2026-06-15
Scope: Business listing facts, cuisine/concept, venue context (Hemingways Hotel Entebbe), and owner-posted photos/visual notes. Customer reviews and ratings were intentionally NOT mined per task scope.

---

## Business Listing Facts

**Status: The Google Maps listing itself could NOT be fully retrieved.**

The provided short link (`https://maps.app.goo.gl/LHSFDCamSVV1BpMj9`) was followed programmatically and resolves (HTTP 302) to:

```
https://www.google.com/maps/place/Wabi-Sabi+Entebbe/@0.0460137,32.4632966,977m/data=!3m2!1e3!4b1!4m6!3m5!1s0x177d87d012feeda5:0x98d87b454c679214!8m2!3d0.0460083!4d32.4658715!16s%2Fg%2F11z8szdgvn
```

Key facts extractable from this redirect URL itself:
- **Exact listing name on Google Maps: "Wabi-Sabi Entebbe"** (hyphenated form, per the URL slug `/place/Wabi-Sabi+Entebbe/`).
- **Listing coordinates (from URL): 0.0460083, 32.4658715** — note this is slightly different from the coordinates given in the brief (0.0460137, 32.4632966); the URL's `@` viewport-center coordinate matches the brief's pair (0.0460137, 32.4632966), while the `!3d/!4d` pair (the pin's actual coordinate) is 0.0460083, 32.4658715. Both pairs are within ~280m of each other, consistent with the pin sitting inside/near the Hemingways Hotel compound on Mugwanya Rd.
- **Google Place ID component:** `0x177d87d012feeda5:0x98d87b454c679214` (CID `11020034064719663636`); **Maps short code:** `/g/11z8szdgvn`.

**All other listing fields (category, full address string as displayed, opening hours, price level `$`/`$$`, service options checkboxes, "Website" link shown on the card, and photo gallery) could NOT be retrieved.** Google Maps place pages render via JavaScript and do not expose this data in static HTML — every fetch method available (WebFetch redirect-follow, raw HTTPS fetch of the resolved URL, the mobile "maps lite" endpoint, and a place-ID-based URL) returned either an empty app-shell or a "Open in the Google Maps app" prompt with no place-specific JSON/HTML.

- **Exact business name as listed:** "Wabi-Sabi Entebbe" (from Maps URL slug). — **Verified** (from URL structure only)
- **Category/cuisine type on listing:** Not retrievable — **Not publicly available** (via this research)
- **Full address as displayed:** Not retrievable — **Not publicly available**
- **Plus code / area:** Not retrievable — **Not publicly available**
- **Opening hours (per day):** Not retrievable — **Not publicly available**
- **Phone shown on listing:** Not retrievable — **Not publicly available** (brief gives +256 709 768663 as a confirmed fact from another source, but this could not be cross-checked against the Maps card itself)
- **Price level ($/$$/$$$):** Not retrievable — **Not publicly available**
- **Service options (dine-in/takeaway/reservations):** Not retrievable — **Not publicly available**
- **Website shown on listing:** Not retrievable — **Not publicly available**

---

## Cuisine & Concept

**Verified facts (from Hemingways Hotel Entebbe's own website, hemingwaysentebbe.com):**

The hotel's own marketing copy consistently and repeatedly describes Wabi Sabi's food concept across multiple independent pages of hemingwaysentebbe.com:

1. **Homepage** ("Experiences" section):
   > "Experience exceptional dining at Wabi Sabi, our signature restaurant serving **Asian fusion cuisine alongside international favourites and traditional dishes** in a sophisticated setting with views of Lake Victoria."
   — Source: https://www.hemingwaysentebbe.com/

2. **Blog: "Experiences & Amenities at Hemingways Hotel Entebbe"** (dated 05 Feb 2026), section "2. Dining at Wabi Sabi":
   > "Dining at Hemingways Hotel centres around Wabi Sabi, the hotel's signature restaurant offering **Asian fusion cuisine alongside international dishes and traditional favourites**. Designed with elegant interiors, exposed beams, and **a stylish sushi bar**, Wabi Sabi creates an experience that feels both sophisticated and welcoming. Guests can enjoy everything from fresh sushi and beautifully plated dinners to casual lunches and handcrafted cocktails at the bar."
   — Source: https://www.hemingwaysentebbe.com/blog-post-3.html

3. **Blog: "Evenings at Hemingways Hotel Entebbe"** (dated 20 Jan 2026):
   > "...the sounds and aromas of the kitchen begin to fill the air. **Plates of beautifully prepared sushi emerge from the sushi bar alongside Asian fusion dishes, fresh local ingredients, traditional favourites, and international cuisine.**"
   — Source: https://www.hemingwaysentebbe.com/blog-post-2.html

**Summary of verified concept:** **Asian fusion** is the core/headline cuisine descriptor used consistently by the hotel itself, paired with a dedicated **sushi bar**, plus international dishes, traditional/local favourites, casual lunches, and handcrafted cocktails. The hotel also operates a **wood-fired pizza oven** in the poolside garden area — pizzas are explicitly framed as part of the broader Wabi Sabi/poolside food offering ("freshly made pizzas from the outdoor pizza oven add another layer to the experience... poolside pizzas have quickly become one of the hotel's most enjoyable and relaxed offerings" — same source as #2 above).

There is **no mention of "Japanese" as a standalone category** anywhere in the verified sources — "Asian fusion" + "sushi bar" is the operative description. This should NOT be assumed to mean strictly Japanese; the copy explicitly blends it with international and traditional/local dishes.

- **Verified:** Asian fusion cuisine, sushi bar, international dishes, traditional/local favourites, cocktails, wood-fired pizza (poolside). Source: hemingwaysentebbe.com (homepage + 2 blog posts).
- **Inference:** Given the restaurant's own name "Wabi Sabi" (a Japanese aesthetic term) plus the sushi-bar emphasis, a Japanese-leaning component within the broader "Asian fusion" positioning is plausible — but this is an inference, not a stated category. The listing's own Google Maps category field could not be retrieved to confirm/deny.
- **A caveat on source reliability:** The restaurant subpage (https://www.hemingwaysentebbe.com/restaurant.html) contains a "Visit Restaurant Website" link pointing to `https://www.example.com` — a placeholder URL. This suggests the hemingwaysentebbe.com site may itself be a recently-built/template site with some not-yet-finalized content, consistent with the brief's note that this is a brand-new online presence (June 2026). The repeated, consistent "Asian fusion + sushi bar" language across 3 separate pages (home + 2 dated blog posts) gives it reasonable credibility as the intended concept, but it should be treated as the hotel's own stated positioning rather than independently confirmed via a third party (no TripAdvisor, Yelp, or aggregator listing for "Wabi Sabi Entebbe" or "Hemingways Hotel Entebbe" could be found — see Gaps).

---

## Venue (Hemingways Hotel Entebbe)

**Verified facts (from hemingwaysentebbe.com, the hotel's own site):**

- **What it is:** A "refined boutique" hotel, described on every page as offering "a refined boutique experience."
- **Location:** "Perfectly located on Mugwanya Road just minutes from Entebbe International Airport... overlooking the tranquil waters of Lake Victoria." This phrasing (airport proximity + lake-view) is repeated verbatim/near-verbatim on the homepage, contact page, and blog posts.
- **Building / architecture:** A **four-storey property**, "built entirely from the ground up." Design is described as blending "contemporary architecture with warm African wooden finishes" and being "deeply connected to East African design while still embracing modern comfort and functionality." Features include archways, exposed wooden beams, marble floors, and natural light throughout.
  - Source: https://www.hemingwaysentebbe.com/blog-post-1.html ("The Story Behind the Design of Hemingways Hotel Entebbe," dated 15 Jan 2026)
- **Floor layout (as described in the design blog):**
  - **Basement 2** (lowest level): wellness/leisure hub — opens onto the swimming pool and garden, poolside dining, a traditional pizza oven, "Activate Body Therapy" wellness centre (gym, massage rooms, sauna, steam room), and several pool-view rooms.
  - **Basement 1**: described as "a quiet..." level (content truncated in source; likely additional rooms/meeting space).
  - **Ground floor**: "the heart of Hemingways Hotel," where "architecture and atmosphere come together most" — this is where the restaurant/reception/lobby with exposed beams and archways sit (per the "Evenings" blog).
  - **Second floor**: an exclusive penthouse, "accessible by lift, like every floor."
- **Rooms & rates** (from homepage):
  - Classic Room: US$160–350/night (PP sharing US$160–200, single US$300–350)
  - Lake View Room: US$200–390/night (PP sharing US$200–235, single US$325–390), "panoramic views of Lake Victoria"
  - Pool View Room: US$180–380/night (PP sharing US$180–230, single US$310–380), overlooking the garden swimming pool
  - All rooms: private en-suite bathrooms, WiFi, smart TV, full breakfast included (breakfast served at Wabi Sabi)
- **Amenities:** Outdoor swimming pool (garden setting, beside the wood-fired pizza oven, shaded loungers, poolside drink/snack service), wellness centre/spa ("Activate Body Therapy" — gym, massage, sauna, steam), free WiFi throughout, secure on-site parking + extra street parking + 24-hour security/surveillance, airport pickup/drop-off via "professional drivers," limited room service from Wabi Sabi's select menu.
- **Reservation contact (hotel-wide, NOT Wabi Sabi's own number):** **+256 (0) 701 145 240** — listed as a tel: link on the homepage and contact page, described as "toll-free."
  - Source: https://www.hemingwaysentebbe.com/ and https://www.hemingwaysentebbe.com/contact.html
  - **Note:** This number (+256 701 145 240) is DIFFERENT from the Wabi Sabi-specific number given in the brief (+256 709 768663). They may represent different lines (hotel reservations vs. restaurant direct), both could be legitimate, or one could be a placeholder — could not be cross-verified against the Google listing itself.

**Inference / context notes:**
- The brief's coordinates (0.0460137, 32.4632966) and the Google Maps listing's pin coordinate (0.0460083, 32.4658715) both place "Wabi-Sabi Entebbe" within roughly 250–300 meters of each other, in the same general area along/near Mugwanya Rd, Entebbe — consistent with the listing being inside or immediately adjacent to the Hemingways Hotel compound. Could not independently verify exact building footprint without satellite/street-view access.
- "Hemingways" is also the name of an established hospitality group with properties in Nairobi (Kenya), East London (South Africa), and other East African luxury lodges (e.g., "Hemingways Collection," hemingways-collection.com; "Hemingway's Luxury Tented Camp" in Gulu/Paraa, Uganda). No evidence was found confirming or denying a corporate relationship between "Hemingways Hotel Entebbe" (hemingwaysentebbe.com) and the Hemingways Collection group — this appears to be a separate, independently-branded property reusing the "Hemingways" name. **This is an open question, flagged as a gap below**, not a verified fact either way.
- No TripAdvisor, Booking.com, Agoda, or similar third-party listing for "Hemingways Hotel Entebbe" (the Mugwanya Rd property) could be located — consistent with the brief's framing of a brand-new (June 2026) business with limited indexed presence.

---

## Photos / Visual Notes

**Google Maps owner photos:** Could not be retrieved — the Maps place page did not render photo URLs in any static-fetch attempt (no `lh3.googleusercontent.com` image URLs were found in any response body).

**Hemingways Hotel Entebbe website imagery (hemingwaysentebbe.com) — referenced image paths found in page source (design-relevant context, NOT confirmed as Wabi-Sabi's Google listing photos, but likely overlapping subject matter since Wabi Sabi is the hotel's restaurant):**

These are relative image paths embedded in the site's HTML (e.g., `img/slider/1.jpg`, `img/rooms/8.jpg`, `img/spa/4.jpg`) — full URLs were not resolved/verified as live, and captions/alt-text were not present in the fetched markup, so descriptions below are based on the surrounding page copy only:

- `img/slider/1.jpg` — associated with the "Story Behind the Design" blog post (hero/header image for the design narrative).
- `img/slider/2.jpg` — associated with "Evenings at Hemingways Hotel Entebbe" (sunset/evening ambience theme: "soft golden lighting... through the archways and across the marble floors... exposed wooden beams above the restaurant and reception").
- `img/slider/3.jpg` — associated with "Arriving at Hemingways Hotel Entebbe" blog post.
- `img/slider/5.jpg` — associated with "The Penthouse Experience" blog post.
- `img/spa/1.jpg` — associated with "Experiences & Amenities" blog post (Dining at Wabi Sabi section + wellness centre).
- `img/spa/4.jpg` — associated with "The Health Club & Pool" section (outdoor pool, garden, loungers).
- `img/rooms/1.jpg`, `img/rooms/2.jpg`, `img/rooms/8.jpg`, `img/rooms/18.jpg`, `img/rooms/lv.jpg`, `img/rooms/st.jpg` — room category photos (Classic/"st" = standard, "lv" = lake view, pool view).
- `img/team/robin.jpeg` — author headshot ("Robin Sparks") used across all blog posts.

**Design-relevant visual themes described in copy (verified textual descriptions, not confirmed images):**
- **Materials/palette:** "warm African wooden finishes," "exposed wooden beams," "archways," "marble floors," natural light, open spaces — an elegant, warm, East-African-contemporary palette (wood tones + marble/white + soft/golden lighting).
- **Restaurant interior specifically:** "elegant interiors, exposed beams, and a stylish sushi bar" (per blog-post-3.html).
- **Evening ambience:** "soft golden lighting glows through the archways," "exposed wooden beams above the restaurant and reception create a warm and intimate atmosphere," views toward Lake Victoria, cocktails at the bar, sushi bar activity, pizza oven crackle.
- **Plating/food style:** described as "fresh sushi and beautifully plated dinners," "casual lunches," "handcrafted cocktails," "freshly made pizzas... served hot from the oven in the garden setting."
- **Signage/logo:** No logo, signage, or branding-specific imagery was found or described in any source.

**Instagram/TikTok:** The brief lists @wabisabi_entebbe (Instagram) and @wabisabi.entebbe (TikTok). A prior-session fetch attempt of instagram.com/wabisabi_entebbe returned only the page `<title>` ("Wabi-Sabi Entebbe (@wabisabi_entebbe) • Instagram photos and videos") with no post content, bio text, follower counts, or image URLs — Instagram requires authenticated/JS-rendered access not available to static fetchers. **Not publicly available via this research method.**

---

## Sources

1. Google Maps short link (provided) → resolved redirect target:
   `https://maps.app.goo.gl/LHSFDCamSVV1BpMj9` → `https://www.google.com/maps/place/Wabi-Sabi+Entebbe/@0.0460137,32.4632966,977m/data=!3m2!1e3!4b1!4m6!3m5!1s0x177d87d012feeda5:0x98d87b454c679214!8m2!3d0.0460083!4d32.4658715!16s%2Fg%2F11z8szdgvn` — used ONLY for the place name slug, coordinates, and Place-ID/CID extracted from the URL string itself. Full place-card content (hours, category, photos, price level) was not retrievable.
2. Hemingways Hotel Entebbe — official website, homepage: https://www.hemingwaysentebbe.com/
3. Hemingways Hotel Entebbe — Restaurant subpage: https://www.hemingwaysentebbe.com/restaurant.html
4. Hemingways Hotel Entebbe — Contact page: https://www.hemingwaysentebbe.com/contact.html
5. Hemingways Hotel Entebbe — Blog: "The Story Behind the Design of Hemingways Hotel Entebbe" (15 Jan 2026): https://www.hemingwaysentebbe.com/blog-post-1.html
6. Hemingways Hotel Entebbe — Blog: "Evenings at Hemingways Hotel Entebbe" (20 Jan 2026): https://www.hemingwaysentebbe.com/blog-post-2.html
7. Hemingways Hotel Entebbe — Blog: "Experiences & Amenities at Hemingways Hotel Entebbe" (05 Feb 2026): https://www.hemingwaysentebbe.com/blog-post-3.html
8. Instagram profile (title only, no content retrievable): https://www.instagram.com/wabisabi_entebbe/

---

## Confidence & Gaps

**High confidence (verified, consistent across multiple pages of the official hotel site):**
- Wabi Sabi is the named in-house/signature restaurant of "Hemingways Hotel Entebbe," located on Mugwanya Road, Entebbe, near Entebbe International Airport, overlooking Lake Victoria.
- Cuisine concept = "Asian fusion" + dedicated sushi bar + international/traditional dishes + cocktails + wood-fired pizza (poolside).
- Hotel is a purpose-built, four-storey boutique property with an East-African-contemporary design language (wood, marble, archways, exposed beams, natural light).
- Google Maps listing name (per URL slug) = "Wabi-Sabi Entebbe."
- Listing pin coordinates ≈ 0.0460083, 32.4658715 (close to, but not identical to, the brief's 0.0460137, 32.4632966).

**Gaps — Not publicly available via this research:**
- Exact category/type tag as shown on the Google Business Profile (e.g., "Japanese restaurant," "Asian restaurant," "Sushi restaurant," "Restaurant").
- Full street address string as displayed on the Google listing (only "Mugwanya Rd, Entebbe" is known from the brief, not confirmed against the live card).
- Plus code.
- Opening hours (any day) — no source, official or third-party, lists hours for Wabi Sabi or for "Hemingways Hotel Entebbe."
- Price level ($/$$/$$$) on the Google listing.
- Service options (dine-in/takeaway/delivery/reservations) as configured on the Google listing.
- "Website" field as shown on the Google card (the brief notes wabisabi-ug.com returns 401/private).
- Owner-uploaded photos on the Google Business Profile — none could be retrieved; image URLs from lh3.googleusercontent.com did not surface in any fetch.
- Instagram (@wabisabi_entebbe) and TikTok (@wabisabi.entebbe) post content, bios, and imagery — pages require JS/auth not available to static fetch tools.
- A discrepancy between two phone numbers exists: brief's Wabi Sabi number (+256 709 768663) vs. the hotel-wide reservation number found on hemingwaysentebbe.com (+256 701 145 240). Neither could be cross-checked against the Google listing card itself.
- Relationship (if any) between "Hemingways Hotel Entebbe" (hemingwaysentebbe.com, this property on Mugwanya Rd) and the established "Hemingways Collection" hospitality group (Nairobi, East London, etc.) — unconfirmed either way.
- No third-party aggregator (TripAdvisor, Booking.com, Agoda, Yelp, local Entebbe restaurant directories such as yellow.ug or evendo.com) returned any entry for "Wabi Sabi Entebbe" or "Hemingways Hotel Entebbe" — consistent with a very new, not-yet-indexed business as stated in the brief.

**Methodological note:** Google Maps place pages are JavaScript-rendered single-page applications. Every available static-fetch method (WebFetch with redirect-following, raw HTTPS GET on the resolved `/maps/place/...` URL, the mobile "maps lite" endpoint at `google.com/maps?cid=...`, and a constructed `place_id:` query URL) returned either an empty app shell, a generic "Open in the Google Maps app" prompt, or a blank Maps homepage shell — none returned the populated place card (name/category/hours/photos/reviews) that a browser with JS execution would show. A headless-browser or Maps-API-key-based tool would be required to retrieve the remaining listing fields.
