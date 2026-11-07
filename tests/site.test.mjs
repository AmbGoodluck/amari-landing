// End-to-end checks for the static landing page.
// Serves ./public on a throwaway local server and drives it with Playwright.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { AxeBuilder } = await import('@axe-core/playwright');

const ROOT = new URL('../public/', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain',
};

const HEADERS_FILE = await readFile(join(ROOT, '_headers'), 'utf8');
const CSP = HEADERS_FILE.match(/Content-Security-Policy:\s*(.+)/)[1].trim();

let server, base, browser;

before(async () => {
  server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
        'content-security-policy': CSP, // same policy production serves via _headers
      }).end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(opts = {}) {
  const context = await browser.newContext(opts); // axe requires an explicit context
  const page = await context.newPage();
  page.once('close', () => context.close().catch(() => {}));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  return { page, errors };
}

test('loads with a title and no console or network errors', async () => {
  const { page, errors } = await open({ viewport: { width: 1440, height: 900 } });
  assert.match(await page.title(), /Amari/);
  assert.equal(await page.locator('h1').count(), 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test('404 page renders under the same policy without errors', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}404.html`, { waitUntil: 'networkidle' });
  assert.match(await page.title(), /not found/i);
  assert.deepEqual(errors, []);
  await context.close();
});

test('every in-page nav link points at an existing section', async () => {
  const { page } = await open({ viewport: { width: 1440, height: 900 } });
  const hrefs = await page.$$eval('a[href^="#"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  for (const id of ['#features', '#how-it-works', '#recipes', '#download', '#main']) assert.ok(hrefs.includes(id), `missing link ${id}`);
  for (const h of hrefs) {
    if (h === '#') continue;
    assert.equal(await page.locator(h).count(), 1, `no target for ${h}`);
  }
  await page.close();
});

test('images all have alt text and intrinsic sizes', async () => {
  const { page } = await open({ viewport: { width: 1440, height: 900 } });
  const bad = await page.$$eval('img', (imgs) => imgs
    .filter((i) => !i.hasAttribute('alt') || !i.getAttribute('width') || !i.getAttribute('height'))
    .map((i) => i.src));
  assert.deepEqual(bad, []);
  await page.close();
});

test('no horizontal overflow on a 375px phone', async () => {
  const { page } = await open({ viewport: { width: 375, height: 812 } });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `page overflows by ${overflow}px`);
  await page.close();
});

test('mobile menu opens, traps nothing, and closes with Escape', async () => {
  const { page } = await open({ viewport: { width: 390, height: 844 } });
  const btn = page.locator('.nav-toggle');
  await assert.doesNotReject(btn.waitFor({ state: 'visible' }));
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');
  await btn.click();
  assert.equal(await btn.getAttribute('aria-expanded'), 'true');
  await page.waitForSelector('#nav-menu.is-open');
  await page.keyboard.press('Escape');
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');
  await page.close();
});

test('recipe carousel advances with the next button and keyboard', async () => {
  const { page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.locator('#recipes').scrollIntoViewIfNeeded();
  const pos = () => page.$eval('.carousel-track', (t) => t.getBoundingClientRect().left);
  const start = await pos();
  await page.locator('.carousel-next').click();
  await page.waitForTimeout(900);
  const afterNext = await pos();
  assert.ok(afterNext < start - 50, `track did not move (${start} → ${afterNext})`);
  await page.locator('.carousel-viewport').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(900);
  assert.ok(Math.abs((await pos()) - start) < 2, 'ArrowLeft did not return to start');
  await page.close();
});

test('recipe carousel follows a pointer drag', async () => {
  const { page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.locator('#recipes').scrollIntoViewIfNeeded();
  const vp = await page.locator('.carousel-viewport').boundingBox();
  const pos = () => page.$eval('.carousel-track', (t) => t.getBoundingClientRect().left);
  const start = await pos();
  const y = vp.y + vp.height / 2;
  await page.mouse.move(vp.x + vp.width * 0.8, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(vp.x + vp.width * 0.8 - i * 30, y);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  assert.ok((await pos()) < start - 50, 'drag did not scroll the track');
  await page.close();
});

test('no serious or critical accessibility violations (light and dark)', async () => {
  for (const colorScheme of ['light', 'dark']) {
    const { page } = await open({ viewport: { width: 1280, height: 900 }, colorScheme, reducedMotion: 'reduce' });
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    assert.deepEqual(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), [], colorScheme);
    await page.close();
  }
});

/* ---- Pointer-lifecycle regressions (from code review) ---- */

async function carouselPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.once('close', () => ctx.close().catch(() => {}));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#recipes').scrollIntoViewIfNeeded();
  const pos = () => page.$eval('.carousel-track', (t) => t.getBoundingClientRect().left);
  const step = await page.$$eval('.recipe-card', (c) => c[1].getBoundingClientRect().left - c[0].getBoundingClientRect().left);
  const vp = await page.locator('.carousel-viewport').boundingBox();
  return { page, pos, step, vp, start: await pos() };
}

test('drag, hold still, release: no fling (velocity decays to zero)', async () => {
  const { page, pos, vp, start } = await carouselPage();
  const y = vp.y + vp.height / 2;
  await page.mouse.move(vp.x + 900, y);
  await page.mouse.down();
  for (let i = 1; i <= 7; i++) await page.mouse.move(vp.x + 900 - i * 15, y);
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  assert.ok(Math.abs((await pos()) - start) < 2, `flung after a hold: ${start} → ${await pos()}`);
  await page.close();
});

test('tapping a moving carousel settles it on a card', async () => {
  const { page, pos, step, vp, start } = await carouselPage();
  await page.locator('.carousel-next').click();
  await page.waitForTimeout(60);
  await page.mouse.click(vp.x + 600, vp.y + 40);
  await page.waitForTimeout(1200);
  const p = await pos();
  const offset = (start - p) / step;
  assert.ok(Math.abs(offset - Math.round(offset)) < 0.02, `parked between cards at ${p} (offset ${offset})`);
  await page.close();
});

test('press then release outside the carousel leaves no stale drag', async () => {
  const { page, pos, vp, start } = await carouselPage();
  const y = vp.y + vp.height / 2;
  await page.mouse.move(vp.x + 600, y);
  await page.mouse.down();
  await page.mouse.move(vp.x + 600, vp.y - 200);   // leave before any move inside
  await page.mouse.up();
  await page.mouse.move(vp.x + 900, y);
  for (let i = 1; i <= 8; i++) await page.mouse.move(vp.x + 900 - i * 30, y); // hover sweep, no button
  await page.waitForTimeout(800);
  assert.ok(Math.abs((await pos()) - start) < 2, 'hover moved the carousel');
  assert.equal(await page.locator('.carousel-viewport.is-dragging').count(), 0);
  await page.close();
});

test('keyboard focus stays on Next when the end is reached', async () => {
  const { page } = await carouselPage();
  await page.locator('.carousel-next').focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('carousel-next')), true);
  assert.equal(await page.locator('.carousel-next').getAttribute('aria-disabled'), 'true');
  await page.close();
});
