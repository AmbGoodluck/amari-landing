// End-to-end checks for the built site in ./public.
// A local server mirrors Cloudflare: extensionless routes (/terms → terms.html),
// the 404 page, the generated _headers CSP, and /api/* handled by the real Worker.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import worker from '../worker/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { AxeBuilder } = await import('@axe-core/playwright');

const ROOT = new URL('../public/', import.meta.url).pathname;
const config = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
const HEADERS = readFileSync(join(ROOT, '_headers'), 'utf8');
const CSP = HEADERS.match(/Content-Security-Policy:\s*(.+)/)[1].trim();
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain',
};
const PAGES = ['/', '/terms', '/privacy', '/contact'];
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

let server, base, browser;
const recorded = []; // events the Worker wrote

before(async () => {
  const env = {
    EVENTS: { writeDataPoint: (d) => recorded.push(d.blobs[0]) },
    ASSETS: { fetch: () => new Response('asset', { status: 200 }) },
  };
  server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const r = await worker.fetch(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), env);
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    if (!extname(path)) path += '.html';
    const file = normalize(join(ROOT, path));
    const send = async (status, f) => res.writeHead(status, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream', 'content-security-policy': CSP }).end(await readFile(f));
    if (!file.startsWith(ROOT) || !existsSync(file)) return send(404, join(ROOT, '404.html'));
    return send(200, file);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => { await browser?.close(); server?.close(); });

async function open(opts = {}, path = '/') {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  page.once('close', () => context.close().catch(() => {}));
  // External destinations are stubbed so tests never leave the machine.
  await page.route(/^https:\/\/(app\.)?askamari\.us\//, (r) => r.fulfill({ status: 200, body: 'stub' }));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`${r.status()}: ${r.url()}`); });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  return { page, errors };
}

/* ------------------------------------------------------------------ */
/* Pages and links                                                     */
/* ------------------------------------------------------------------ */
for (const path of PAGES) {
  test(`${path} loads with one h1, a canonical URL and no console or network errors`, async () => {
    const { page, errors } = await open({ viewport: { width: 1280, height: 900 } }, path);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), config.site.url + (path === '/' ? '/' : path));
    assert.equal(await page.locator('.site-header .brand-mark use[href="#logo"]').count(), 1, 'logo missing from nav');
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('the homepage title and description come from site.config.json', async () => {
  const { page } = await open({ viewport: { width: 1280, height: 900 } });
  assert.equal(await page.title(), config.seo.title);
  assert.equal(await page.locator('meta[name=description]').getAttribute('content'), config.seo.description);
  await page.close();
});

test('no dead links: every in-page anchor, internal route and external host resolves', async () => {
  const allowedHosts = new Set([new URL(config.site.url).host, new URL(config.links.webApp).host]);
  for (const path of PAGES) {
    const { page } = await open({ viewport: { width: 1280, height: 900 } }, path);
    const hrefs = await page.$$eval('a[href]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
    for (const h of hrefs) {
      assert.notEqual(h, '#', `${path}: empty "#" link`);
      if (h.startsWith('#')) {
        assert.equal(await page.locator(`[id="${h.slice(1)}"]`).count(), 1, `${path}: missing target ${h}`);
      } else if (h.startsWith('/')) {
        const [route, hash] = h.split('#');
        const res = await page.request.get(base + route);
        assert.equal(res.status(), 200, `${path}: ${h} → ${res.status()}`);
        if (hash) assert.ok((await res.text()).includes(`id="${hash}"`), `${path}: ${h} anchor missing`);
      } else if (h.startsWith('mailto:')) {
        assert.equal(h, `mailto:${config.contact.email}`, `${path}: unexpected mailto ${h}`);
      } else {
        const u = new URL(h);
        assert.equal(u.protocol, 'https:', `${path}: insecure link ${h}`);
        assert.ok(allowedHosts.has(u.host), `${path}: unexpected external host ${h}`);
      }
    }
    await page.close();
  }
});

test('no app-store download links while the apps are in testing', async () => {
  const { page } = await open({ viewport: { width: 1280, height: 900 } });
  const text = await page.locator('body').textContent();
  assert.doesNotMatch(text, /Google Play|Download on the App Store/);
  assert.equal(await page.locator('a[href*="apps.apple.com"], a[href*="play.google.com"]').count(), 0);
  for (const sel of ['[data-track="hero_cta"]', '[data-track="nav_cta"]', '[data-track="get_started_cta"]']) {
    assert.equal(await page.locator(sel).getAttribute('href'), config.links.webApp, `${sel} should open the web app`);
  }
  await page.close();
});

test('legal pages: table of contents works, placeholders are highlighted, internal notes are not published', async () => {
  for (const path of ['/terms', '/privacy']) {
    const { page } = await open({ viewport: { width: 1280, height: 900 } }, path);
    const targets = await page.$$eval('.legal-toc a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')));
    assert.ok(targets.length >= 15, `${path}: TOC too short`);
    for (const h of targets) assert.equal(await page.locator(`[id="${h.slice(1)}"]`).count(), 1, `${path}: ${h}`);
    assert.ok(await page.locator('mark.placeholder').count() > 0);
    assert.doesNotMatch(await page.locator('main').textContent(), /Appendix A|App Store Connect|Confirm against each provider/);
    await page.close();
  }
});

test('unknown routes return the branded 404 page, marked noindex', async () => {
  const res = await fetch(`${base}/does-not-exist`);
  assert.equal(res.status, 404);
  const html = await res.text();
  assert.match(html, /This page isn’t on the menu/);
  assert.match(html, /<meta name="robots" content="noindex">/);
});

/* ------------------------------------------------------------------ */
/* Responsive                                                          */
/* ------------------------------------------------------------------ */
test('no horizontal overflow and unobstructed hero buttons at all 9 widths, on every page', async () => {
  for (const width of WIDTHS) {
    for (const path of PAGES) {
      const { page } = await open({ viewport: { width, height: 900 } }, path);
      const r = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - innerWidth;
        const blocked = [...document.querySelectorAll('.hero-actions .btn')].filter((el) => {
          const b = el.getBoundingClientRect();
          const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          return b.width > 0 && top && !el.contains(top);
        }).length;
        return { overflow, blocked };
      });
      assert.ok(r.overflow <= 0, `${path} @${width}px overflows by ${r.overflow}px`);
      assert.equal(r.blocked, 0, `${path} @${width}px: hero button covered`);
      await page.close();
    }
  }
});

