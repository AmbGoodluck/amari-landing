# Amari website: project audit (Phase 1)

**Date:** 2026-11-12 · **Commit audited:** `3847dbb` · **Scope:** this repository (`AmbGoodluck/amari-landing`), the marketing site for Amari / "Ask Amari".

Every result below comes from a command that was actually run in this audit. Nothing is estimated unless it says so.

---

## 1. What exists today

### Stack and architecture
| Area | Finding |
|---|---|
| Framework | **None.** Hand-written static HTML, CSS and vanilla JavaScript. No bundler and no build step for the homepage. |
| Language | HTML5, CSS (custom properties), ES2020 JavaScript in strict mode inside an IIFE. No TypeScript. |
| Build | Only `scripts/build-legal.mjs` (zero dependencies), which turns `content/legal/*.md` into `public/terms.html` and `public/privacy.html`. |
| Hosting | **Cloudflare Workers static assets**, deployed by Workers Builds on every push to `main` (`npx wrangler deploy`, `assets.directory = ./public`). |
| Runtime dependencies | **0.** |
| Dev dependencies | `wrangler` ^4.40 (deploy/dev), `playwright` 1.63.0 (tests), `@axe-core/playwright` ^4.10 (accessibility tests). Lockfile committed. |
| Tests | `node --test`: 19 Playwright end-to-end tests, including axe. |

### Routes (as served by Workers static assets)
| Route | Source | Status |
|---|---|---|
| `/` | `public/index.html` | 200 |
| `/terms` | `public/terms.html` (generated) | 200 (`/terms.html` → 307 → `/terms`) |
| `/privacy` | `public/privacy.html` (generated) | 200 |
| anything else | `public/404.html` | 404 |

In-page sections on `/`: `#top` (hero), `#how-it-works`, `#features`, `#recipes`, `#download`.

### Components (homepage)
- Header with a translucent sticky bar, logo, 4 section links, "Get the App" and "Sign In", and a mobile menu that grows from the toggle button, closes on Esc or outside click, and returns focus.
- Hero: headline, intro text, App Store and Google Play badges, 3 value points, an HTML/CSS phone mockup that tilts toward the pointer, and produce images.
- How it works: a 3-step strip.
- Features: a 5-tile grid (ingredient recognition, diet and allergies, cook mode, pantry, waste less).
- Recipes: a carousel you can drag or flick, with momentum, rubber-band ends, buttons and keyboard support, and save (heart) toggles.
- Download panel, then the footer (sections, Terms, Privacy).
- Legal pages: the same header and footer, an "On this page" contents list, anchored sections, and scrollable tables.

### Integrations, environment variables, APIs, auth, analytics, forms
| Item | Present? |
|---|---|
| Environment variables / secrets | **None.** No `.env` or `.dev.vars` files, and no secrets tracked in git. |
| APIs / backend | **None.** The site makes no network calls beyond its own static files. |
| Authentication | **None on this site.** The app's legal documents say sign-in exists in the web app at `app.askamari.us`. |
| Analytics / tracking / cookies | **None.** The site sets no cookies and loads no third-party scripts. |
| Forms | **None** (0 `<form>` elements). |

### Styling and design tokens
- Colors, radii, shadows, spacing and materials live as custom properties on `:root`, with dark-mode overrides.
- Font: the system stack (`-apple-system`, SF Pro, `system-ui`, Segoe UI, Roboto…). **No web fonts are loaded**, so Inter is not shipped.
- Type follows Apple's practice: tighter letter-spacing on large text (display −0.045em, section headings −0.035em, body ≈0), tight line-height on headings, sizes in `rem`.
- Brand colors come from the logo: deep green `#155E3B`, leaf `#2E9B5A`, tomato `#E4572E`, cream `#FFF4E2`.

---

## 2. Measured results

