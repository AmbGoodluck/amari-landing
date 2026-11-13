// @ts-check
/**
 * Amari website Worker. Runs only for /api/* (see run_worker_first in
 * wrangler.jsonc); every other request is served straight from static assets.
 *
 * POST /api/event  — first-party, cookieless conversion events.
 *   Body: {"e":"hero_cta","l":"optional-label","p":"/path"}  (≤ 512 bytes)
 *   Stores: event name, label, path, and Cloudflare's country code.
 *   Never stores: IP address, user agent, cookies, identifiers, form content.
 *
 * Storage: if an Analytics Engine dataset is bound as EVENTS, events are
 * written there (queryable with SQL). Otherwise they are logged as one
 * structured line to Workers Logs. See ENVIRONMENT_VARIABLES.md.
 */

export const EVENTS = new Set([
  'hero_cta', 'hero_secondary', 'nav_cta', 'nav_signin', 'nav_link',
  'get_started_cta', 'footer_cta', 'footer_link', 'footer_social',
  'contact_email', 'faq_open', 'faq_webapp', 'section_view', 'app_store', 'google_play',
]);

const MAX_BODY = 512;
const LABEL_RE = /^[a-z0-9_-]{0,40}$/;
const PATH_RE = /^\/[a-z0-9/_-]{0,64}$/;

const json = (status, body, extra = {}) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });

/**
 * Validate and normalise an event payload. Returns null if anything is off.
 * @param {unknown} data
 */
export function parseEvent(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const { e, l = '', p = '/' } = /** @type {Record<string, unknown>} */ (data);
  if (typeof e !== 'string' || !EVENTS.has(e)) return null;
  if (typeof l !== 'string' || !LABEL_RE.test(l)) return null;
  if (typeof p !== 'string' || !PATH_RE.test(p)) return null;
  const extra = Object.keys(/** @type {object} */ (data)).filter((k) => !['e', 'l', 'p'].includes(k));
  if (extra.length) return null;
  return { e, l, p };
}

/** Same-origin only: the Origin header must match the request's own host. */
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

async function handleEvent(request, env) {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (!sameOrigin(request)) return json(403, { error: 'forbidden' });

  const type = request.headers.get('content-type') || '';
  if (!/^(text\/plain|application\/json)\b/.test(type)) return json(415, { error: 'unsupported_media_type' });

  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > MAX_BODY) return json(413, { error: 'too_large' });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { error: 'too_large' });

  let data;
  try { data = JSON.parse(text); } catch { return json(400, { error: 'bad_request' }); }
  const event = parseEvent(data);
  if (!event) return json(400, { error: 'bad_request' });

  const country = (request.cf && typeof request.cf.country === 'string') ? request.cf.country : 'XX';
  try {
    if (env.EVENTS && typeof env.EVENTS.writeDataPoint === 'function') {
      env.EVENTS.writeDataPoint({ blobs: [event.e, event.l, event.p, country], doubles: [1], indexes: [event.e] });
    } else {
      console.log(JSON.stringify({ type: 'site_event', event: event.e, label: event.l, path: event.p, country }));
    }
  } catch {
    // Analytics must never break the site; swallow and still acknowledge.
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}

export default {
  /**
   * @param {Request & { cf?: { country?: string } }} request
   * @param {{ ASSETS: { fetch: typeof fetch }, EVENTS?: { writeDataPoint: Function } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/event') return await handleEvent(request, env);
      if (url.pathname.startsWith('/api/')) return json(404, { error: 'not_found' });
      return env.ASSETS.fetch(request);
    } catch {
      return json(500, { error: 'internal_error' }); // never leak internals
    }
  },
};
