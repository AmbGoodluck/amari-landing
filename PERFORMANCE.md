# Performance

## Results (Lighthouse 12, local Cloudflare runtime `wrangler dev`, 2026-11-12)
| Page | Form factor | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | Mobile (simulated slow 4G) | **99** | 100 | 100 | 100 | **2.3 s** | 0 | 30 ms |
| `/` | Desktop | **100** | 100 | 100 | 100 | 0.4 s | 0 | 0 ms |
| `/privacy` | Mobile | **100** | 100 | 100 | 100 | 1.0 s | 0 | 10 ms |
| `/` (before this work) | Mobile | 97 | 100 | 100 | 100 | 2.6 s | 0 | 60 ms |

Targets: LCP ≤ 2.5 s ✅ · CLS ≤ 0.1 ✅ · INP ≤ 200 ms. INP can't be measured in a lab; TBT of 30 ms and only ~6 KB of gzipped JS make it very unlikely to be a problem. Watch the real-user INP in Cloudflare Web Analytics → Core Web Vitals. Production numbers will differ from local runs: the CDN helps, while real devices and networks vary.

## What's done
- **No framework, no third-party scripts.** JS is 19.5 KB raw / 6.4 KB gzip, `defer`red, and the page works without it.
- **CSS:** one file, 10.5 KB gzip, render-blocking but small and immutably cached.
- **Fonts:** system font stack, so no web-font download and no layout shift from fonts.
- **Images:** WebP, explicit `width`/`height` (CLS 0), responsive `srcset`/`sizes` for the produce and recipe photos (180–720 px variants), `loading="lazy"` below the fold, `fetchpriority="high"` on the hero image. The LCP element is now hero **text**.
- **Caching:** content-hashed `/static/*` uses `immutable` with a 1-year cache; images get 1 day plus SWR; HTML revalidates every time.
- **Motion:** only `transform` and `opacity` are animated; springs run on `requestAnimationFrame` and stop at rest; `prefers-reduced-motion` turns them off.

## Remaining opportunities
| Priority | Item | Expected gain |
|---|---|---|
| P3 | Minify CSS/JS (Lighthouse estimates ~2 KB each) | Very small. Not worth adding a dependency today |
| P3 | Extra smaller variants for the avocado and phone-mock images on 1.75× DPR phones | ~60 KB on first mobile load, deferred images only |
| P3 | AVIF alternates via `<picture>` | ~20–30% smaller images |

## How to re-measure
```bash
npm run dev            # serves on http://localhost:8787
npx lighthouse http://localhost:8787/ --view
```
In production, use PageSpeed Insights on `https://askamari.us/` and the Core Web Vitals report in Search Console.