| Check | Tool | Result |
|---|---|---|
| End-to-end tests | `npm test` (Playwright + axe) | **19 / 19 pass** |
| Dependency vulnerabilities | `npm audit` | **0** |
| Outdated packages | `npm outdated` | wrangler 4.158 → 4.160.1 (minor); playwright pinned at 1.63.0 to match the installed browser (latest 1.65) |
| Horizontal overflow, 9 widths (320, 375, 390, 430, 768, 1024, 1280, 1440, 1920) | Playwright probe | **0 px at every width** |
| Hero buttons covered by mockup/decorations | `elementFromPoint` probe, 9 widths | **None** |
| Console errors, 9 widths | Playwright | **0** |
| Keyboard order | Tab walk | Skip link → logo → nav → CTAs → hero badges → carousel controls → cards; a visible focus ring on every stop |
| Accessibility | axe-core (light and dark; legal pages at 320px) | **0 serious or critical violations** |
| Lighthouse, **mobile** (`wrangler dev`, simulated throttling) | Lighthouse 12 | Perf **97** · A11y **100** · Best Practices **100** · SEO **100** · LCP **2.6 s** · CLS **0** · TBT 60 ms · FCP 0.8 s |
| Lighthouse, **desktop** | Lighthouse 12 | Perf **100** · A11y **100** · BP **100** · SEO **100** · LCP 0.6 s · CLS 0 · TBT 0 ms |
| Page weight (gzip) | `gzip -9` | HTML 6.1 KB · CSS 8.1 KB · JS 5.4 KB; images 33–95 KB each, all WebP |

The Lighthouse scores come from a local server. Production numbers will differ: Cloudflare adds compression and edge caching, and real devices vary.

---

## 3. Findings

**Priority key:** **P0** must be fixed before relying on the site · **P1** before public launch · **P2** soon after · **P3** later.

### P0: critical
| # | Finding | Evidence | Fix |
|---|---|---|---|
| P0-1 | **The legal pages contain unfilled placeholders**: `[Legal name of the operator]`, `[Postal address]`, `[State]`, `[County, State]`. They are now live, shown as highlighted placeholders. | `content/legal/*.md` as supplied | Owner supplies the real values; edit the Markdown; `npm run build:legal`. Never invent them. |
| P0-2 | **A Google Play badge advertises an Android app** that the legal documents never mention. They cover the iPhone app and the `app.askamari.us` web app only. | `index.html` hero and Download panel | Remove it, or link a real Play listing if one exists. |
| P0-3 | **Dead CTAs: 8 links point to `#download`**, including both store badges and "Get the App", and none reaches a store. | Link inventory: `#download` ×8 | Use the real App Store URL for "Ask Amari", from central config. If there's no listing yet, use a waitlist CTA (§11 of the brief). |

### P1: before public launch
| # | Finding | Fix |
|---|---|---|
| P1-1 | **"Sign In" goes to `#download`**, but sign-in exists at `app.askamari.us`. | Link it to the web app, or remove it. |
| P1-2 | **The feature copy doesn't match the real product.** The legal documents describe: scan, plan the week, shopping list (Instacart, Walmart, Target), *Ask Amari* chat, AI recipe writing, allergies and diets, goals with calorie and protein estimates, and reminders. The page leaves out **Ask Amari, meal planning and shopping**, and claims "screen stays awake", which isn't verified. | Rewrite Features from a confirmed list, marking each feature "available" or "coming soon". |
| P1-3 | **The brand name is inconsistent**: the App Store listing is "Ask Amari", the site says "Amari". | Decide the display name; keep "Ask Amari" where store accuracy matters. |
| P1-4 | **SEO basics are missing**: no `<link rel=canonical>`, no `og:url`, a relative `og:image` (social platforms ignore it), no JSON-LD, no `sitemap.xml`, and `robots.txt` has no sitemap line. | Phase 6. Needs the confirmed production domain (`askamari.us`?). |
| P1-5 | **No FAQ, Benefits or Contact section**, and the hero lacks a secondary "Explore How It Works" CTA. | Phase 3. |
| P1-6 | **No HSTS header.** `X-Frame-Options` duplicates CSP `frame-ancestors` (harmless). | Add `Strict-Transport-Security` once HTTPS is served on the custom domain (Phase 4). |
| P1-7 | **Recipe cards show "Uses N of your ingredients"** as if personalised, and lack difficulty, description and diet tags. | Label them as examples and add the brief's fields (Phase 3). |

