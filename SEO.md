# SEO

## Implemented
| Item | Where | Notes |
|---|---|---|
| Unique titles and descriptions | `site.config.json` (home), `scripts/build.mjs` (other pages) | Home: "Amari \| Your AI Kitchen Assistant — Snap, Discover, Cook" |
| Canonical URLs | Every indexable page → `https://askamari.us/...` | Tested |
| `noindex` | 404 page only | Tested |
| `sitemap.xml` | `/`, `/terms`, `/privacy`, `/contact` | Generated |
| `robots.txt` | Allows all, disallows `/api/`, points to the sitemap | Generated |
| Open Graph and X/Twitter cards | Absolute `og:url` and `og:image` (1200×630), image alt, locale | Tested absolute |
| Headings | Exactly one `<h1>` per page, then `h2` sections and `h3` items | Lint plus test |
| Clean URLs | `/terms`, not `/terms.html` (which redirects with a 307) | `wrangler dev` |
| Favicon and app icons | SVG + 32px PNG, Apple touch icon, 192/512 manifest icons | — |
| JSON-LD | `Organization`, `WebSite`, `SoftwareApplication` (`Ask Amari`, Web, `price: 0 USD`) | Parsed in tests |
| Keywords | Used naturally in copy: AI kitchen assistant, what can I cook with what I have, ingredient scanner, fridge and pantry, personalized recipes, meal planning | Not stuffed |

## Deliberately not included
- **FAQPage structured data.** Since 2023, Google shows FAQ rich results only for well-known government and health sites, so the page doesn't qualify. The FAQ stays as visible content.
- **Ratings, review counts, download counts.** None exist yet, and inventing them violates search guidelines.
- **iOS in `operatingSystem`.** The iPhone app is in testing. Add it, plus the App Store URL, once it's public.

## Validate before and after each deploy
1. Google **Rich Results Test** → `https://askamari.us/`. Expect Organization and SoftwareApplication detected, with no errors.
2. **Schema.org validator** (validator.schema.org) → same URL.
3. Card previews: opengraph.xyz or LinkedIn Post Inspector → `https://askamari.us/`.

These are online tools, so they couldn't be run from the build environment. The JSON-LD is parsed and checked for required types in `npm test`.

## Search engine setup (owner actions)
1. **Google Search Console** → add a *Domain property* `askamari.us` and verify by DNS TXT record (Cloudflare DNS) → Sitemaps → submit `https://askamari.us/sitemap.xml` → URL Inspection → request indexing for `/`.
2. **Bing Webmaster Tools** → import from Search Console, or verify by DNS → submit the sitemap.
3. **Monitor monthly:** Performance (queries, CTR), Pages (indexing), Core Web Vitals, Enhancements.
4. Make sure only one host is indexable: redirect `www` and `*.workers.dev` to `https://askamari.us` (see DEPLOYMENT.md).

## Outstanding
- **P2:** consider a short `/about` page or a blog later (the architecture supports Markdown pages under `content/pages`).
- **P3:** localized versions (`hreflang`) when other languages launch.
