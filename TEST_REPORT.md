# Test report

**Date:** 2026-11-13 · **Environment:** Linux, Node 22, Chromium (Playwright 1.63.0), Wrangler 4.158 · **Command:** `npm test`

Every result below was produced by actually running the command shown. Nothing is estimated.

## Summary
| Suite | Command | Result |
|---|---|---|
| Build up to date | `npm run build:check` | ✅ `public/` matches sources |
| Lint (syntax, design tokens, CSP, HTML hygiene) | `npm run lint` | ✅ ok |
| End-to-end (Playwright + axe) | `node --test tests/site.test.mjs` | ✅ **22 / 22** |
| Worker unit tests | `node --test tests/worker.test.mjs` | ✅ **8 / 8** |
| **Total** | `npm test` | ✅ **30 pass, 0 fail** |
| Dependency audit | `npm audit` | ✅ 0 vulnerabilities |
| Lighthouse | see PERFORMANCE.md | ✅ Mobile 99/100/100/100 (LCP 2.3 s), desktop 100 ×4 |
| Cloudflare runtime smoke test | `wrangler dev` + curl | ✅ see below |

## What the end-to-end tests cover
- **Pages:** `/`, `/terms`, `/privacy` and `/contact` each load with exactly one `h1`, the correct canonical URL, the logo in the nav, and **no console or network errors**. They run under the production CSP.
- **Links:** every `#anchor`, internal route and `/route#anchor` resolves; external links are https and point only to `askamari.us` or `app.askamari.us`; `mailto` goes only to the support address; there are no `href="#"` dead links.
- **CTAs:** hero, nav and get-started buttons all open the web app; no App Store or Google Play links exist while the apps are in testing.
- **Legal:** table-of-contents targets exist; placeholders are highlighted; internal notes and appendices are not published.
- **404:** branded page, HTTP 404, `noindex`.
- **Responsive:** 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px × 4 pages (36 renders), with no horizontal overflow and hero buttons never covered.
- **Interaction:**
  - Mobile menu: Esc closes it and focus returns to the toggle.
  - FAQ: Enter opens and closes items.
  - Carousel: buttons and arrow keys; drag follows the pointer; holding before release doesn't fling; a tap mid-flight settles on a card; releasing outside leaves no stale drag; focus stays on Next at the end.
- **Analytics:** hero CTA, FAQ open and section-view events reach the **real Worker code**; nothing is sent under Global Privacy Control.
- **Accessibility:** axe with the WCAG 2.0/2.1/2.2 A/AA tags on 4 pages × light and dark: 0 serious or critical violations.
- **SEO and headers:** JSON-LD parses, with Organization, WebSite and SoftwareApplication present and no rating fields; OG URLs are absolute; the sitemap lists every page; robots points to the sitemap; HSTS is present; CSP has no `unsafe-*`; `/static/*` is immutable.

## Worker unit tests
- A valid event is stored as only name, label, path and country.
- GET is rejected (405); cross-origin or missing `Origin` is rejected (403); a wrong content type is rejected (415); a body over 512 bytes is rejected (413).
- Malformed JSON, unknown events, bad paths, bad labels, extra keys and arrays are all rejected (400), and nothing is stored.
- Unknown `/api/*` routes return 404; other paths are passed to static assets.
- A failing analytics binding still returns 204; a crash returns a generic 500 with no internal detail.
- Without a binding, events are logged as one structured line.

## Cloudflare runtime smoke test (`wrangler dev`)
```
/ 200 · /terms 200 · /privacy 200 · /contact 200 · /terms.html 307 → /terms · /nope 404
/sitemap.xml 200 · /robots.txt 200
HTML:      Cache-Control: public, max-age=0, must-revalidate
/static/*: Cache-Control: public, max-age=31536000, immutable
/assets/*: Cache-Control: public, max-age=86400, stale-while-revalidate=604800
Headers on /: CSP, Strict-Transport-Security, COOP, Permissions-Policy, X-Frame-Options present
POST /api/event same-origin → 204 (logged {"type":"site_event","event":"hero_cta",…,"country":"US"})
POST /api/event cross-origin → 403 · GET /api/event → 405
```

## Not run here, and why
| Check | Reason | How to run |
|---|---|---|
| Lighthouse against production `https://askamari.us` | This build environment's network can't reach the live domain | PageSpeed Insights |
| Google Rich Results Test / Schema validator | Online-only tools | See SEO.md |
| Real screen readers (VoiceOver, NVDA) | Need real devices | See ACCESSIBILITY.md |
| Type checking (`tsc`) | No TypeScript dependency is installed (by choice); files are annotated with `// @ts-check` and JSDoc | `npx -p typescript tsc --noEmit --allowJs --checkJs scripts/build.mjs worker/index.js` |
| Cross-browser (Firefox, WebKit) | Only Chromium is installed here | `npx playwright install firefox webkit`, then run with other browsers |

## Known issues
None failing. Open items are listed with priorities in PROJECT_AUDIT.md §8.