### P2: soon after launch
| # | Finding | Fix |
|---|---|---|
| P2-1 | **Mobile LCP is 2.6 s, just over the 2.5 s target.** The LCP element is the *decorative* tomato image, and 1.6 s of that is render delay. | Responsive `srcset` (Lighthouse estimates ~185 KB wasted on mobile); smaller hero produce images. |
| P2-2 | **There's no single place to configure brand details.** Brand name, nav, store URLs and footer are duplicated in `index.html` and the legal template. | Phase 2: `site.config.json` plus a zero-dependency page build (see §5). |
| P2-3 | **70 color literals sit outside the token blocks** (phone mock, badges, CTA, placeholders), and there are **no typography tokens**. | Phase 2: move everything to tokens (`--color-*`, `--text-*`). |
| P2-4 | **Caching:** `/assets/*` uses `max-age=1 day` because filenames aren't fingerprinted, and HTML gets the default caching. | Fingerprint assets at build, then `immutable`; HTML `no-cache` with revalidation. |
| P2-5 | **No CI.** Tests run only by hand. No Dependabot. | GitHub Actions to run `npm test`, plus Dependabot for npm (Phase 9/10). |
| P2-6 | The brief asks for **Inter**; only system fonts are used. | Option: self-host a subset Inter variable woff2 (~40–60 KB) with `font-display: swap`, keeping SF on Apple devices. |
| P2-7 | **JavaScript is unminified** (16.6 KB raw / 5.4 KB gzip). | Minify in the Phase 2 build step. Low impact. |

### P3: future
Blog and public recipe pages, multiple languages, testimonials (real ones only), referral and subscription pages, and Lighthouse checks in CI.

### Already in good shape (keep)
- Strict CSP (`'self'` only, with no `unsafe-inline` or `unsafe-eval`), `nosniff`, a `Referrer-Policy` and a `Permissions-Policy`.
- No secrets, no third-party scripts, and 0 vulnerabilities.
- WCAG basics: a skip link, landmarks, visible focus, a keyboard-operable carousel and menu, and the `reduced-motion`, `reduced-transparency`, `contrast: more` and `forced-colors` preferences all handled.
- Zero layout shift, image dimensions set, and below-the-fold images lazy-loaded.

---

## 4. Conflicts in the brief that need an owner decision

1. **Palette.** The brief suggests an **orange-led** palette (`#FF641F`). The current site uses the **green from the app logo**, which you chose earlier ("the app is green") and confirmed with the new logo. *Recommendation:* keep the logo's green as the primary color. Add the logo's **tomato orange** as a secondary accent token rather than switching the brand back to orange.
2. **Android / Google Play.** Is there a Play Store listing? If not, the badge goes (P0-2).
3. **App Store URL** for "Ask Amari", and whether the app is publicly available yet. This decides between download buttons and a waitlist.
4. **Waitlist backend.** Only needed if the app isn't public. The site has no backend, so it would need either a Cloudflare Worker endpoint with D1 and Turnstile (matching the existing Cloudflare stack) or a hosted form provider. I won't fake submissions.
5. **Analytics.** The site has none today, which matches the privacy policy's no-tracking stance. Adding GA4, Clarity or PostHog needs a consent banner and a privacy-policy update. *Recommendation:* Cloudflare Web Analytics (cookieless, no consent banner needed) for page views and CTA clicks.
6. **Production domain.** Is the live site `askamari.us`? Canonical URLs, `og:image`, the sitemap and HSTS depend on it.
7. **The confirmed feature list**, marked "available" or "coming soon" (P1-2).
8. **Legal placeholders** (P0-1).

