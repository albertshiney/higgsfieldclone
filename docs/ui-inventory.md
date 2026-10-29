# Higgsfield UI inventory (for a UX clone)

Captured 2026-09-26, signed out, at 1440×900 (desktop) and 390×844 (mobile, iPhone UA, DPR 2).
The original live-site captures described below were not included in the supplied Git repository. A new signed-out capture set was saved locally on 2026-10-30 as `docs/screens/higgsfield-{home,image,video,audio,effects,community,pricing,library}-{1440,390}.png`; these third-party reference images are intentionally Git-ignored. The folder also contains tracked Vireo comparison screenshots. Full design-token dump: `design-tokens.json` (346 CSS custom properties read from the September live app).

**2026-10-30 refresh:** The [live home page](https://higgsfield.ai/) has a different top link set and feature carousel from the September inventory: Genjutsu, Content Factory, Playable, AI Influencer, and Kling 4.0 are prominent. The video generator at `/ai/video?model=seedance_2_5` still has a narrow left control panel, a right How it works canvas, and a bottom Generate action (captured at 1440 px). `/library/all` redirected to `/generate` while signed out; mobile `/audio` redirected to `/mobile/audio`, and its first capture remained on a loading spinner. These captures document visible public states only; signed-in history and payments remain unverified. No forms or generation controls were submitted.

**How the captures were made:** Firecrawl had no credits left, so every screenshot was taken with local headless Chrome (Playwright, `channel="chrome"`). Non-essential cookies were rejected on every visit. Google One Tap requests were blocked. No forms were submitted, no Generate or checkout was clicked, and I never signed in.

**What was not reachable:**
- Everything behind sign-in: the credit pill, the avatar menu, real generation tiles.
- The community lightbox. Opening it triggered a "Verification Required" slider challenge (a bot check). I did not interact with it. The lightbox layout below comes from its DOM, read before the challenge covered it.

Measurements are CSS px at 1440 wide unless noted. Colours are computed values. Wherever the app defines a token, its name is given (for example `--color-surface-primary`).

---

## 1. Global chrome

### 1.1 Promo bar (top of every marketing and generator page, not shown on /pricing)
- Full-bleed, **44–45 px** tall, bg **#D1FE17**, outer glow `0 0 12px rgba(209,254,23,.5)`.
- Centred content: a tag icon, a 14 px/500 line in #131517, and a **white pill button** ("Get your discount"): 24 px tall, radius 8, 12 px/600, dark text.
- Close "×" at the far right: a 28×28 hit area, radius 8.
- It scrolls away with the page and is not sticky. On mobile the text wraps to two lines and the bar is about 52 px tall.

### 1.2 Top nav: two sizes
**Expanded** (home at scroll 0, /pricing, /effects landing):
- Row height **52 px** (y 45→97), 16 px side gutter.
- Logo: a **32×32** white rounded square (radius 8) holding a black squiggle mark.
- Left group, in order: `Explore · Image · Video · Audio · MCP · API [New]` | a 1 px vertical divider | `ChatGPT Plugin · Genjutsu · Effects · Cinema Studio · Contests · Marketing Studio · Supercomputer · 3D Jutsu [New] · Edit · Academy · Community · Plugins · Canvas · Originals`.
- The link row overflows horizontally. It is clipped with a **right-edge fade mask** (ends at about x 990) and is not wrapped.
- Link style: 14 px/500 Inter, padding 4×8, radius 8, height 28.
  - Inactive: #A8A8A8.
  - Hover: #FFFFFF on a white 5% background, with a 200 ms `cubic-bezier(.4,0,.2,1)` transition.
  - Active: lime #D1FE17 text with no background.
  - "Contests" is always drawn in a pale gold.
- `New` badge: a lime pill, 10–11 px/700, dark text, radius 4, height 16.
- Right group, in order:
  - **Pricing** pill: a tag/diamond icon and label, 36 px tall, radius 10, bg white 5%, inset sheen `inset 0 1.5px 3px rgba(255,255,255,.05)`. A **pink "30% OFF" micro-badge** (#FF005B, white 10 px/700, radius 4) hangs centred under it and overlaps the bottom edge.
  - **Enterprise** pill: same style, with a sparkle icon.
  - **Globe** icon button, 36×36.
  - 1 px divider.
  - **Login**: 36 px tall, radius 10, lime text on lime 8% (`rgba(209,254,23,.08)`).
  - **Sign up**: 36 px tall, radius 10, lime bg, #1A1A1A text, 14 px/500.

**Compact** (every app/generator page, and the sticky state after scrolling on home):
- Row height **36 px**, 24 px logo, the same links.
- Buttons shrink to **24 px** tall with radius 8 and padding 0×10.
- The nav row is `position: sticky; top: 0` and sits on the page bg with no blur.

**Mega menu** (hover on `Image` or `Video`; see `home-navhover-image-1440.png`):
- Panel anchored under the nav at x 16, about **888 wide**, up to 802 tall, scrolls internally with a hidden scrollbar. Radius 20, bg #131517, 1 px hairline border.
- Two columns, each with a small grey heading ("Features" and "Models", 14 px, #898A8B).
- Rows are about 64 px: a 48×48 icon tile (radius 10, bg #1C1E20, hairline border), then a 14 px/500 white title over a 14 px #898A8B description.
- Italic **TOP** (pink) and **NEW** (lime) badges overlap the icon tile's top-left.
- `Explore` has no menu.

**Signed-in chrome** (not observable; inferred):
- Login/Sign up are replaced by a **credits pill** (sparkle icon plus balance), a lime **Upgrade** pill, and an avatar that opens an account menu.
- Mobile community shows the same Upgrade pill: lime bg, diamond icon, radius full, 13 px/600, about 32 px tall.

### 1.3 Footer (marketing pages)
- A full-bleed **lime (#D1FE17) block about 744 px tall**.
- Left: "AI-NATIVE CREATIVE SUITE" in Space Grotesk 700, about 40 px, uppercase, #131517, two lines.
- Five link columns from x 448, each about 205 wide:
  - Create
  - Video Models, with Image Models below
  - Studios, with Soul below
  - Platform, with Resources below
  - Company, with Community below
- Column headings: 16 px/500 at about 48% opacity dark. Links: 16 px/500 #131517 on a 36 px rhythm.
- Bottom row inside the lime block: address on the left, socials text-links on the right (X / Twitter, Youtube, LinkedIn, Tiktok, Discord).
- Below it, a **dark legal bar about 68 px tall**:
  - Left: © line, 14 px, #898A8B.
  - Right: flag with "English ▾", then Help center, Cookie Notice, Cookie Settings, Terms, Privacy (14 px/500, white).
- /pricing uses only the dark legal bar.

### 1.4 Mobile chrome (390)
- **Marketing header:** logo 32 plus the "Higgsfield" wordmark (18 px/600), an Instagram glyph, a Pricing pill with a pink "21% OFF" badge, and a lime Sign up button (36 tall).
- **Bottom tab bar:** sticky, 57 px, transparent over content.
  - Tabs: `Home · Community · [center create] · Library · Profile`. Labels are 11 px; inactive #898A8B, active white.
  - The **center create button** is a lime 66×44 block (radius 12) with a black sparkle and a 3D bottom edge. It opens **/flow**, a "Create" hub (see §10).
- **App pages** (community, library) swap the top header for: a sidebar-toggle icon on the left, a centred page title (16 px/600), and a lime Upgrade pill on the right.
  - The sidebar is a left **drawer about 330 wide**, containing:
    - logo and name, plus a collapse icon;
    - "+ New chat" row (lime text on lime 10%);
    - Explore;
    - MCP, with a lime "Connect" pill;
    - Higgsfield Genjutsu;
    - Community;
    - Library.
  - The drawer footer holds a "Bring your ideas to life" blurb and a white **Log in** pill (48 tall, radius full).
- **Generator pages** become full-screen sheets. See §10.

### 1.5 Cookie banner (for reference; we clicked Reject)
- Bottom-right card, about 384×346, radius 16, dark surface.
- Title "Cookie Notice", 18 px/600.
- Three stacked 40 px buttons, all radius 10:
  - lime "Accept All Cookies";
  - white 10% "Reject Non-Essential Cookies";
  - outline "Cookie Preferences".

---

## 2. Design language

### 2.1 Colour (hex, with token names)
| Role | Value | Token |
|---|---|---|
| Page background (html/body) | **#0F1113** | `--color-surface-tertiary` |
| App shell / panel bg | **#131517** | `--color-page-primary` (also `#131416` = `--hf-color-background-primary`) |
| Card / input surface | **#1C1E20** | `--color-surface-primary` (also #1C1E21) |
| Raised / hover surface | **#23262A** · hover **#2A2D32** | `--color-surface-secondary`, `--color-surface-secondary-hover` |
| Settings pill bg (image composer) | #222222 / #1B1B1B | `--color-neutral-surface-subtle` |
| Glass (popovers, lightbox panel) | #23262A at 75–95% plus backdrop blur | `--color-q-background-glass` = #23262ABF |
| **Accent lime** | **#D1FE17** | `--color-q-brand-primary`, `--hf-color-button-brand` |
| Lime scale | 100 #FBFFEC · 200 #F6FFD1 · 300 #EEFFA7 · 400 #E1FE68 · 500 #D1FE17 · 600 #B2D814 · 700 #8EAD10 · 800 #6D840C · 900 #4F6109 · 1000 #344006 · 1100 #1F2603 · 1200 #111402 | `--hf-color-lime-*` |
| Lime alphas used for tints | 5% (hairline borders on pills/inputs), 8% (Login bg), 10%, 15%, 20%, 24% | `--hf-color-transparent-lime-*` |
| Secondary accent (discounts, % OFF, Ultra) | **#FF005B** | `--hf-color-brand-pink` |
| Blue (TOP / BEST VALUE badges, Scale CTA) | #0256FE, badge gradient #4FC9DC→#32A2EE→#167BFF | `--hf-gradient-badge-blue` |
| Text primary | **#F7F7F8** (body) / #FFFFFF | `--color-text-primary` |
| Text on lime | **#131517** / #1A1A1A / #14151A | `--color-btn-accent-text` |
| Text secondary | **#898A8B** (also #828282) | `--color-font-secondary` |
| Text tertiary / nav idle | #626262 · nav #A8A8A8 | |
| Disabled text | #737475 / #484E56 | |
| Borders | card hairline **#D9D9D90A**, default white 10% (#FFFFFF1A), subtle white 5%, strong white 20%, focus **#D1FE17** | `--color-separator-card`, `--hf-color-border-*` |
| Overlay | #000000CC (modal scrim), rgba(0,0,0,.6) mobile sheets | `--color-page-overlay` |
| Status | success #53C546 / #2EB844, error #E72930 / #FA0019, warning #FFBE4C / #FFEF33 | |

### 2.2 Typography
- **Body / UI:** Inter, weights 400/500/600, 16/24 by default. The system also defines "Inter Display" (`--font-primary`).
- **Display:** **Space Grotesk 700, UPPERCASE, letter-spacing −4% (−0.04em)**. Line-height is tight, about 1.0–1.25. This is the "condensed/uppercase" look: Space Grotesk is not condensed, but the −4% tracking reads condensed. Used for every section heading, preset/effect tile title, plan names, badge text and hero headlines.
- **Display size scale** (tokens `--text-brand-h-*-caps-bold`): xl 64/72, lg 48/56, md 40/48, sm 28/36, xs 24/30, xxs 20/28. Observed uses:
  - 96/100 on the /effects H1 (−3.84 px tracking);
  - about 72 on the effect detail H1;
  - 48 on canvas empty-state headlines;
  - 40 on the auth carousel title and footer;
  - 36/40 on the image empty-state and sign-up promo;
  - **28/36 lime for home section titles**;
  - 20 on preset tiles;
  - 16/24 on top carousel card titles.
- **Inter scale:** xxs 10 · xs 12 · sm 14 · md 16 · lg 18. Headings h-xxs 20 → h-xl 64 use −1% to −2% tracking and weights 500–700.
  - Plain-case Inter 600 headings: "Upgrade your plan" (48), "Welcome to Higgsfield" (30), community "Originals by Higgsfield" (20).
- **Micro-badges** (NEW / TOP / PREMIUM / BEST VALUE / % OFF): Space Grotesk 700 italic, 10–12 px, uppercase, a slightly skewed pill with radius about 3–4 px.
- A mono face (Space Mono / JetBrains / IBM Plex Mono) appears only for technical labels in Cinema Studio.

### 2.3 Shape, elevation, motion
- **Radii** (`--radius-q-*`): 4, 6, **8** (nav links, chips), **10** (buttons), **12** (pills, tiles, popovers, media), **16** (cards, pickers), **20** (generator panel, canvas), **24** (modals, big banners, auth), 26 (image composer outer), full (avatars, toggles).
- **Flat by default.** Elevation comes from surface steps (#0F1113 → #131517 → #1C1E20 → #23262A), not shadows. Tokens used:
  - Sheen: `inset 0 2px 3px #ffffff0d` (`--hf-shadow-sheen`).
  - Raised: sheen plus `0 4px 24px -8px #00000026`.
  - Popover drop: `0 4px 20px rgba(0,0,0,.2)`.
- **3D "keycap" CTA:** lime (and white or pink) primary buttons carry `inset 0 -3px 0 rgba(0,0,0,.43)`, a darker bottom lip.
  - The video Generate also has a radial fill: `radial-gradient(#EFFE17 40%, #D1FE17 100%)`.
  - Its hover lowers the fill to lime 80%.
- **Glass:** popovers and the lightbox panel use #23262A at 75–95% with backdrop-blur about 10–20 px and a 1 px white 4–5% border. The image composer uses `backdrop-filter: blur(10.45px)`.
- **Motion:**
  - Colour and background transitions: 200 ms `cubic-bezier(.4,0,.2,1)`.
  - Tokens: durations 80 ms–1.4 s; eases swift `(.2,0,0,1)`, out-expo `(.16,1,.3,1)`, spring `(.34,1.56,.64,1)`, emphasized `(.32,.72,0,1)`.
  - Every gallery tile is an **autoplaying, muted, looping `<video>` with a poster**. Videos pause when off-screen; about half were `paused` in viewport checks.
  - Carousels advance with **segmented progress bars**: 2–4 px tall, white 20%, the active segment fills white.

### 2.4 Buttons, pills and chips
| Kind | Spec |
|---|---|
| Primary lime | bg #D1FE17, text #1A1A1A 14–16/600, radius 10–12, height 36 (nav) / 40 / 48 (CTA), keycap inset bottom shadow |
| Secondary white | bg #FFF, text #131517, same shape, keycap shadow ("Learn more", "Install … MCP", "Get Starter") |
| Pink | gradient #FF3D8A→#FF005B, white text (Ultra CTA, mobile Basic Monthly) |
| Ghost / tinted | lime text on lime 8–15% bg ("Login", "View all presets ↗", "Recreate", "Try for free" on hover) or white on white 5% ("Video", "Upscale", filter buttons) |
| Outline | transparent, 1 px white 10%, radius 12, 62 tall (auth providers) |
| Setting pill (image composer) | 40 tall, radius 12, bg #222, 1 px lime 5% border, 14/500 white 60%, leading icon |
| Setting tile (video panel) | 40 tall, radius 6–8, bg #1C1E20, icon plus value 16 px white |
| Segmented control | container bg #1C1E20, radius 12, padding 4; segment radius 10, active bg #2A2D32 white 600, idle #898A8B |
| Text tabs | 14–15 px, active white with a 2 px white underline, idle #898A8B |
| Filter chip (effects) | 32 tall, radius 10, 14/500 UPPERCASE white, bg white 1%, border lime 5%, hover bg rgba(233,234,236,.14) |
| Toggle switch | 36×20, track grey #3A3D42 off / **lime on**, white knob (community mobile shows green #1FC24A for "Annual" on pricing) |
| Badge pills | NEW = lime/dark italic; TOP = pink or blue gradient italic; PREMIUM = lime italic; BEST VALUE = blue with diamond; "x% OFF" = pink with white italic; "Optional" = 11 px on white 5%, radius 6 |

---

## 3. Explore / home (desktop), top to bottom
Files: `home-1440.png`, `home-1440-full.jpg` (first 9,000 px of a 12,990 px page), `home-scrolled-1440.png`, `home-footer-1440.png`, and the hover shots.

1. **Announcement carousel.**
   - Three 16:9 cards visible, each **512×288** with radius about 8, starting at x 16 with a 20 px gap. The third card bleeds off the right edge; the row scrolls horizontally.
   - Under each card: a title (Space Grotesk 16/24 bold uppercase) and a description (14 px #898A8B).
   - Cards are media (image or video). The whole card is a link.
2. **Sign-up promo, with a quick-tool grid beside it** (y about 497).
   - Left: a promo card **640×272**, radius 20, full-bleed image.
     - Headline 36/40 Space Grotesk uppercase: line 1 white, line 2 lime.
     - Three check bullets, 13 px, white 70%.
     - Lime CTA, 48 tall.
   - Right: a **3×2 grid of tool cards**, each about **237×124**, radius 16, bg #1C1E20, with a 1 px hairline and inner padding 16.
     - Top-left: a 20 px line icon.
     - Top-right: a type chip ("Video" or "Image" with an icon; bg white 5%, radius full, 12 px).
     - Bottom: a title (15/600 white), an optional italic badge, and a 13 px #898A8B description.
3. **MCP banner.**
   - Full width (1408), about 340 tall, radius 24, cinematic gradient image background.
   - Centred: a 24 px bold intro line, a huge gradient wordmark line (about 64 px Space Grotesk), a two-line 14 px description, and a white keycap CTA.
4. **Film festival block.**
   - A black card with radius 24.
   - Left: 3D artwork plus a headline stack.
   - Right: a **3×3 poster grid** (about 250×140 tiles, radius 8) that fades out at the bottom, with a gold keycap CTA ("Explore all projects").
5. **Section: VISUAL EFFECTS.**
   - Heading 28/36 lime; subtitle 14 #898A8B; a right-aligned lime "Try for free" (48 tall).
   - A **5-column masonry** (column 275, gap 8, tile radius 12) of looping videos.
   - The section is clipped at about 900 px and **fades to the page bg**, with a centred **"View all presets ↗"** pill (lime text on dark lime tint, blurred).
   - **Tile hover:** darkens the tile about 50%, centres the title (Space Grotesk about 28 px uppercase white), and shows a "✦ Recreate" chip (lime text on lime 15%, radius 10). See `home-tilehover-1440.png`.
6. **Genjutsu (model promo block).**
   - A black card with radius 24 and a 1 px border.
   - A "New model" chip (logo icon, lime text, lime 10% bg, border), a lime heading, a two-line description, and CTAs on the right ("Start generating" lime, "Learn more" white).
   - Contents: a 5-column masonry, then the fade, then "View all presets ↗".
7. **SEEDANCE 2.5 feed.**
   - A **4-column masonry** (344 wide, gap 8, radius 12) of community generations.
   - **Hover:** a top gradient scrim, a **24 px avatar and 14 px username** top-left, and a **like pill** top-right (heart plus count; glass: black 30%, 1 px white 20%, radius full, 32 tall). See `home-modelfeed-hover-1440.png`.
   - Fade, then "View all of Seedance 2.5 ↗".
8. **EXPLORE THE INSIDE OF EVERY PROJECT.**
   - A 4-column grid of project cards, each about **340×240**, bg #1C1E20, radius 16, 1 px hairline.
   - Each card: a 16:9 thumbnail inset 4 px with radius 12, then a footer row with:
     - a lime logo avatar (20);
     - the title (13/600 white) plus "by Author" (#898A8B) and a verified glyph;
     - a "⊘ Public" chip (1 px border, radius 8, 12 px).
   - Two rows, a fade, then "Explore community ↗".
9. **SUPERCOMPUTER banner.**
   - 1408×430, radius 24, a **lime neon inner glow** around the edge, and a dark green perspective-grid background.
   - Floating mini-UI cards, a centred about 60 px lime Space Grotesk headline, a subtitle, and a white CTA.
10. **GPT IMAGE 2**: a 4-column masonry. **Loading skeletons are plain #1C1E20 rectangles at radius 12** (visible in `home-1440-full.jpg`).
11. **Canvas banner**: teal→navy gradient, radius 24, "NEW FEATURE" eyebrow (letter-spaced, 14 px), headline, white "✦ Try Canvas" button, floating collage.
12. **MARKETING STUDIO**: 4-column masonry.
13. **SEEDANCE 2.0**: a **uniform 4-column 16:9 grid** (344×193, gap 8).
14. **HIGGSFIELD SOUL CINEMA** and **HIGGSFIELD SOUL 2.0**: masonry sections.
15. **EXPLORE MORE AI FEATURES**: a wrap of link chips (32 tall, radius full, bg #1C1E20, 14 px).
16. Footer (§1.3).

Pattern: every section is an eyebrow-less **lime uppercase title + grey one-liner + media wall + bottom fade + centred "View all … ↗" pill**. Side gutters are 16 px on home and 48 px on community.

---

## 4. Generator pages

### 4.0 Shell (video, audio, effects-use, edit tabs)
- Below the compact nav, a two-pane layout with 16 px outer gutters and an **8 px gutter** between panes.
- **Left control panel: 320 px wide** (audio and effects: 340), `x 16, y 89`, full height minus 16.
  - bg **#131517**, radius **20**, 1 px **#D9D9D90A** border.
  - The content scrolls internally.
  - The **Generate button is sticky at the panel bottom** (content scrolls underneath it).
- **Right canvas:** fills the rest (1080 wide at 1440), radius **20**, 1 px white 10% border, transparent bg.
  - Top toolbar (48 tall) inside it.
- The **image page is different**: no left panel, and a bottom-docked composer (see 4.1).

### 4.1 Image generator (/ai/image?model=gpt_image_2)
Files: `image-1440.png`, `image-modelpicker-1440.png`, `image-aspect-1440.png`, `image-quality-1440.png`, `image-resolution-1440.png`, `image-auto2-1440.png`.

- **Empty state (centred in the viewport):**
  - A fan of 4 tilted photo cards (3 px light border, radius 12; the third card is circular).
  - Headline 36/36 Space Grotesk uppercase on two lines ("START CREATING WITH" in white, then the model name in lime).
  - Subtitle 16 px #898A8B.
- **Academy nudge:**
  - A dismissible pill banner under the nav, centred, **about 458×58, radius full, bg #1C1E20**.
  - Contents: a book icon in a 38 px circle, a title (14/500) with a sub (12 #898A8B), a white "Learn now" pill, and a 38 px round × (white 5%).
- **Floating promo card** at top-right: about 232×270, radius 16, gold theme, "Live now" lime pill, round × close.
- **Grid-size slider** at top-right under the nav (about 145 wide, white knob). It controls results-grid density once there are generations.
- **Composer**, docked to the bottom centre:
  - Outer shell **1120×138**, radius **26**, 2 px padding forming a gradient ring (`rgba(15,17,19,.96)` plus `linear-gradient(115deg, rgba(36,43,50,.12) 27%, rgba(219,219,219,.12) 85%)`).
  - Inner box radius 24, 1 px lime 5% border, `backdrop-filter: blur(10px)`, padding 22.
  - **Row 1:** a **"+" add-reference button** (32×32, radius 10, bg #1B1B1B, 1 px lime 10% border), then the prompt input (14 px, placeholder "Describe the scene you imagine", single line that autogrows).
  - **Row 2**, a horizontally scrolling pill row with ‹ › scroll buttons at the edges:
    - **Model pill** (160 wide, model logo, name, `›`).
    - Aspect ratio (frame icon, "Auto").
    - Quality (diamond icon, "High").
    - Resolution ("2K").
    - Background ("Auto").
    - **Batch stepper** ("– 1/4 +", with the "/4" dimmed).
  - All pills are 40–42 tall, radius 12, bg #222.
  - **Generate block** on the right: **144×84**, radius 12, bg lime 80% with a 1 px lime border. Line 1 "Generate" (14–16/600, dark). Line 2 a sparkle, a ~~struck~~ old price "8.5", and the new price "6.5".
- **Popovers** open upward from their pill.
  - Shared style: bg #1B1B1B, radius 12, 1 px lime 5% border, header label 13 px #898A8B.
  - Rows 40–48 tall, radius 8. The selected row has a white 5% bg and a ✓ on the right.

  | Popover | Width | Options |
  |---|---|---|
  | Aspect ratio | 200 | Auto, 1:1, 3:2, 2:3, 16:9, 9:16, 4:3, 3:4, 21:9. Each has a **shape glyph drawn to its ratio**. |
  | Quality | 300 | Low / Medium / High, each with a sublabel ("Fastest And Cheapest", "Balanced Visuals", "Best Visual Fidelity") |
  | Resolution | 300 | 1K / 2K / 4K, with pixel sublabels |
  | Background | 240 | Auto / Opaque / Transparent |
- **Model picker:**
  - A popover **402 wide, up to about 640 tall**, anchored above the model pill. Glass: #23262A at 95%, radius 16, 1 px hairline.
  - A search field row ("Search…", 40 tall).
  - **"✦ Featured models"** section label, then an **"All models"** section.
  - Rows **376×52**, radius 12, padding 6/12/6/6:
    - a 40×40 logo tile (bg #2A2D32, radius 8);
    - the name (13–14/500 white) with an italic **NEW** or **PREMIUM** badge;
    - a one-line description (11–12 #898A8B).
  - Selected row: white 5% bg with a lime ✓.
  - It is one long scrolling list: no grid and no provider grouping in the image picker.
- **History:** there is no History/How-it-works toggle on this page while signed out. Results presumably fill the area above the composer, sized by the slider.

### 4.2 Video generator (/ai/video?model=seedance_2_5)
Files: `video-1440.png`, `video-clean-1440.png`, `video-modelpicker-1440.png`, `video-presetpicker-1440.png`, `video-presetpicker-kling-1440.png`, `video-presetpicker-higgsfield-1440.png`, `video-duration-1440.png`, `video-aspect-1440.png`, `video-resolution-1440.png`, `video-bitrate-1440.png`, `video-history-1440.png`, `video-history-filter-1440.png`, `video-extend-1440.png`, `video-editvideo-1440.png`, `video-motioncontrol-1440.png`.

**Left panel, top to bottom** (content x 25, width 302):
1. **Mode tabs**: `Create Video · Edit Video · Motion Control`, text tabs 14–15 px, 44 tall. The active tab is white with a 2 px white underline.
   - Motion Control changes the route to `/ai/video/motion?model=kling-3-motion-control`.
2. **Preset/model hero card** (302×131, radius 12):
   - Looping cover video.
   - Bottom-left: the preset name (**Space Grotesk 20 bold uppercase lime**, e.g. GENERAL) over the model name (12 px white 70%).
   - Top-right: a **"✎ Change"** chip (24 tall, radius 8, bg #1B1B1B at 30%, 1 px white 6%, blurred).
   - Motion Control shows "📖 How it works" and a description line instead.
3. **Segmented control** "References | Extend Video": the container is 302×48 (#1C1E20, radius 12, padding 4) with 147×40 segments.
   - Edit Video shows "Prompt | Draw" instead.
4. **Reference dropzone**, 302×118:
   - 1 px **dashed** border at white 12%, radius 16.
   - Three overlapping 32 px circle icons (image, video, audio; bg #2A2D32).
   - "Add references" (14/500 white 70%) over "Image, Video or Audio" (12 #898A8B).
   - Mode variants:

   | Mode | Dropzones |
   |---|---|
   | Extend Video | "Add video to extend / Up to 30s", then "Add elements or references / Up to 50 image or audio", then a **Direction** select ("Sequel ⌄") |
   | Edit Video | "Add a video to edit / Up to 30s", then an elements zone |
   | Motion Control | two side-by-side 142×190 tiles: "Add motion to copy / 3–30 s" and "Add your character / Image with visible face and body" |

5. **Prompt card** (302×158, bg #1C1E20, radius 16, padding 12):
   - Label "Prompt" (14 #898A8B).
   - A multiline textarea (14/20, placeholder #898A8B).
   - A chip row: **"@ Elements"** (bg #131517, radius 8, 12/600) and **"🔊 On"** (audio toggle chip).
   - Typing `@` references elements. There is no visible char counter or enhance toggle on video; the audio page has a counter.
6. **Model row** (302×48, bg #1C1E20): "Model" (12 #898A8B) over "Seedance 2.5" (14 white) with a small lime bars glyph, and `›` on the right. It opens the model picker.
7. **Settings tiles**, three in a row (106 / 90 / 90 × 40, gap 8, bg #1C1E20), each an icon plus a 16 px value: ⏱ `5s`, ▯ `16:9`, ◇ `1080p`.
   - Motion Control uses rows instead: "Quality 720p ›", "Scene control mode" (a toggle plus a Video/Image segmented control with helper text), and "Advanced settings ⌄".
8. **Bitrate row** (302×40, white 5%): "Bitrate", with the value "✦ High" in lime and `›`.
9. **Sticky Generate** (286×48, radius 12, lime radial gradient, keycap shadow):
   - Label "Generate ✦ ~~80~~ 60" (16/600 #14151A, with the struck price in dark 50%).
   - Its cost changes by model (e.g. "Generate ✦ 7" on Kling Motion Control). Edit Video shows "Generate" alone until inputs exist.

**Popovers:**
- **Duration:** a 334×98 card (bg #0F1113, radius 16, shadow `0 4px 20px rgba(0,0,0,.2)`) titled "Choose duration" with a **slider** (per model range, e.g. 4–30 s).
- **Aspect:** a listbox 182 wide (bg #171717, radius 12, 1 px #222) with 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 and a ✓ on the selected option.
- **Resolution:** same style; 480p / 720p / 1080p.
- **Bitrate:** a glass card 302 wide with two icon rows, "High — Less compression · larger size" and "Standard — More compression · smaller size".

**Model picker (video):**
- Glass popover 402 wide, anchored to the right of the panel at the Model row, with search.
- **Featured models** rows show **spec chips** under the name: `◇ 1080p`, `⏱ 4s-30s`, and "Edit Video" / "Audio" capability chips (grey #2A2D32, 11 px, radius 4). Badges: TOP (blue gradient), NEW (lime).
- **All models** lists provider **families** (Minimax Hailuo, FLUX.3 Video, Kling, Google Veo, Gemini Omni Flash, Higgsfield, Wan, Seedance, Grok Imagine, …), each with a one-line description. Each family is a group row that expands or flies out to its versions.

**Preset picker** (click "Change"):
- Takes over the **right canvas area** (not a modal).
- Top bar:
  - Horizontally scrolling **model tabs** with logos and NEW badges (Seedance 2.5, Higgsfield Genjutsu, FLUX.3 Video, Kling 3.0, Kling 3.0 Turbo, … about 30 tabs). The active tab is white with a 2 px underline.
  - A **Search** field (220×40, #1C1E20, radius 10).
  - A square **×** (40×40, radius 10, 1 px border).
- Body: a grid of **preset cards 200×266 (3:4), radius 12, gap 8, 5 per row**. Each card has a cover image or video and a bottom-left title (Space Grotesk 20 bold uppercase white over a dark scrim).
- Some models have one preset (GENERAL). Kling 3.0 has eight.

**Right canvas:**
- **Toolbar:** a segmented pair "🗀 History | 📖 How it works" (32 tall, 12/500).
  - Active: bg white 8% with white text. Idle: white 50%.
  - When History is active, the right side shows:
    - a **filter** icon button (40×36, white 2%, radius 10);
    - a ⤢ expand button;
    - a **size slider**;
    - a **List | Grid** toggle.
  - **Filter menu:** 220 wide, bg #131517, radius 12, ring white 5%. Contents:
    - "Type" group: `✦ All models ›` and `Date range ›` fly-outs;
    - "Activity" group: `♡ Liked`, `⤓ Downloaded`.
    - The code also has a hide-failed option.
- **Empty / How it works state** (shown signed out and when History is empty):
  - Left-aligned **48 px Space Grotesk headline** (e.g. "MAKE VIDEOS IN ONE CLICK") with a 14 px #898A8B sub.
  - **3 step cards** (300 wide; media area about 300×228, radius 16), each with an animated illustration, a 20 px uppercase title ("ADD IMAGE", "CHOOSE PRESET", "GET VIDEO") and a 14 px description.
  - Edit and Motion variants center the headline and add **"Step 1/2/3" chips** (bg #1C1E20, radius 6, 12 px) above each title.
  - A 68 px **academy strip** runs along the canvas bottom ("Don't know where to start?").

**Generation tiles** (not observable signed out; inferred from the app's job model):
- Job statuses in the bundle are **`queued`, `in_progress`, `completed`, `failed`, `nsfw`**, plus an IP/likeness check (**`ip_detected`**, `ip_check_finished`). "Errors or failed generations" is a History filter.
- Build tiles for each state:

  | State | Tile |
  |---|---|
  | Queued | skeleton #1C1E20 with a shimmer and a "Queued" label |
  | Generating | skeleton plus a progress or spinner and the elapsed time |
  | Completed | media, playing on hover for video |
  | Failed | dark tile with an error icon, "Generation failed", credits-refunded note and Retry |
  | Content-filtered (nsfw) | blurred or blank tile with a shield icon, "Blocked by content policy", Retry/Edit prompt |
  | IP-detected | the same blocked treatment, with IP copy |

- **Hover actions**, mirroring the lightbox: Recreate / Video / Upscale / Edit / Download / Share / Like. On community tiles, heart and download sit top-right.

### 4.3 Lightbox (from the community Shots DOM; the same component serves History)
- Full-screen dialog.
- **Background:** the same image, `filter: blur(64px); opacity: .5`, over #131416.
- **Media stage:** everything left of the side panel; the asset is centred with radius 12.
- **Side panel:** 368 wide, with an 8 px inset **glass card** (rgba(35,38,42,.75), radius 24).
  - **Header:** a 32 px round avatar, the username (16 px white) over "Author" (12 #828282), and a 32 px round close.
  - **Body** (scrolls):
    - "PROMPT" eyebrow (12/500 uppercase #828282) with a "⧉ Copy" button;
    - prompt text 14/20 white, clamped, with a "See all" expander;
    - "DETAILS" eyebrow;
    - key/value rows (14 px, key #828282 left, value white right): Model, Moodboard/Preset, Quality, Size, Created.
  - **Footer:** a 2-column grid of 40 px, radius 10 buttons:
    - **Recreate** (lime, #1A1A1A);
    - Video, Upscale, Edit, Download (white 5%);
    - a last row of half-width **Share** and **Like**.
- A full-screen transparent button behind the panel closes the lightbox on backdrop click.

---

## 5. Audio (/audio)
Files: `audio-1440.png`, `audio-voicechange-1440.png`, `audio-translate-1440.png`, `audio-modelpicker-1440.png`, `audio-advanced-1440.png`.

- Same shell; the left panel is 340 wide. **Tabs:** `Text to Speech · Voice Change · Translate`.
- **Text to Speech panel:**
  - "Upload media" dropzone (Optional tag; "Up to 3 Voices/Audios or Image"; three circle icons).
  - **Script** textarea card (info ⓘ; "Type @ to reference attachments").
  - **Model row** ("Seed Audio 1.0").
  - **Batch size** row ("– 1/4 +").
  - **Voice details** textarea (Optional; **0/500 counter** bottom-right, 11 px #898A8B).
  - **"⚙ Advanced settings ›"**: an inline accordion revealing Speed, Pitch, Volume and Expression sliders.
  - Generate. It is **disabled until the script has text**: lime at about 55% opacity (olive look) with dimmed text.
- **Voice Change:** "Pick a voice" (Required; "Choose a preset or an uploaded voice"), "Add your clip" (Required), Generate.
- **Translate:** the same pattern.
- **Audio model picker:** a glass popover 316 wide listing Seed Audio 1.0, ElevenLabs v3, Qwen Audio 3.0 TTS, MiniMax Speech 2.8 HD and Seed Speech, each with a one-line description. No badges.
- **Canvas:**
  - History | How it works, plus a "☰ Filters" button top-right.
  - Empty state: a centred 48 px headline ("TURN TEXT INTO SPEECH") with a sub.
  - **Two feature cards** (about 476×444, radius 24, bg #1C1E20, 1 px border). Each has a title (24 px Inter 500 white), a description (16 px #898A8B), and an animated UI illustration (voice chips with avatars; the settings panel).
  - Voice Change swaps in a single large hero illustration with a headline under it.
  - A small round "?" help button sits bottom-right.

---

## 6. Effects

### 6.1 Gallery (/effects). Files: `effects-1440.png`, `effects-grid-1440.png`, `effects-tilehover-1440.png`, `effects-collection-1440.png`.
- Pure black hero, centred:
  - Two pills: **"✦ TRY FOR FREE"** (lime text on lime 15%, radius full, glow) and **"ChatGPT logo Now in ChatGPT ›"** (dark with border).
  - **H1 "VISUAL EFFECTS" at 96/100 Space Grotesk 700, lime, −3.84 px tracking.**
- **Chip cloud**, centred wrap: about 45 chips, each 32 tall, radius 10, 14/500 UPPERCASE, bg white 1%, 1 px lime 5% border.
  - Hover: bg rgba(233,234,236,.14).
  - Some chips carry a lime superscript "new".
  - Chips are **links to the effect detail page** (`/effects/examples/<slug>`). They are not filters.
- Below: a **5-column masonry** (274 wide, gap 8, radius 12) of **autoplay muted looping videos with posters**.
  - **Hover:** dark overlay, centred title (Space Grotesk about 28 px uppercase white), and a "✦ Try for free" chip.
  - Page height is about 4,470.
- **/collection/effects:** the same idea with denser chips (28 tall, radius 6, 12–13 px). Tiles carry glass badges top-right ("✧ New", "Top Choice" with laurels).

### 6.2 Detail page (/effects/examples/floating-fall). Files: `effects-detail-1440.png`, `effects-detail-390.png`.
- "‹ Back" pill (32 tall, 1 px white 10%, radius 8).
- **H1 about 72 px Space Grotesk uppercase white.**
- Description, 14 px white 80%, max-width about 620.
- CTAs: **"✦ Try for free"** (lime keycap, 48 tall) and **"Try in ChatGPT"** (bg #1C1E20, border, ChatGPT glyph). On mobile the title also carries a lime italic **"1 FREE GEN"** badge.
- Examples: a 4-column masonry of looping videos (271 wide).
- "Try for free" leads to **/effects/use/<slug>**.

### 6.3 Effect "use" page (/effects/use and /effects/use/<slug>). Files: `effects-use-1440.png`, `effects-use-change-1440.png`, `effects-use-390.png`.
- **Left panel (340):**
  - Preset hero card with the title centred in lime Space Grotesk and a "✎ Change" chip.
  - Two dashed upload tiles side by side: **Character** (required) and **Location** (Optional). Each has a 40 px icon circle, a 14/500 title and a 12 px helper ("Select a PNG or JPG from your device").
  - A full-width **Products** (Optional) tile.
  - **Prompt** row with a **toggle switch** (off, which hides the textarea).
  - Two select tiles side by side: "Resolution 720p ›" and "Aspect Ratio 9:16 ›" (label 12 #898A8B, value 14 white).
  - **"Use free gens ✦1"** row with a lime toggle (on).
  - "Try in ChatGPT ›" row.
  - Generate with a dark inset badge **"✦ 1 FREE LEFT"**.
- **Canvas:**
  - History | How it works.
  - A how-it-works demo (animated upload card) with the headline "UPLOAD IMAGE" and a sub.
  - A **step carousel** at the bottom: round ‹ › buttons (36 px, border) and 3 mini step thumbnails; the active one has a white ring.
- **Change:** the canvas becomes an **"Effects | History" tabbed picker** with Search and ×.
  - A **4-column masonry** of effect tiles, each with a bottom-left title.
  - **The selected tile has a 2 px lime border and a lime ✓ circle top-left.**

---

## 7. Community (/community, /community/projects, /community/generations)
Files: `community-1440.png`, `community-scroll1/2/3-1440.png`, `community-projects-1440.png`, `community-shots-1440.png`, `community-shots-hover-1440.png`, plus the mobile files.

- Under the nav, **centred tabs** `Explore · Projects · Shots · Originals`: 32 tall, 14/500, radius 8. Idle is white 30%; active has a white 10% bg and white text.
- The **content scrolls in an inner container** (`overflow-y:auto`, hidden scrollbar). The page itself does not scroll.
- **Explore:**
  - **Hero carousel** about 700 tall, bleeding under the tabs. Left text stack:
    - gold "$1,000,000" with laurels (about 48 px);
    - "GLOBAL FILM FESTIVAL" (about 56 px Space Grotesk white);
    - an 18 px #898A8B sub;
    - a lime keycap CTA.
  - Bottom-right: a **thumbnail strip** (220×124, radius 8) with round ‹ › buttons (40 px, black 50%).
  - Along the bottom: an **8-segment progress bar**.
  - Sections, each with a header (20 px Inter 600 title plus a **"See all ›"** pill: white 5%, radius 8), a **4-column 16:9 card grid** (320×180, radius 12, gap 20), a bottom fade and a white **"Explore all … ›"** pill:
    - "Originals by Higgsfield";
    - "Global Film Festival Projects";
    - "Projects by Community";
    - "Shots" (masonry).
  - **Card hover:** a bottom gradient with a two-line title (16/600), an 18 px avatar plus author (13 px), and ♥ count · 👁 views (12 #898A8B).
- **Projects:** a 4-column grid of 16:9 cards with the same hover.
- **Shots:** a **5-column masonry** (256 wide, **gap 16**, radius 12). Hover shows:
  - two 28 px square icon buttons top-right (♡ like, ⤓ download; radius 8, black 40%);
  - avatar and username bottom-left.
  - Click opens the **lightbox** (§4.3).

---

## 8. Pricing (/pricing)
Files: `pricing-1440.png`, `pricing-1440-full.jpg`, `pricing-monthly-1440.png`, `pricing-business-1440.png`, `pricing-compare-1440.png`, `pricing-compare2-1440.png`, `pricing-notsure-1440.png`, `pricing-faq-1440.png`, `pricing-390.png`, `pricing-390-scrolled.png`.

- Content column **1064 wide** (x 188).
- **Promo banner:**
  - Radius 24, dark maroon with a pink hairline and dot texture.
  - A pink italic "✦ EXTRA DISCOUNT" tag.
  - A 36 px Space Grotesk headline: pink line, then white line.
  - A 14 px sub and a white keycap CTA.
- **"Upgrade your plan"**: 48 px Inter 600, with a 14 px sub.
- **Controls row:**
  - Left: segmented **Individual plans | Business plans**.
  - Right: a **"⑂ Not sure which plan?"** outline button that scrolls to the plan finder, and a **Monthly ◯ Annual toggle** with a pink **"30% OFF"** tag. Annual is the default.
- **Plan cards:** 3 per row, **344×774**, radius 20, 16 gap, 1 px border.
  - Colour-washed gradients: Starter neutral grey, **Plus olive/lime tint**, **Ultra magenta tint**.
  - Each card contains:
    1. The name in **Space Grotesk 24 uppercase**, followed by badges ("20% OFF" pink italic; "23% OFF" plus a blue "◆ BEST VALUE").
    2. A tagline (13 #898A8B).
    3. A **credits box** (bg black 20%, radius 12): "✦ 1,200 credits/mo." (15/600) with "= 600 … generations / ~ 53 … videos" sub-lines. Starter and Plus add a "✓ Fixed amount of … credits/mo" inner chip. Ultra has a **credits slider** instead (3,000 / 6,000 / 9,000 tick labels).
    4. The price: struck pink "$59" beside "$47" (32 px 700), and "per month, billed annually" (13 #898A8B).
    5. A **CTA** (48 tall, keycap): white "Get Starter", **lime "Get Plus"**, pink-gradient "Get Ultra".
    6. A note under the CTA ("Save $144 compared to monthly").
    7. An **"🔒 UNLIMITED & FREE GENS ⓘ"** box: model rows with tag chips (resolution chip grey; "7-day unlimited" lime; "3 free gens" lime; "No unlimited" grey; crossed-out rows dimmed) and a lime "+ 7 unlimited & free generation models ›" link.
    8. A feature checklist (✓ white / ✕ dim) with a pink "New" tag and a lime "55% CHEAPER" tag.
  - Monthly mode drops the strikethrough and says "Billed monthly".
- **Business plans:** Team, Scale ("22% OFF" plus "BEST VALUE", **blue CTA**), and **Enterprise** ("Let's talk", white "Contact sales"). The Enterprise card is raised with a **white "◆ EXPERTS' CHOICE" header tab**. Prices read "per seat/mo · monthly" with a "renews at …" note.
- **"Find the best plan for you" plan finder:** a two-pane card, radius 24.
  - Left is a numbered 3-step form:
    1. **Multi-select option tiles** (icon, label, checkbox; lime when checked).
    2. **Two range sliders** with **histogram tick marks** (lime bars) and value labels ("~50 Kling 3.0 videos 700 credits") plus a "200+" max chip.
    3. **Feature chips** with × and a lime "+ Add features" button with a count badge.
  - Right: "We recommend Plus plan", a lime "See why" chip, a **recommended plan card** with an expected-usage progress bar (820/1,200), and bottom toggles for "Premium quality" and Monthly/Annual.
- **Compare features:**
  - A table with a **sticky header row**: plan names Free / Starter / Plus / Ultra, prices, "Get Plan" buttons (dark; lime for Ultra), and an "Annual 30% OFF" switch in the first column.
  - Body groups start with **Video** (Concurrent Jobs, then per-model rows with "~22 credits/5s" sublabels and "640 videos" or "✕" per plan). "View More" row expanders follow.
  - Then **collapsible category panels** (radius 16, bg #1C1E20, 64 tall): Lipsync Studio, Character, Credits & Usage, Access & Features.
  - The whole table is collapsed behind a **"Compare Features"** button, which becomes "Close Features" when open.
- **Top-up / credits:** there is **no top-up section while signed out**. Extra credits are covered only in the FAQ ("How can I purchase extra credits?").
- **FAQ:** a centred title, 40 px Space Grotesk.
  - Accordion items **640 wide, 60 tall**, bg #1C1E20, radius 12, 16/600 white, chevron ⌄ on the right.
  - Questions cover credits, renewal, generation counts, extra credits, Unlimited, the 365 Unlimited promo, plan changes and Supercomputer cost.
- **Final CTA row:** "Are you ready?" with a lime "Choose your plan".

---

## 9. Auth modal (Login / Sign up)
Files: `auth-login-1440.png`, `auth-signup-1440.png`, `auth-signup-390.png`, `auth-signin-page-1440.png`.

- Both nav buttons open **the same modal** without a route change. Sign up adds the consent checkbox.
- **Modal:** **1120×776**, centred, radius **24**, bg #131517, 1 px #D9D9D90A border, over a darkened page scrim. It has two panes.
- **Left pane (535×750, radius 16, 12 px inset):**
  - A **looping video carousel**.
  - Bottom-left: a glass chip ("◇ 4K Resolution", 12 px).
  - Title: 40 px Space Grotesk bold uppercase white.
  - Description: 14 px white 50%.
  - **4 progress segments** (121×4, radius full, white 20%; the active one fills), each with a 12 px label below it (active white, others white 40%).
- **Right pane:**
  - A lime app-icon tile (32).
  - **"Welcome to Higgsfield"** (30 px Inter 600).
  - Sub: "Sign up and generate for free" (14 #898A8B).
  - A **lime-tinted callout button** "🎁 Sign in with business email & Get 50 credits" (383×44, bg lime 10%, lime 14/500, radius 12).
  - **Provider buttons 383×62**: transparent, 1 px white 10%, radius 12, 14/600 white, icon plus label centred. In order: **Continue with Google**, **Continue with Apple**, **Continue with Microsoft**.
  - An "OR" divider (12 #898A8B).
  - **Continue with Email**, same style. **The email field is not shown until this is clicked**; I did not click it.
  - Sign-up only: a 20 px checkbox followed by consent text with underlined Terms/Privacy links.
  - A divider, then "☁ SSO available on Scale and Enterprise plans" (14 #898A8B with an underlined link).
  - A **32 px round ×** at the top-right corner (white 5%).
- **/auth/sign-in:** a full-page version with no nav: a media card on the left (about 46% width), the form centred on the right, and the sub "Sign in and continue creating".
- **Mobile:** a single-pane card (350 wide, radius 24) with no media. Buttons are 50 tall and the title wraps to two lines.

---

## 10. Responsive behaviour at 390
- **Home** (`home-390.png`, `home-390-full.jpg`): a different, app-like home.
  - Header (§1.4), then a **search field** (40 tall, radius 12, #1C1E20).
  - A **hero carousel card** (366×205, radius 12, dot pager).
  - **"WHAT WOULD YOU CREATE?"** (16 px lime Space Grotesk) with **4 square tool tiles** (Image, Video, Genjutsu, MCP; 82 px, each on a tilted lime card) and 12 px labels.
  - **VISUAL EFFECTS** in a **2-column masonry** (177 wide, gap 8, radius 8) with titles in the tiles.
  - Then "Explore more" chips, a collapsed footer, and the **bottom tab bar**.
- **/flow "Create" hub** (center tab button; `home-createbutton-390.png`):
  - "Create" title (24/600) with a round ×.
  - Pill tabs `All · New · Images · Videos · Edit` (active is a white pill with black text).
  - A hero card, then a **2-column grid of tool cards**: media on top with radius 12; a badge top-left (**NEW** lime, **CORE** blue, **TOP** purple, all italic); a Space Grotesk 16 uppercase title; a 12 px sub.
- **Generators** (`image-390.png`, `video-390.png`, `audio-390.png`, `effects-use-390.png`):
  - Full-screen **sheet**. The header holds the logo, a **"CREATE IMAGE ▾" / "VIDEO ▾" switcher** (Space Grotesk 16 uppercase) and a square ×.
  - The **switcher opens a 240-wide menu** with "FEATURED" and "ALL" sections (Supercomputer, Image, Audio, Video, MCP & plugin, Upscale, Inpaint, Effects, …) and a round × under it (`image-switcher-390.png`).
  - The left-panel controls **stack full-width**. On mobile the image page switches to the video-style stacked layout: dropzone "Choose images to upload (up to 16)", a large prompt card with a "Model — GPT Image 2 ⌄" row inside it, and a horizontally scrolling setting-pill row pinned just above Generate.
  - **Generate becomes a full-width 358×56 lime button pinned to the bottom** of the sheet. On audio it shares the row with a "– 1 +" batch stepper.
  - **The model picker becomes a full-screen bottom sheet** with a 60% black scrim and search (`image-modelpicker-390.png`).
  - The canvas and History are not shown on the sheet; results live in **Library** (tab bar).
- **Effects gallery:**
  - Left-aligned 28 px lime title, a description, and a full-width "Try in ChatGPT" button.
  - **The chip cloud becomes a single horizontally scrolling row.**
  - 2-column masonry.
- **Effect detail:** title with a "1 FREE GEN" badge, two buttons in a row, 2-column masonry, tab bar.
- **Community:**
  - App header (sidebar toggle, title, Upgrade).
  - Pill tabs (white active).
  - Hero stacks (text under the image).
  - Card grids become 2 columns; **Shots becomes a 3-column masonry** (about 123 wide) with a floating "Explore all shots ›" pill.
  - The drawer is described in §1.4 (`community-sidebar-390.png`).
- **Pricing:** **a full-screen paywall modal** (× top-left) rather than the desktop page.
  - "Unlock All Features with up to 21% OFF" (lime), with a Trustpilot laurel line.
  - Stacked plan cards: **BASIC MONTHLY $5** (pink-tinted card, pink CTA) and **PRO ANNUAL $29→$23** ("21% OFF" lime badge, lime CTA). Each has a checklist box and a "⌄ Learn more" expander.
  - The FAQ accordion follows.
- **Auth:** single-pane card (§9).

---

## 11. Library / asset library (signed out)
File: `library-signedout-1440.png`.

- **/library/all is reachable signed out** and is **a nav-less full-screen app page**.
- Header: "🗀 Library" (20 px/500) at the top-left; a view toggle at the top-right (two 28 px icon buttons, single vs grid; the active one is white).
- **Filter chip row**: 40 tall, radius 10, bg #1C1E20, icon plus 14/600 label; the active chip is #2A2D32. Chips: All, Video, Image, Shorts Studio, Higgsfield Explainer, Audio, Marketing Studio, Characters, Lipsync.
- **Empty state**, centred:
  - a green folder icon (about 56);
  - "Your creations will appear here." (16/600 white);
  - "Let's make magic" (16 #898A8B);
  - a dark "✦ Generate" button (bg #23262A, radius 10, 40 tall).
- **/profile** redirects to /auth/sign-in.
- **/generate** is the Cinema Studio app shell (`generate-signedout-1440.png`):
  - Left **sidebar** (about 232): Home, My elements, My favorites, Community, Academy; a "Projects" list with search and sort plus "+ New project"; a promo card; a Pricing row with a pink % badge; and a lime **Log in**.
  - A centred bottom composer with **setting cards** (References 0/50, Film setup, Camera, Colour palette, Lighting; mono labels), an Image/Video vertical toggle, and a square lime **GENERATE ✦ 60** block.

---

## 12. Build checklist
Every component a clone needs, with the states to implement.

**Chrome**
- [ ] Promo bar: visible / dismissed (persisted) / mobile two-line.
- [ ] Top nav:
  - expanded (52) and compact (36, sticky);
  - link states idle / hover (white on white 5%) / active (lime);
  - overflow fade mask;
  - `New` badge;
  - signed-out (Login, Sign up) vs signed-in (credits pill, Upgrade, avatar menu);
  - Pricing pill with hanging % badge.
- [ ] Mega menu (Features / Models columns): open on hover and focus, close on leave or Esc, scroll inside, TOP/NEW badges.
- [ ] Language picker (globe), cookie banner (accept / reject / preferences).
- [ ] Footer: lime link grid plus dark legal bar.
- [ ] Mobile: marketing header; bottom tab bar (active tab; center create button); app header with sidebar drawer (open / closed); /flow Create hub with tabs.

**Primitives**
- [ ] Button variants: lime keycap, white keycap, pink, ghost-lime, ghost-white, outline. States: default, hover, pressed (lip removed), focus ring (lime border-focus), **disabled** (lime at 50–55%, dim text), loading.
- [ ] Pill / segmented control / text tabs (underline) / chip / toggle switch / checkbox / stepper (– n/max +) / slider (plain, histogram-tick, stepped with labels).
- [ ] Badges: NEW, TOP, PREMIUM, BEST VALUE, CORE, "x% OFF", Optional/Required, "1 FREE LEFT".
- [ ] Popover and listbox with header label, option with sublabel, selected ✓, glass variant; mobile bottom-sheet variant.
- [ ] Modal (radius 24) with scrim, Esc and backdrop close, focus trap.
- [ ] Toasts: success / error (the app uses react-toastify-style toasts).
- [ ] Skeleton rectangle (#1C1E20, radius 12, shimmer).

**Media**
- [ ] Media tile: image or looping muted video with poster, lazy load, pause off-screen. States:
  - loading skeleton;
  - loaded;
  - hover overlay (title plus "Recreate" / "Try for free"), plus a community variant (avatar/username top-left, like pill top-right, or heart and download icons);
  - selected (lime 2 px border plus ✓).
- [ ] Masonry grid (4/5 columns desktop, 2/3 on mobile), uniform 16:9 grid, and bottom-fade "View all ↗" section clamp.
- [ ] Carousel: segmented progress, dots, ‹ › buttons, thumbnail strip.

**Generator (image composer variant)**
- [ ] Composer: empty; typing (autogrow); with reference thumbnails; over-limit.
- [ ] "+" reference picker, model pill, aspect / quality / resolution / background popovers, batch stepper, horizontal pill scroller with ‹ ›.
- [ ] Generate block: idle with cost (and struck promo price) / disabled (no prompt) / submitting / insufficient credits (opens paywall) / signed-out (opens auth modal).
- [ ] Empty-state hero, Academy nudge (dismissible), promo side card (dismissible), grid-size slider.

**Generator (panel variant: video, audio, effects)**
- [ ] Mode tabs; preset hero card with Change; References | Extend segmented control.
- [ ] Dropzones: idle, hover, drag-over, uploading (progress), uploaded (thumbnail plus remove ×), error (wrong type or too large), **moderation-blocked upload**, IP-detected; Optional and Required tags; multi-slot variants (Character, Location, Products; Motion plus Character; video-to-extend).
- [ ] Prompt card with @Elements mention, audio toggle chip, char counter (0/500), toggleable prompt.
- [ ] Model row, then model picker (search, Featured, All, family groups, spec chips, badges, selected ✓, empty search results).
- [ ] Setting tiles (duration slider popover, aspect, resolution, bitrate), select rows, Advanced settings accordion, free-gens toggle row.
- [ ] Sticky Generate with cost (states as above).
- [ ] Preset picker takeover: model tabs (scrollable), search, preset card grid, selected, close.

**Canvas and history**
- [ ] History | How it works toggle.
- [ ] How-it-works empty state: headline plus 3 animated step cards plus academy strip; audio 2-card variant.
- [ ] History toolbar: filter menu (Type, All models ›, Date range ›, Liked, Downloaded, hide failed), expand, size slider, List | Grid.
- [ ] **Generation tile states:** queued; generating (progress or spinner, elapsed); completed (hover actions); failed (error plus Retry plus refund note); **content-filtered (nsfw)** (blurred or blocked plus policy note); **IP-detected / likeness-blocked**; deleted/undo.
- [ ] Lightbox:
  - blurred backdrop and media stage;
  - glass side panel (author, prompt with Copy and See all, details key/values);
  - action grid (Recreate, Video, Upscale, Edit, Download, Share, Like);
  - keyboard ←/→ and Esc;
  - loading and error states.

**Pages**
- [ ] Explore/home (desktop sections in §3; mobile app-home in §10).
- [ ] Effects gallery (hero, chip cloud, masonry), collection page, effect detail (Back, CTAs, examples), effect use page.
- [ ] Community: tabs, hero carousel, section rows with See all, project card hover, Shots masonry, lightbox.
- [ ] Pricing:
  - promo banner;
  - Individual | Business;
  - Monthly | Annual (price and strikethrough swap);
  - plan cards (credits box, Ultra credit slider, unlimited box, checklist, CTA variants);
  - Enterprise "Experts' choice" card;
  - plan finder (multi-select, sliders, feature chips, live recommendation);
  - compare table (sticky header, View More, collapsible groups, open/close);
  - FAQ accordion;
  - mobile paywall modal.
- [ ] Auth modal: login / sign-up (consent checkbox unchecked or checked; providers disabled until checked, inferred), email step, loading, error; /auth/sign-in full page; mobile single pane.
- [ ] Library: filter chips, list/grid toggle, empty state, populated grid, selection mode (inferred).