/* ------------------------------------------------------------------ */
/* Interaction                                                         */
/* ------------------------------------------------------------------ */
test('mobile menu opens, and closes with Escape returning focus to the toggle', async () => {
  const { page } = await open({ viewport: { width: 390, height: 844 } });
  const btn = page.locator('.nav-toggle');
  await btn.click();
  assert.equal(await btn.getAttribute('aria-expanded'), 'true');
  await page.waitForSelector('#nav-menu.is-open');
  await page.keyboard.press('Escape');
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('nav-toggle')), true);
  await page.close();
});

test('FAQ items open and close from the keyboard', async () => {
  const { page } = await open({ viewport: { width: 1280, height: 900 } });
  const first = page.locator('.faq-item').first();
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await first.evaluate((d) => d.open), true);
  assert.ok(await first.locator('.faq-answer').isVisible());
  await page.keyboard.press('Enter');
  assert.equal(await first.evaluate((d) => d.open), false);
  await page.close();
});

async function carouselPage() {
  const { page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.locator('#recipes').scrollIntoViewIfNeeded();
  const pos = () => page.$eval('.carousel-track', (t) => t.getBoundingClientRect().left);
  const step = await page.$$eval('.recipe-card', (c) => c[1].getBoundingClientRect().left - c[0].getBoundingClientRect().left);
  const vp = await page.locator('.carousel-viewport').boundingBox();
  return { page, pos, step, vp, start: await pos() };
}

test('carousel: next button and arrow keys move it', async () => {
  const { page, pos, start } = await carouselPage();
  await page.locator('.carousel-next').click();
  await page.waitForTimeout(900);
  assert.ok((await pos()) < start - 50);
  await page.locator('.carousel-viewport').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(900);
  assert.ok(Math.abs((await pos()) - start) < 2);
  await page.close();
});

test('carousel: follows a drag; a hold before release does not fling', async () => {
  const { page, pos, vp, start } = await carouselPage();
  const y = vp.y + vp.height / 2;
  await page.mouse.move(vp.x + 900, y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(vp.x + 900 - i * 30, y);
  await page.mouse.up(); await page.waitForTimeout(1200);
  const afterDrag = await pos();
  assert.ok(afterDrag < start - 50, 'drag did not move the track');
  await page.mouse.move(vp.x + 600, y); await page.mouse.down();
  for (let i = 1; i <= 7; i++) await page.mouse.move(vp.x + 600 + i * 15, y);
  await page.waitForTimeout(400); await page.mouse.up(); await page.waitForTimeout(1200);
  assert.ok(Math.abs((await pos()) - afterDrag) < 2, 'flung after a hold');
  await page.close();
});

test('carousel: a tap mid-flight settles on a card; release outside leaves no stale drag', async () => {
  const { page, pos, step, vp, start } = await carouselPage();
  await page.locator('.carousel-next').click();
  await page.waitForTimeout(60);
  await page.mouse.click(vp.x + 600, vp.y + 40);
  await page.waitForTimeout(1200);
  const off = (start - (await pos())) / step;
  assert.ok(Math.abs(off - Math.round(off)) < 0.02, `parked between cards (${off})`);
  const settled = await pos();
  const y = vp.y + vp.height / 2;
  await page.mouse.move(vp.x + 600, y); await page.mouse.down();
  await page.mouse.move(vp.x + 600, vp.y - 200); await page.mouse.up();
  for (let i = 1; i <= 8; i++) await page.mouse.move(vp.x + 900 - i * 30, y);
  await page.waitForTimeout(800);
  assert.ok(Math.abs((await pos()) - settled) < 2, 'hover moved the carousel');
  await page.close();
});

test('carousel: keyboard focus stays on Next at the end', async () => {
  const { page } = await carouselPage();
  await page.locator('.carousel-next').focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('carousel-next')), true);
  assert.equal(await page.locator('.carousel-next').getAttribute('aria-disabled'), 'true');
  await page.close();
});

