# Security

**Scope:** the askamari.us marketing site. This covers a static site, plus a single Worker endpoint (`POST /api/event`). There are **no forms, no accounts, no cookies and no secrets** on this site. Sign-in lives in the separate web app at `app.askamari.us`, which this repository does not contain.

## Defenses in place
| Area | Implementation | Verified by |
|---|---|---|
| **CSP** | `default-src 'self'`; scripts and styles from `'self'` only (plus `static.cloudflareinsights.com` for Web Analytics); `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests`. **No `unsafe-inline` or `unsafe-eval`.** | Tests serve every page under the real policy and fail on any CSP console error; lint rejects inline styles and scripts |
| **HSTS** | `Strict-Transport-Security: max-age=31536000`. `includeSubDomains` and `preload` are deliberately left off until every `*.askamari.us` host is confirmed HTTPS-only. | Test plus `wrangler dev` header check |
| **Other headers** | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (legacy, alongside CSP `frame-ancestors`), `Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy` denying camera, mic, geolocation, payment, usb and topics | `wrangler dev` header check |
| **XSS** | No client-side HTML rendering, no `innerHTML` with data, no third-party scripts. The Markdown build escapes all text, allows only `https:`, `mailto:`, `/` and `#` links, and JSON-LD escapes `<` | Lint plus build code review |
| **Event endpoint** | POST only; **same-origin `Origin` required**; `text/plain` or JSON only; body ≤ 512 bytes; strict schema (event allowlist, label `^[a-z0-9_-]{0,40}$`, path `^/[a-z0-9/_-]{0,64}$`, no extra keys); `no-store`; generic error bodies; analytics failures are swallowed | 8 Worker unit tests (`tests/worker.test.mjs`) |
| **Privacy by design** | Events carry no IP, user agent, cookies or identifiers; Global Privacy Control and Do Not Track disable them | E2E test |
| **CSRF** | Not applicable: no authenticated or state-changing endpoints. The one write endpoint is same-origin-only and stores anonymous counts | — |
| **Open redirects** | None: there's no redirect logic | — |
| **Directory listing / env files** | Workers static assets never lists directories. Only `public/` is uploaded, and no `.env` exists | — |
| **Secrets** | None needed and none committed. `.gitignore` covers `.env*` and `.dev.vars` | `git ls-files` check |
| **Dependencies** | Zero runtime dependencies. Dev only: `wrangler`, `playwright` (pinned), `@axe-core/playwright`. Lockfile committed | `npm audit`: **0 vulnerabilities** (2026-11-13) |

## Known gaps and recommendations
| Priority | Item | Action |
|---|---|---|
| P2 | **No rate limit on `/api/event`.** The schema and same-origin checks limit abuse to inflating anonymous counts | Add a Cloudflare **Rate Limiting rule** (free plan includes one): path `/api/event`, 30 requests per 10 s per IP → block |
| P2 | No automated dependency monitoring | Enable **Dependabot alerts** and security updates in the GitHub repo settings |
| P3 | HSTS preload | After confirming every subdomain is HTTPS-only, use `max-age=63072000; includeSubDomains; preload` and submit to hstspreload.org |
| Owner | Privacy Policy and website analytics | The policy describes the *app*. Consider adding one sentence that askamari.us uses cookieless Cloudflare Web Analytics and anonymous click counts |

## Reporting a vulnerability
Email **support@askamari.us** with the subject "Security".
