// Unit tests for the /api/event Worker: validation, origin checks, limits,
// and graceful failure. No network, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { parseEvent } from '../worker/index.js';

const ORIGIN = 'https://askamari.us';
const req = (body, { method = 'POST', origin = ORIGIN, type = 'text/plain', path = '/api/event' } = {}) =>
  new Request(`${ORIGIN}${path}`, {
    method,
    headers: { ...(origin ? { origin } : {}), ...(type ? { 'content-type': type } : {}) },
    body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

function env() {
  const points = [];
  return { points, EVENTS: { writeDataPoint: (d) => points.push(d) }, ASSETS: { fetch: () => new Response('asset') } };
}

test('accepts a valid event and stores only name, label, path and country', async () => {
  const e = env();
  const res = await worker.fetch(req({ e: 'hero_cta', l: 'use-amari', p: '/' }), e);
  assert.equal(res.status, 204);
  assert.equal(e.points.length, 1);
  assert.deepEqual(e.points[0].blobs, ['hero_cta', 'use-amari', '/', 'XX']);
});

test('rejects wrong method, cross-origin and missing origin', async () => {
  assert.equal((await worker.fetch(req(null, { method: 'GET' }), env())).status, 405);
  assert.equal((await worker.fetch(req({ e: 'hero_cta' }, { origin: 'https://evil.example' }), env())).status, 403);
  assert.equal((await worker.fetch(req({ e: 'hero_cta' }, { origin: null }), env())).status, 403);
});

test('rejects unsupported media types and oversized bodies', async () => {
  assert.equal((await worker.fetch(req({ e: 'hero_cta' }, { type: 'application/x-www-form-urlencoded' }), env())).status, 415);
  assert.equal((await worker.fetch(req('x'.repeat(600)), env())).status, 413);
});

test('rejects malformed JSON and anything outside the schema', async () => {
  const e = env();
  for (const body of ['{not json', { e: 'unknown_event' }, { e: 'hero_cta', p: '/<script>' }, { e: 'hero_cta', l: 'Has Spaces' },
    { e: 'hero_cta', email: 'a@b.co' }, [], 'null', { e: 'hero_cta', l: 'x'.repeat(41) }]) {
    assert.equal((await worker.fetch(req(body), e)).status, 400, JSON.stringify(body));
  }
  assert.equal(e.points.length, 0);
});

test('unknown /api routes are 404 and other paths go to static assets', async () => {
  assert.equal((await worker.fetch(req(null, { method: 'GET', path: '/api/nope' }), env())).status, 404);
  const res = await worker.fetch(new Request(`${ORIGIN}/`), env());
  assert.equal(await res.text(), 'asset');
});

test('analytics failures never break the response, and nothing internal leaks', async () => {
  const broken = { EVENTS: { writeDataPoint: () => { throw new Error('boom'); } }, ASSETS: { fetch: () => { throw new Error('secret detail'); } } };
  assert.equal((await worker.fetch(req({ e: 'faq_open' }), broken)).status, 204);
  const res = await worker.fetch(new Request(`${ORIGIN}/x`), broken);
  assert.equal(res.status, 500);
  assert.doesNotMatch(await res.text(), /secret detail/);
});

test('without an Analytics Engine binding, events are logged as one structured line', async () => {
  const lines = [];
  const orig = console.log;
  console.log = (l) => lines.push(l);
  try {
    const res = await worker.fetch(req({ e: 'nav_cta', l: 'try-it-free', p: '/terms' }), { ASSETS: { fetch: () => new Response() } });
    assert.equal(res.status, 204);
  } finally { console.log = orig; }
  assert.deepEqual(JSON.parse(lines[0]), { type: 'site_event', event: 'nav_cta', label: 'try-it-free', path: '/terms', country: 'XX' });
});

test('parseEvent defaults label and path', () => {
  assert.deepEqual(parseEvent({ e: 'faq_open' }), { e: 'faq_open', l: '', p: '/' });
  assert.equal(parseEvent(null), null);
});
