# Amari Landing — Implementation Plan

Spec: `docs/superpowers/specs/2026-11-07-amari-landing-design.md`
Execution: inline (approved by owner to run end-to-end).

## Task 1 — Test harness first (TDD)
- `package.json` with scripts `dev` (wrangler dev), `test` (node test runner + Playwright), `deploy` (wrangler deploy).
- `tests/site.test.mjs`: serve `public/` on a local static server, assert: no console errors; anchors `#features #how-it-works #recipes #download` exist; no horizontal overflow at 375px; mobile menu toggles + Esc closes; carousel next button changes track transform; axe has no serious/critical violations.
- Run → fails (no site yet).

## Task 2 — Assets
- Download generated images, convert to WebP (cutouts keep alpha), sized ≤ 2× display size, into `public/assets/`.
- `public/assets/favicon.svg`, `og.jpg`.

## Task 3 — Markup (`public/index.html`)
- Semantic sections per spec; inline SVG icon sprite; meta/OG tags.

## Task 4 — Styles (`public/styles.css`)
- Tokens, dark mode, typography scale, nav material, hero + phone mock, steps, bento, carousel, download, footer, responsive breakpoints (1100 / 860 / 560), a11y media queries.

## Task 5 — Behavior (`public/app.js`)
- Spring util (critically damped / under-damped, velocity-aware, interruptible).
- Phone pointer tilt; mobile menu; reveal-on-scroll (IntersectionObserver); carousel drag with momentum projection + rubber-band + snap; buttons + keyboard.

## Task 6 — Verify
- `npm test` green; screenshots desktop/mobile/dark/reduced-motion reviewed; fix issues.

## Task 7 — Ship
- `wrangler.jsonc`, README; commit; push `main`; `wrangler deploy`; curl live URL.