---

## 5. Architecture decision: how to centralize configuration

The brief asks for one place to change the brand name, nav, URLs, SEO defaults and so on, plus reusable components across several pages.

| Option | Pros | Cons |
|---|---|---|
| **A. Extend the existing zero-dependency build** (recommended): `site.config.json` plus HTML partials (header, footer, head/SEO), rendered by a small Node script that already exists for the legal pages. It would also handle fingerprinting and minification. | No new dependencies; output stays plain static HTML; works with the current deploy (add a build command); the existing tests carry over unchanged. | A custom script to maintain (~200 lines, covered by the tests). |
| B. Migrate to Astro (static output) | Components, TypeScript, an image pipeline (`srcset`/AVIF) and a sitemap plugin out of the box. | A full rewrite of a site that is currently passing everything; a framework dependency and its upgrades; higher risk of losing the approved look. |
| C. Inject config at runtime with JavaScript | Simplest | Bad for SEO and performance: content isn't in the HTML. Rejected. |

*Recommendation:* **Option A** now. Revisit Astro only when the blog or public recipe pages (P3) arrive.

---

## 6. Prioritized implementation plan

| Phase | Scope | Depends on |
|---|---|---|
| 2: Design system | Move all colors to tokens (`--color-*`) and add typography tokens; `site.config.json`; partials and page build (Option A) | Decision 1 |
| 3: Landing page | Fix P0-2/3 and P1-1/2/5/7: real store links or waitlist, Sign In → web app, a confirmed feature list, hero secondary CTA, Benefits, FAQ (native `<details>`), Contact | Decisions 2, 3, 4, 7 |
| 4: Security | HSTS; tidy `_headers`; validation, Turnstile and rate limiting if a waitlist is added; `SECURITY.md` | Decisions 4, 6 |
| 5: Performance | Responsive `srcset`, smaller hero images, fingerprinted assets with `immutable` caching, minification; `PERFORMANCE.md` | Phase 2 build |
| 6: SEO | Canonical, `og:url`, absolute OG image, Organization, WebSite and SoftwareApplication JSON-LD (no invented ratings or prices), FAQPage only if eligible, `sitemap.xml`, `robots.txt`; `SEO.md` | Decision 6 |
| 7: Accessibility | Re-run axe and a keyboard check on all new sections; `ACCESSIBILITY.md` | Phases 3 to 6 |
| 8: Analytics | Config-driven, off by default, Cloudflare Web Analytics or consent-gated GA4; CTA, store and FAQ events with no form content | Decision 5 |
| 9: Testing | Extend the Playwright suite (FAQ, waitlist, store links, external links, 9 widths); Lighthouse; `npm audit`; `TEST_REPORT.md` | All |
| 10: Deployment | CI (tests on pull requests), Dependabot, custom domain and HTTPS, rollback via Workers "Deployments → Rollback"; `DEPLOYMENT.md`, `ENVIRONMENT_VARIABLES.md`, `README.md` | Decision 6 |

---

## 7. Changes made during this phase
- **`/terms` and `/privacy` added** (commit `3847dbb`), at the owner's request, from the supplied documents. The sources are kept verbatim in `content/legal/`. Two things were not published: the privacy policy's internal note "[Confirm against each provider's current API terms before publishing.]" and Appendices A–B (App Store Connect working notes). The `app.askamari.us/privacy` link is rewritten to this site's `/privacy`. Placeholders are highlighted, not filled.
- No other functionality was changed or removed.

---

## 8. Status after Phases 2–10 (2026-11-13)