/* ------------------------------------------------------------------ */
/* Analytics events                                                    */
/* ------------------------------------------------------------------ */
test('conversion events reach the Worker (hero CTA, FAQ, section views)', async () => {
  recorded.length = 0;
  const { page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.locator('.faq-item summary').first().scrollIntoViewIfNeeded();
  await page.locator('.faq-item summary').first().click();
  await page.locator('[data-track="hero_cta"]').scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL(/app\.askamari\.us/), page.locator('[data-track="hero_cta"]').click()]);
  await new Promise((r) => setTimeout(r, 500));
  for (const e of ['hero_cta', 'faq_open', 'section_view']) assert.ok(recorded.includes(e), `missing ${e}: ${recorded}`);
  await page.close();
});

test('no events are sent when the visitor signals Global Privacy Control', async () => {
  recorded.length = 0;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('.faq-item summary').first().click();
  await page.waitForTimeout(500);
  assert.deepEqual(recorded, []);
  await context.close();
});

/* ------------------------------------------------------------------ */
/* Accessibility                                                       */
/* ------------------------------------------------------------------ */
test('no serious or critical axe violations on any page, light and dark', async () => {
  for (const path of PAGES) {
    for (const colorScheme of ['light', 'dark']) {
      const width = path === '/' ? 1280 : 375;
      const { page } = await open({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce' }, path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      assert.deepEqual(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), [], `${path} ${colorScheme}`);
      await page.close();
    }
  }
});

/* ------------------------------------------------------------------ */
/* SEO and headers                                                     */
/* ------------------------------------------------------------------ */
test('structured data is valid JSON-LD with real facts only', async () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const raw = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)[1];
  const ld = JSON.parse(raw);
  const types = ld['@graph'].map((n) => n['@type']);
  assert.deepEqual(types.sort(), ['Organization', 'SoftwareApplication', 'WebSite']);
  assert.doesNotMatch(raw, /aggregateRating|ratingValue|reviewCount|"review"/, 'no invented ratings');
  const app = ld['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
  assert.equal(app.offers.price, '0');
  assert.equal(app.url, config.links.webApp);
});

test('social cards use absolute URLs', async () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const prop of ['og:image', 'og:url']) {
    const v = html.match(new RegExp(`property="${prop}" content="([^"]+)"`))[1];
    assert.match(v, /^https:\/\//, `${prop} must be absolute`);
  }
});

test('sitemap, robots and security headers are correct', () => {
  const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  for (const p of PAGES) assert.ok(sitemap.includes(`<loc>${config.site.url}${p}</loc>`), `sitemap missing ${p}`);
  const robots = readFileSync(join(ROOT, 'robots.txt'), 'utf8');
  assert.match(robots, new RegExp(`Sitemap: ${config.site.url}/sitemap.xml`));
  assert.match(HEADERS, /Strict-Transport-Security: max-age=\d+/);
  assert.match(CSP, /frame-ancestors 'none'/);
  assert.doesNotMatch(CSP, /unsafe-inline|unsafe-eval/);
  assert.match(HEADERS, /\/static\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
});

test('the main navigation links to Privacy and Terms on every page, marking the current one', async () => {
  for (const path of PAGES) {
    const { page } = await open({ viewport: { width: 1280, height: 900 } }, path);
    for (const href of ['/privacy', '/terms']) {
      const link = page.locator(`.site-header .nav-links a[href="${href}"]`);
      assert.equal(await link.count(), 1, `${path}: nav missing ${href}`);
      assert.ok(await link.isVisible(), `${path}: ${href} not visible in nav`);
      assert.equal(await link.getAttribute('aria-current'), path === href ? 'page' : null, `${path}: aria-current on ${href}`);
    }
    // Legal links appear once in the footer (Legal column), not duplicated under Product.
    assert.equal(await page.locator('.site-footer a[href="/privacy"]').count(), 1, `${path}: footer privacy duplicated`);
    await page.close();
  }
  // Reachable from the mobile menu too.
  const { page } = await open({ viewport: { width: 390, height: 844 } });
  await page.locator('.nav-toggle').click();
  await page.waitForSelector('#nav-menu.is-open');
  assert.ok(await page.locator('#nav-menu a[href="/terms"]').isVisible());
  assert.ok(await page.locator('#nav-menu a[href="/privacy"]').isVisible());
  await page.close();
});
