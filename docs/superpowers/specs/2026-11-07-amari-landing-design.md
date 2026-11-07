# Amari Landing Page — Design Spec

**Date:** 2026-11-07 · **Status:** Approved

## Intent

A marketing landing page for **Amari**, an AI kitchen assistant app: snap your fridge or pantry, get personalized recipes from what you already have. The page must match the supplied mockup (hero with headline "Snap. Discover. Cook.", a tilted phone showing the app, floating fresh produce, a three-step strip) and extend it into a complete page whose nav links all resolve. Success = a fast, accessible, Apple-quality page live on Cloudflare.

**Assumptions:** app-store links are not live yet, so store badges and "Get the App" point at `#download`; "Sign In" is a secondary button that also points to `#download`.

## Architecture

- Static site, zero build step: `public/index.html`, `public/styles.css`, `public/app.js`, `public/assets/*`.
- Served by **Cloudflare Workers static assets** (`wrangler.jsonc`, `assets.directory = ./public`). No Worker script needed.
- No frameworks or runtime dependencies. Fonts: system font stack (SF Pro on Apple platforms) — per Apple guidance, default to the platform font.
- Dev dependencies only for verification: `wrangler`, `playwright` (pre-installed), `@axe-core/playwright`.

## Sections (top → bottom)

1. **Nav** — sticky, translucent material (`backdrop-filter`), logo, links (Features, How It Works, Recipes, Download), primary "Get the App" + secondary "Sign In". Mobile: links collapse into a sheet toggled by a menu button that originates from the button (`transform-origin`), closes with Esc / outside click / link click.
2. **Hero** — "AI Kitchen Assistant" pill, display headline (orange "Cook."), lede, App Store / Google Play badges, three value props (Instant meal ideas · Uses your ingredients · Smart, healthy choices). Right: an HTML/CSS iPhone mock (greeting, "Snap Your Ingredients" card, "Meal Ideas for You" with Jollof card) on an orange rounded-rect backdrop, with floating tomato, basil, avocado. Phone tilts toward the pointer with a critically damped spring; disabled under reduced motion / coarse pointers.
3. **How It Works** — the three-step card: Snap & Scan → Get Meal Ideas → Cook & Enjoy.
4. **Features** — bento grid: ingredient recognition, personalized to diet & allergies, smart pantry, step-by-step cook mode, less food waste, save & share.
5. **Recipes** — horizontally draggable carousel of recipe cards (photo, time, "Uses N of your ingredients"). Pointer drag 1:1 with grab offset, momentum projection (`d = 0.998`) to nearest card snap, rubber-band at the ends, spring settle, interruptible mid-flight. Prev/next buttons + keyboard arrows. Native scroll fallback when reduced motion.
6. **Download** — dark CTA panel with headline, badges.
7. **Footer** — logo, small links, ©.

## Design system

- Color tokens on `:root`, dark-mode overrides via `prefers-color-scheme`. Brand orange `#FF6B1A` → `#FF8A3D` gradient; ink `#0B0B0C`; surface warm off-white `#FCFAF8`.
- Type: size-specific tracking (display −0.035em, h2 −0.025em, body 0), tight leading on display (1.0), 1.5 on body; `rem` units so layout scales with user text size.
- Radius scale 12/20/28/40; layered soft shadows; materials: nav uses blur(20px) saturate(180%).
- Motion: press feedback on `:active` (scale .97, 100ms). Reveal-on-scroll with opacity + small translate. Springs critically damped by default; bounce only after a flick.
- Accessibility: semantic landmarks, skip link, visible `:focus-visible` rings, alt text, `aria-label`s on icon buttons, carousel is a labelled region with buttons; `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more` all handled. Color contrast ≥ 4.5:1 for text.

## Assets

Food photography generated with Higgsfield (GPT Image): tomato, avocado, basil (transparent PNG cutouts) and recipe photos (jollof, shakshuka, avocado toast, stir-fry, pasta, salmon). Converted to WebP with fixed dimensions to avoid layout shift. Icons are inline SVG.

## SEO / meta

Title, description, Open Graph + Twitter card, theme-color (light/dark), SVG favicon, `lang="en"`.

## Testing / verification

- Playwright smoke test: page loads with no console errors, every nav link target exists, no horizontal overflow at 375px, carousel buttons move the track, mobile menu opens/closes with Esc.
- axe-core scan: zero serious/critical violations.
- Screenshots: desktop 1440, mobile 390, dark mode, reduced motion.
- Post-deploy: fetch the live URL and assert 200 + title.

## Out of scope

Real auth, app-store listings, analytics, CMS.