**Owner decisions applied:** green brand (logo palette); App Store and Google Play badges removed while the apps are in testing; production domain `askamari.us`; Cloudflare Web Analytics; feature copy from the owner's November 2026 feature list, following its words-to-avoid guidance.

| Finding | Status |
|---|---|
| P0-1 Legal placeholders | ⏳ **Open (owner).** Still highlighted on `/terms` and `/privacy`. The owner's reply "Amari: Your Kitchen Assistance" needs confirming as the operator's legal name. The postal address, state and county are also still needed. |
| P0-2 Google Play badge | ✅ Removed (owner: still testing) |
| P0-3 Dead CTAs | ✅ All CTAs go to the live web app `app.askamari.us`; test enforces no `#` links and no store links |
| P1-1 Sign In | ✅ Links to the web app |
| P1-2 Feature copy | ✅ Rewritten from the owner's verified feature list; all marked "Available now", iPhone "In testing" |
| P1-3 Brand name | ✅ "Amari" on the site, "Ask Amari" as the app name in JSON-LD and the FAQ |
| P1-4 SEO basics | ✅ Canonical, absolute OG, JSON-LD, sitemap, robots |
| P1-5 FAQ / Benefits / Contact / secondary CTA | ✅ Added (`/contact` page included) |
| P1-6 HSTS | ✅ Added (no `includeSubDomains`/`preload` until confirmed) |
| P1-7 Recipe cards | ✅ Image, title, cuisine, description, time, difficulty, ingredient count and diet tags, labelled as illustrations |
| P2-1 Mobile LCP | ✅ 2.6 s → 2.3 s; LCP is now text |
| P2-2 Central config | ✅ `site.config.json` + `scripts/build.mjs` (Option A, zero dependencies) |
| P2-3 Color literals and type tokens | ✅ 0 raw colors outside tokens (enforced by lint); typography scale tokens added |
| P2-4 Caching | ✅ Fingerprinted `/static/*` immutable; HTML revalidates |
| P2-5 CI / Dependabot | ⏳ Open: enable Dependabot in GitHub settings; Workers Builds deploys, and `npm test` should run before each push |
| P2-6 Inter font | ➖ Decided against: the system stack (SF on Apple devices) matches the Apple direction with zero font bytes |
| P2-7 Minification | ➖ Deferred (P3): ~2 KB gain doesn't justify a dependency |
| New: rate limit on `/api/event` | ⏳ Open (P2): add one Cloudflare rate-limiting rule (SECURITY.md) |
| New: website analytics disclosure | ⏳ Open (owner): add one sentence to the Privacy Policy (SECURITY.md) |

### Final acceptance checklist
| Criterion | Result |
|---|---|
| Builds successfully | ✅ `npm run build`; `build:check` in tests |
| All routes work | ✅ 4 pages + 404 (tests + `wrangler dev`) |
| No broken navigation / dead CTAs | ✅ link-resolution test |
| No major responsive issues | ✅ 9 widths × 4 pages |
| No critical security vulnerabilities / exposed secrets | ✅ `npm audit` 0, no secrets, strict CSP |
| No major accessibility violations | ✅ axe 0 serious/critical, Lighthouse 100 |
| No significant console errors | ✅ asserted on every page |
| No major performance bottlenecks | ✅ Lighthouse 99–100, CLS 0 |
| SEO metadata correct; structured data valid | ✅ tested locally; ⏳ run Google's Rich Results Test after deploy |
| Forms work if implemented | ➖ No forms (no waitlist needed: the web app is live) |
| External links work | ✅ hosts allowlisted in tests; ⏳ live check after deploy |
| Production config and rollback documented | ✅ DEPLOYMENT.md |
| Legal pages accurately represent the product | ⏳ Owner-supplied text published verbatim; **placeholders must be filled (P0-1)** |

**Verdict:** ready to deploy, with one **P0 owner action**: fill in the operator's legal name, postal address and governing-law state and county in `content/legal/*.md`, then run `npm run build`.
