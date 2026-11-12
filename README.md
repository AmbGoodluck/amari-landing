# Amari — Landing Page

**Snap. Discover. Cook.** Marketing site for Amari, the AI kitchen assistant that turns a photo of your fridge or pantry into personalized recipes.

A zero-build static site (HTML, CSS, vanilla JS) served by **Cloudflare Workers static assets**, deployed from GitHub with Workers Builds.

## Structure

```
public/
  index.html      # all sections: hero, how it works, features, recipes, download
  styles.css      # design tokens, light/dark, responsive, a11y media queries
  app.js          # springs, pointer tilt, momentum carousel, menu, reveals
  assets/         # optimized WebP photography, favicon, OG image
  _headers        # security headers + asset caching (CSP: self only)
  terms.html      # generated from content/legal/terms.md
  privacy.html    # generated from content/legal/privacy.md
  404.html
content/legal/        # source Markdown for /terms and /privacy
scripts/build-legal.mjs  # zero-dependency Markdown → HTML for the legal pages
tests/site.test.mjs   # Playwright + axe end-to-end checks
wrangler.jsonc        # Cloudflare Workers static-assets config (assets dir: public)
docs/superpowers/     # design spec + implementation plan
```

## Develop

```bash
npm install
npm run dev        # wrangler dev → http://localhost:8787
npm test           # Playwright + axe checks against ./public
npm run build:legal  # after editing content/legal/*.md (tests fail if you forget)
```

## Deploy (Cloudflare Workers Builds)

Connected to GitHub: every push to `main` builds and deploys automatically.

| Setting | Value |
|---|---|
| Build command | *(empty)* |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Production branch | `main` |

`wrangler.jsonc` points `assets.directory` at `./public`; there is no Worker script.
Manual deploy from a laptop: `npx wrangler login && npm run deploy`.

## Design notes

Built to Apple's interface guidelines, translated to the web:

- **Type** — system font stack (SF Pro on Apple devices), size-specific tracking (display −0.045em, body ≈0), tight leading on display, `rem` sizing so text scaling never breaks layout.
- **Materials** — the nav becomes a translucent `backdrop-filter` layer only once content scrolls under it; heart buttons on photos use the same material.
- **Motion** — a velocity-aware, interruptible spring drives everything touchable. The recipe carousel tracks the pointer 1:1, projects flicks forward (`v/1000 · d/(1−d)`, d = 0.998), rubber-bands at the ends, and can be grabbed mid-flight. Press feedback is on pointer-down.
- **Accessibility** — semantic landmarks, skip link, visible focus rings, keyboard-operable carousel, live region for carousel position; honors `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more`, `forced-colors`, and light/dark.
- **Responsibility** — allergy-aware messaging with a reminder to always check labels.

Store badges link to `#download` until the App Store and Google Play listings are live.
