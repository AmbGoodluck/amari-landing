# Environment variables and configuration

**The site uses no environment variables and no secrets.** Everything configurable is public and lives in `site.config.json`, which is safe to commit. Never add API keys to this repository: nothing here runs privileged operations.

## `site.config.json`
| Key | Purpose | Current value |
|---|---|---|
| `brand.*` | Name, app name, descriptor, tagline, pitch, logo path | Amari / Ask Amari / Your AI Kitchen Assistant |
| `site.url` | Canonical origin for canonical tags, OG, sitemap and JSON-LD. **Must be https.** | `https://askamari.us` |
| `links.webApp` | Primary CTA target | `https://app.askamari.us` |
| `links.signIn` | "Sign in" in the nav (empty hides it) | `https://app.askamari.us` |
| `links.appStore`, `links.googlePlay` | Store listings. Empty while the apps are in testing. | `""` |
| `contact.email` | Footer, FAQ, contact page, JSON-LD | `support@askamari.us` |
| `social[]` | `{ "label", "href" }` entries for the footer and JSON-LD `sameAs`. Add real profiles only. | `[]` |
| `nav[]`, `cta.*`, `footer.*` | Navigation and button labels | see file |
| `seo.*` | Default title, description, OG image and alt text, theme colors | see file |
| `analytics.cloudflareWebAnalytics` | Allows Cloudflare Web Analytics in the CSP | `true` |
| `analytics.cloudflareBeaconToken` | Optional manual beacon token (32 hex characters). Leave empty if using automatic setup. | `""` |
| `analytics.events` | First-party conversion events to `/api/event` | `true` |

The build validates these values: https-only links, a valid email, and a well-formed token. A bad value fails the build.

## Analytics setup (manual steps)

### 1. Cloudflare Web Analytics: page views and Core Web Vitals
Cookieless, so no consent banner is required.
1. Cloudflare dashboard → **Analytics & Logs → Web Analytics → Add a site** → `askamari.us`.
2. Because the domain is proxied by Cloudflare, choose **automatic setup**: Cloudflare injects the beacon and the CSP already allows it.
3. *Or* choose manual setup, copy the token into `analytics.cloudflareBeaconToken`, then `npm run build` and commit.

### 2. Conversion events: hero CTA, nav, FAQ, section views
These already work. Events are sent to the site's own `/api/event` and handled by `worker/index.js`.
- **Now:** each event is one structured log line in **Workers Logs**: `{"type":"site_event","event":"hero_cta","label":"…","path":"/","country":"US"}`.
- **For dashboards and SQL** (recommended), enable Workers Analytics Engine by adding this to `wrangler.jsonc`:
  ```jsonc
  "analytics_engine_datasets": [{ "binding": "EVENTS", "dataset": "amari_site_events" }]
  ```
  Push it, then query with the Analytics Engine SQL API, for example: `SELECT blob1 AS event, SUM(_sample_interval) AS n FROM amari_site_events WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY event`.

Event names tracked: `hero_cta`, `hero_secondary`, `nav_cta`, `nav_signin`, `nav_link`, `get_started_cta`, `footer_cta`, `footer_link`, `contact_email`, `faq_open`, `faq_webapp`, `section_view` (and `app_store` / `google_play` for when store links exist).

**What's stored:** the event name, a short label (for example the button text as a slug), the page path, and the Cloudflare country code.
**Never stored:** IP address, user agent, cookies, any identifier, or any form content.
**Not sent at all** when the browser signals Global Privacy Control or Do Not Track.

### 3. Search engines
See SEO.md for Google Search Console and Bing Webmaster Tools. Verify ownership by DNS TXT record, which needs no code change.
