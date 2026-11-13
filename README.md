# Amari: marketing website

**Snap. Discover. Cook.** The website for Amari ("Ask Amari"), the AI kitchen assistant: <https://askamari.us>. The app itself lives at <https://app.askamari.us>.

A static site with no framework. A zero-dependency Node build renders every page from one config file. It is served by **Cloudflare Workers static assets**, plus a tiny Worker for first-party analytics events.

## Quick start

```bash
npm install          # dev tools only: wrangler, playwright, axe
npm run build        # render public/ from site.config.json + src/ + content/
npm test             # build check + lint + 30 Playwright/axe/unit tests
npm run dev          # build, then serve locally on Cloudflare's runtime
```

## Where things live

| Path | What it is |
|---|---|
| `site.config.json` | **Change brand details here:** name, tagline, links (web app, App Store, Google Play), contact email, nav, CTA labels, footer, SEO defaults, OG image, analytics switches |
| `src/pages/index.html` | Homepage content, with `{{config.path}}` tokens filled from the config |
| `src/styles.css` | Design system: primitive palette, brand aliases, typography scale, components. Raw colors outside the token blocks fail lint. |
| `src/app.js` | Progressive enhancement: springs, carousel, menu, legal contents list, conversion events |
| `content/legal/*.md` | Terms of Use and Privacy Policy, **as supplied by the owner** |
| `content/pages/contact.md` | Contact page |
| `scripts/build.mjs` | Build: pages, shared header/footer/head, JSON-LD, fingerprinted CSS/JS, sitemap, robots, manifest, `_headers` |
| `scripts/lint.mjs` | Syntax, design-token, CSP and HTML hygiene checks |
| `worker/index.js` | `/api/event` endpoint (cookieless events); everything else is static |
| `public/` | **Generated output.** Committed, served as-is. Don't edit by hand. |
| `tests/` | Playwright end-to-end tests plus Worker unit tests |

Routes: `/`, `/terms`, `/privacy`, `/contact`, and a branded `404`.

## Common changes

- **Store links when the apps launch:** set `links.appStore` / `links.googlePlay` in `site.config.json`, add the badges to `src/pages/index.html`, and remove the "no app-store links" test.
- **Legal text:** edit `content/legal/*.md`, then run `npm run build`.
- **Brand color:** change the primitives at the top of `src/styles.css`.

Always run `npm run build` and commit `public/`. `npm test` fails if `public/` is stale.

## Docs

[PROJECT_AUDIT.md](PROJECT_AUDIT.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) · [SECURITY.md](SECURITY.md) · [SEO.md](SEO.md) · [PERFORMANCE.md](PERFORMANCE.md) · [ACCESSIBILITY.md](ACCESSIBILITY.md) · [TEST_REPORT.md](TEST_REPORT.md)
