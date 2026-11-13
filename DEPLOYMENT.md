# Deployment

## How it deploys today
- **Host:** Cloudflare Workers (project `amari-landing`), with static assets from `./public` and `worker/index.js` for `/api/*` only.
- **CI/CD:** Cloudflare **Workers Builds** is connected to `AmbGoodluck/amari-landing`. Every push to `main` runs `npx wrangler deploy`.
- **Build command:** *none needed.* `public/` is generated locally by `npm run build` and committed, and `npm test` fails if it's stale.
- **Domain:** `askamari.us` (custom domain on the Worker). HTTPS is provided by Cloudflare.

## Dashboard settings (Workers & Pages → amari-landing → Settings → Build)
| Setting | Value |
|---|---|
| Build command | *(empty)* |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Production branch | `main` |
| Build variables | none |

## Release checklist
1. `npm run build`
2. `npm test` must show **30 pass, 0 fail**. It covers the build check, lint, Playwright, axe and the Worker unit tests.
3. Commit, including `public/`, and push to `main`.
4. Watch the build in **Deployments**.
5. Smoke test: `curl -sI https://askamari.us/ | grep -i strict-transport` and open `/`, `/terms`, `/privacy`, `/contact`.

## Preview deployments
In Settings → Build, enable **builds for non-production branches**. Each branch gets a preview URL. Previews are separate hostnames, so analytics events there are reported under that host.

## Rollback
- **Fastest:** Workers & Pages → amari-landing → **Deployments**. Pick the last good version, then **Rollback**. No rebuild is needed and it takes effect immediately.
- **CLI:** `npx wrangler rollback` (requires `wrangler login`).
- **Git:** `git revert <bad-commit> && git push`. Workers Builds redeploys.

## Canonical domain and redirects
- **Canonical:** `https://askamari.us` (set in `site.config.json → site.url`). Canonical tags, OG URLs and the sitemap use it.
- **Recommended:** if `www.askamari.us` resolves, add a Cloudflare **Redirect Rule** sending `www.askamari.us/*` to `https://askamari.us/${1}` (301). Do the same for the `*.workers.dev` URL, or disable it under Settings → Domains & Routes, so search engines see only one host.
- **`.html` URLs:** `/terms.html` is redirected to `/terms` automatically by Workers static assets.

## Error pages
- **404:** `public/404.html` (branded, `noindex`) via `not_found_handling: "404-page"`.
- **500:** the Worker only runs for `/api/*`, and returns a generic JSON 500 without internal details.

## Compression and caching
- Cloudflare compresses responses automatically (Brotli/gzip).
- `/static/*` (content-hashed CSS/JS): `max-age=31536000, immutable`.
- `/assets/*` (images): 1 day, plus a week of `stale-while-revalidate`.
- HTML: Cloudflare default `public, max-age=0, must-revalidate`, so every deploy is visible immediately.

## Monitoring
- **Uptime:** add a free external check on `https://askamari.us/` (Cloudflare Health Checks on paid zones, or any uptime service).
- **Logs:** Workers Logs is enabled (`observability`) under Workers & Pages → amari-landing → Logs. It contains only structured `site_event` lines and Worker errors, never IPs or personal data.
- **Performance:** Cloudflare Web Analytics, under Core Web Vitals (see ENVIRONMENT_VARIABLES.md).

## Secrets
None. The site needs no API keys, and nothing secret belongs in this repository.
