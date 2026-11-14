#!/usr/bin/env node
// @ts-check
/**
 * Amari site build: zero dependencies, deterministic output.
 *
 * Reads   site.config.json, src/ (styles, script, page templates) and
 *         content/ (Markdown for legal and info pages)
 * Writes  public/ (served as-is by Cloudflare Workers static assets):
 *           index.html, terms.html, privacy.html, contact.html, 404.html,
 *           static/styles.<hash>.css, static/app.<hash>.js (immutable),
 *           sitemap.xml, robots.txt, site.webmanifest, _headers
 *
 *   node scripts/build.mjs          build
 *   node scripts/build.mjs --check  exit 1 if public/ is out of date
 *
 * Output is committed, so the Cloudflare build needs no build command.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * @typedef {{ label: string, href: string }} NavLink
 * @typedef {{
 *   brand: { name: string, appName: string, descriptor: string, tagline: string, pitch: string, logo: string },
 *   site: { url: string, language: string, locale: string },
 *   links: { webApp: string, signIn: string, appStore: string, googlePlay: string },
 *   contact: { email: string },
 *   social: { label: string, href: string }[],
 *   nav: NavLink[],
 *   cta: { primary: string, nav: string, secondary: string, signIn: string, iosStatus: string },
 *   footer: { blurb: string, copyrightHolder: string, note: string },
 *   seo: { title: string, description: string, ogImage: string, ogImageAlt: string, themeColorLight: string, themeColorDark: string },
 *   analytics: { cloudflareWebAnalytics: boolean, cloudflareBeaconToken: string, events: boolean }
 * }} SiteConfig
 */

/** @type {SiteConfig} */
const config = JSON.parse(read('site.config.json'));
validateConfig(config);

const SITE = config.site.url.replace(/\/$/, '');
const abs = (path) => (/^https?:\/\//.test(path) ? path : SITE + path);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

/** Only allow link protocols we expect; anything else is dropped. */
const safeHref = (url) => (/^(https:\/\/|mailto:|\/|#)/.test(url) ? url : null);

/** Resolve "a.b.c" against the config. */
const lookup = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), /** @type {any} */ (config));

/** Replace {{path}} tokens with escaped config values. Unknown tokens fail the build. */
function interpolate(html, file) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const v = lookup(path);
    if (v === undefined || typeof v === 'object') throw new Error(`${file}: unknown token {{${path}}}`);
    return escapeHtml(v);
  });
}

function validateConfig(c) {
  const req = ['brand.name', 'site.url', 'links.webApp', 'contact.email', 'seo.title', 'seo.description'];
  for (const p of req) {
    const v = p.split('.').reduce((o, k) => o?.[k], c);
    if (!v) throw new Error(`site.config.json: "${p}" is required`);
  }
  for (const [k, v] of Object.entries(c.links)) if (v && !/^https:\/\//.test(v)) throw new Error(`links.${k} must be https://`);
  if (!/^https:\/\//.test(c.site.url)) throw new Error('site.url must be https://');
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c.contact.email)) throw new Error('contact.email is not a valid address');
  if (c.analytics.cloudflareBeaconToken && !/^[a-f0-9]{32}$/i.test(c.analytics.cloudflareBeaconToken)) throw new Error('analytics.cloudflareBeaconToken looks malformed');
}

/* ------------------------------------------------------------------ */
/* Static assets: fingerprinted CSS and JS                             */
/* ------------------------------------------------------------------ */
const css = read('src/styles.css');
const js = read('src/app.js');
const ASSETS = {
  css: `/static/styles.${hash(css)}.css`,
  js: `/static/app.${hash(js)}.js`,
};

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */
const ICONS = {
  logo: '<symbol id="logo" viewBox="0 0 1024 1024"><circle cx="407.5" cy="487.5" r="123.5" fill="#E4572E"/><path fill="#2E9B5A" d="M535 542C522 400 590 272 752 232C778 350 735 490 535 542Z"/><path fill="#155E3B" d="M160 540H864A352 352 0 0 1 160 540Z"/></symbol>',
  'i-sparkle': '<symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 3.5 13.7 9a2 2 0 0 0 1.3 1.3l5.5 1.7-5.5 1.7a2 2 0 0 0-1.3 1.3L12 20.5 10.3 15A2 2 0 0 0 9 13.7L3.5 12 9 10.3A2 2 0 0 0 10.3 9L12 3.5Z"/><path d="M19 3v3M17.5 4.5h3M5 17v3M3.5 18.5h3"/></symbol>',
  'i-bolt': '<symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8Z"/></symbol>',
  'i-leaf': '<symbol id="i-leaf" viewBox="0 0 24 24"><path d="M4.5 19.5C4 11 9.5 5 20 4.5c.5 10.5-5.5 16-14 15.5"/><path d="M4.5 19.5 14 10"/></symbol>',
  'i-camera': '<symbol id="i-camera" viewBox="0 0 24 24"><path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2.2h5.4l1.6 2.2h2.2a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.5Z"/><circle cx="12" cy="12.8" r="3.6"/></symbol>',
  'i-camera-off': '<symbol id="i-camera-off" viewBox="0 0 24 24"><path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2.2h5.4l1.6 2.2h2.2a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.5Z"/><path d="m4 4 16 16"/></symbol>',
  'i-sparkles': '<symbol id="i-sparkles" viewBox="0 0 24 24"><path d="M10 4 11.6 9a2 2 0 0 0 1.4 1.4L18 12l-5 1.6a2 2 0 0 0-1.4 1.4L10 20l-1.6-5A2 2 0 0 0 7 13.6L2 12l5-1.6A2 2 0 0 0 8.4 9L10 4Z"/><path d="M18.5 2.5 19.2 4.8 21.5 5.5 19.2 6.2 18.5 8.5 17.8 6.2 15.5 5.5 17.8 4.8Z"/></symbol>',
  'i-pot': '<symbol id="i-pot" viewBox="0 0 24 24"><path d="M4 10h16v6.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5V10Z"/><path d="M2 10h20M9 6.5h6M12 6.5V4.5"/></symbol>',
  'i-chevron-right': '<symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="m9 5.5 6.5 6.5L9 18.5"/></symbol>',
  'i-chevron-left': '<symbol id="i-chevron-left" viewBox="0 0 24 24"><path d="M15 5.5 8.5 12l6.5 6.5"/></symbol>',
  'i-chevron-down': '<symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>',
  'i-arrow-right': '<symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>',
  'i-arrow-up': '<symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>',
  'i-search': '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/></symbol>',
  'i-heart': '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.5 2.7C19.5 15.6 12 20 12 20Z"/></symbol>',
  'i-clock': '<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>',
  'i-menu': '<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 8h16M4 16h16"/></symbol>',
  'i-check': '<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>',
  'i-plus': '<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>',
  'i-shield': '<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6l-7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/></symbol>',
  'i-box': '<symbol id="i-box" viewBox="0 0 24 24"><path d="M4 7.5 12 3.5l8 4v9L12 20.5l-8-4v-9Z"/><path d="m4 7.5 8 4 8-4M12 11.5v9"/></symbol>',
  'i-steps': '<symbol id="i-steps" viewBox="0 0 24 24"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.75" cy="6.5" r="1.25"/><circle cx="4.75" cy="12" r="1.25"/><circle cx="4.75" cy="17.5" r="1.25"/></symbol>',
  'i-recycle': '<symbol id="i-recycle" viewBox="0 0 24 24"><path d="M7 19H4.8a1.8 1.8 0 0 1-1.5-2.7L5 13.4M17 19h2.2a1.8 1.8 0 0 0 1.5-2.7l-1.6-2.8M9.3 5.6l1.1-1.9a1.8 1.8 0 0 1 3.2 0l1.6 2.8"/><path d="m7 16-2-2.6-3 .5M17 16l2-2.6 3 .5M15.2 6.5l-.4 3.2-3-.9M7 19h10"/></symbol>',
  'i-calendar': '<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></symbol>',
  'i-wallet': '<symbol id="i-wallet" viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11.5" rx="2.5"/><path d="M16 14h1.5"/></symbol>',
  'i-globe': '<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5Z"/></symbol>',
  'i-phone': '<symbol id="i-phone" viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></symbol>',
  'i-eye-off': '<symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M3 12s3.3-6 9-6c1.6 0 3 .4 4.2 1.1M21 12s-3.3 6-9 6c-1.6 0-3-.4-4.2-1.1"/><path d="m4 4 16 16"/></symbol>',
  'i-trash': '<symbol id="i-trash" viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></symbol>',
  'i-info': '<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/></symbol>',
  'i-mail': '<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></symbol>',
};

/** Only ship the icons a page actually references. */
function sprite(body) {
  const used = Object.keys(ICONS).filter((id) => body.includes(`#${id}"`));
  return `  <svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>\n    ${used.map((id) => ICONS[id]).join('\n    ')}\n  </defs></svg>`;
}

/**
 * @param {{ title: string, description: string, path: string, type?: string, noindex?: boolean, jsonLd?: object }} p
 */
function head(p) {
  const url = abs(p.path);
  const beacon = config.analytics.cloudflareBeaconToken
    ? `\n  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${config.analytics.cloudflareBeaconToken}"}'></script>`
    : '';
  const ld = p.jsonLd ? `\n  <script type="application/ld+json">${JSON.stringify(p.jsonLd).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="${escapeHtml(config.site.language)}"${config.analytics.events ? ' data-events="on"' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(p.title)}</title>
  <meta name="description" content="${escapeHtml(p.description)}">
  ${p.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${escapeHtml(url)}">`}
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="${escapeHtml(config.seo.themeColorLight)}" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="${escapeHtml(config.seo.themeColorDark)}" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <meta property="og:type" content="${p.type ?? 'website'}">
  <meta property="og:site_name" content="${escapeHtml(config.brand.name)}">
  <meta property="og:locale" content="${escapeHtml(config.site.locale)}">
  <meta property="og:title" content="${escapeHtml(p.title)}">
  <meta property="og:description" content="${escapeHtml(p.description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(abs(config.seo.ogImage))}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(config.seo.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(p.title)}">
  <meta name="twitter:description" content="${escapeHtml(p.description)}">
  <meta name="twitter:image" content="${escapeHtml(abs(config.seo.ogImage))}">

  <link rel="stylesheet" href="${ASSETS.css}">
  <script src="${ASSETS.js}" defer></script>${beacon}${ld}
</head>`;
}

/** @param {{ home: boolean, current?: string }} o */
function header({ home, current }) {
  const href = (h) => (home || !h.startsWith('#') ? h : `/${h}`);
  const cur = (h) => (h === current ? ' aria-current="page"' : '');
  const nav = config.nav.map((l) => `          <li><a href="${escapeHtml(href(l.href))}"${cur(l.href)} data-track="nav_link">${escapeHtml(l.label)}</a></li>`).join('\n');
  const signIn = config.links.signIn
    ? `\n          <a class="btn btn-secondary btn-sm" href="${escapeHtml(config.links.signIn)}" data-track="nav_signin">${escapeHtml(config.cta.signIn)}</a>`
    : '';
  return `  <header class="site-header" data-header>
    <div class="container nav">
      <a class="brand" href="${home ? '#top' : '/'}" aria-label="${escapeHtml(config.brand.name)} home">
        <span class="brand-mark" aria-hidden="true"><svg><use href="#logo"/></svg></span>
        <span class="brand-name">${escapeHtml(config.brand.name)}</span>
      </a>

      <nav id="nav-menu" class="nav-menu" aria-label="Primary">
        <ul class="nav-links">
${nav}
        </ul>
        <div class="nav-actions">
          <a class="btn btn-primary btn-sm" href="${escapeHtml(config.links.webApp)}" data-track="nav_cta">${escapeHtml(config.cta.nav)}</a>${signIn}
        </div>
      </nav>

      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
        <svg class="ico" aria-hidden="true"><use href="#i-menu"/></svg>
      </button>
    </div>
  </header>`;
}

/** @param {{ home: boolean, current?: string }} o */
function footer({ home, current }) {
  const href = (h) => (home || !h.startsWith('#') ? h : `/${h}`);
  const cur = (path) => (current === path ? ' aria-current="page"' : '');
  // Section links only: page links (e.g. /privacy) already have their own footer column.
  const product = [...config.nav.filter((l) => l.href.startsWith('#')), { label: 'Ask Amari', href: '#ask-amari' }]
    .map((l) => `<li><a href="${escapeHtml(href(l.href))}" data-track="footer_link">${escapeHtml(l.label)}</a></li>`).join('');
  const social = config.social.filter((s) => safeHref(s.href))
    .map((s) => `<li><a href="${escapeHtml(s.href)}" rel="noopener me" data-track="footer_social">${escapeHtml(s.label)}</a></li>`).join('');
  return `  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="brand" href="${home ? '#top' : '/'}" aria-label="${escapeHtml(config.brand.name)} home">
          <span class="brand-mark brand-mark--sm" aria-hidden="true"><svg><use href="#logo"/></svg></span>
          <span class="brand-name">${escapeHtml(config.brand.name)}</span>
        </a>
        <p>${escapeHtml(config.footer.blurb)}</p>
        <a class="btn btn-primary btn-sm" href="${escapeHtml(config.links.webApp)}" data-track="footer_cta">${escapeHtml(config.cta.nav)}</a>
      </div>
      <nav class="footer-col" aria-label="Product"><h2>Product</h2><ul>${product}</ul></nav>
      <nav class="footer-col" aria-label="Legal"><h2>Legal</h2><ul>
        <li><a href="/privacy"${cur('/privacy')} data-track="footer_link">Privacy Policy</a></li>
        <li><a href="/terms"${cur('/terms')} data-track="footer_link">Terms of Use</a></li>
      </ul></nav>
      <div class="footer-col"><h2>Contact</h2><ul>
        <li><a href="/contact"${cur('/contact')} data-track="footer_link">Contact us</a></li>
        <li><a href="mailto:${escapeHtml(config.contact.email)}" data-track="contact_email">${escapeHtml(config.contact.email)}</a></li>${social}
      </ul></div>
      <p class="footer-legal">© <span data-year>${new Date('2026-01-01').getFullYear()}</span> ${escapeHtml(config.footer.copyrightHolder)}. ${escapeHtml(config.footer.note)}</p>
    </div>
  </footer>`;
}

/** Assemble a page from a body template with <!--@head-->, <!--@sprite-->, <!--@header-->, <!--@footer-->. */
function page(body, meta, chrome) {
  let html = body
    .replace('<!--@head-->', head(meta))
    .replace('<!--@header-->', header(chrome))
    .replace('<!--@footer-->', footer(chrome));
  html = html.replace('<!--@sprite-->', sprite(html));
  return html;
}

/* ------------------------------------------------------------------ */
/* Markdown (subset used by content/)                                  */
/* ------------------------------------------------------------------ */
const LINK_REWRITES = { 'https://app.askamari.us/privacy': '/privacy', 'https://app.askamari.us/terms': '/terms' };

function inline(text) {
  const tokens = [];
  const stash = (h) => `\u0000${tokens.push(h) - 1}\u0000`;
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = safeHref(LINK_REWRITES[url.replace(/&amp;/g, '&')] ?? url.replace(/&amp;/g, '&'));
    if (!href) return label;
    return stash(`<a href="${escapeHtml(href)}"${href.startsWith('https://') ? ' rel="noopener"' : ''}>${label}</a>`);
  });
  s = s.replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, (m) => stash(`<a href="mailto:${m}">${m}</a>`));
  s = s.replace(/\[([^\]\u0000]+)\]/g, (_, t) => stash(`<mark class="placeholder" title="To be completed before launch">[${t}]</mark>`));
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[+i]);
}

const slugify = (t) => t.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function markdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const toc = [];
  let title = '';
  let intro = null;
  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { flush(); i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flush();
      const level = m[1].length;
      if (level === 1) { title = m[2].trim(); i++; continue; }
      const id = slugify(m[2]);
      const html = inline(m[2]);
      if (level === 2) toc.push({ id, html });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++; continue;
    }
    if (/^-{3,}\s*$/.test(line)) { flush(); if (intro === null) intro = out.splice(0); else out.push('<hr>'); i++; continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`); i++; }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flush();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const headCells = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++; }
      const label = toc.length ? toc[toc.length - 1].html.replace(/<[^>]+>/g, '') : 'Details';
      out.push(`<div class="table-wrap" role="region" tabindex="0" aria-label="Table: ${escapeHtml(label)}"><table>`
        + `<thead><tr>${headCells.map((h) => `<th scope="col">${inline(h)}</th>`).join('')}</tr></thead>`
        + `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flush();
  return { title, intro: intro ?? [], body: out, toc };
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */
const DOCS = [
  {
    source: 'content/legal/terms.md', output: 'terms.html', path: '/terms', kicker: 'Legal', toc: true,
    title: 'Terms of Use — Amari',
    description: 'The terms that apply when you use Amari, the AI kitchen assistant: accounts, free use and fair-use limits, food and allergy safety, AI features and your rights.',
  },
  {
    source: 'content/legal/privacy.md', output: 'privacy.html', path: '/privacy', kicker: 'Legal', toc: true,
    title: 'Privacy Policy — Amari',
    description: 'How Amari handles your information: what stays on your device, why photos are never stored, which AI services are used, and the choices and rights you have.',
    stripFrom: /^## Appendix A\b/m,
    stripInline: [/\s*\[Confirm against each provider's current API terms before publishing\.\]/g],
  },
  {
    source: 'content/pages/contact.md', output: 'contact.html', path: '/contact', kicker: 'Contact', toc: false,
    title: 'Contact — Amari',
    description: 'Get in touch with the Amari team: support, feedback, privacy requests and food-safety information.',
  },
];

function docPage(d) {
  let md = read(d.source);
  if (d.stripFrom) { const m = md.match(d.stripFrom); if (m) md = md.slice(0, m.index).replace(/\n-{3,}\s*$/, '\n'); }
  for (const re of d.stripInline ?? []) md = md.replace(re, '');
  const doc = markdown(md);
  const tocHtml = d.toc ? `
      <aside class="legal-toc" aria-label="On this page">
        <details data-legal-toc>
          <summary>On this page<svg class="ico" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary>
          <ol>${doc.toc.map((t) => `<li><a href="#${t.id}">${t.html}</a></li>`).join('')}</ol>
        </details>
      </aside>` : '';
  const body = `<!--@head-->
<body class="legal-page">
<!--@sprite-->
  <a class="skip-link" href="#main">Skip to content</a>
<!--@header-->

  <main id="main" tabindex="-1" class="legal">
    <div class="container legal-grid${d.toc ? '' : ' legal-grid--plain'}">
      <header class="legal-head">
        <p class="kicker">${escapeHtml(d.kicker)}</p>
        <h1 class="h2">${escapeHtml(doc.title)}</h1>
        <div class="legal-meta">${doc.intro.join('\n')}</div>
      </header>
${tocHtml}
      <article class="legal-doc">
${doc.body.map((b) => '        ' + b).join('\n')}
        <p class="legal-back"><a class="round-btn round-btn--sm" href="#main" aria-label="Back to top"><svg class="ico" aria-hidden="true"><use href="#i-arrow-up"/></svg></a></p>
      </article>
    </div>
  </main>

<!--@footer-->
</body>
</html>
`;
  return page(body, { title: d.title, description: d.description, path: d.path, type: 'article' }, { home: false, current: d.path });
}

function homePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': `${SITE}/#organization`,
        name: config.brand.name, url: `${SITE}/`,
        logo: abs('/assets/icon-512.png'),
        email: config.contact.email,
        sameAs: config.social.map((s) => s.href).filter(Boolean),
      },
      {
        '@type': 'WebSite', '@id': `${SITE}/#website`,
        name: config.brand.name, url: `${SITE}/`, inLanguage: config.site.language,
        description: config.seo.description, publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'SoftwareApplication', '@id': `${SITE}/#app`,
        name: config.brand.appName, url: config.links.webApp,
        description: 'Snap your fridge, and Amari shows every meal you can make tonight, checked against your allergies and diet. Ask Amari anything about cooking with what you have.',
        applicationCategory: 'LifestyleApplication', operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': `${SITE}/#organization` },
      },
    ],
  };
  const body = interpolate(read('src/pages/index.html'), 'src/pages/index.html');
  return page(body, { title: config.seo.title, description: config.seo.description, path: '/', jsonLd }, { home: true });
}

function notFoundPage() {
  const body = `<!--@head-->
<body>
<!--@sprite-->
  <a class="skip-link" href="#main">Skip to content</a>
<!--@header-->
  <main id="main" tabindex="-1" class="container not-found">
    <img class="not-found-logo" src="/assets/logo.svg" width="72" height="72" alt="">
    <p class="kicker">404</p>
    <h1 class="h2">This page isn’t on the menu.</h1>
    <p class="not-found-text">Let’s get you back to the kitchen.</p>
    <p><a class="btn btn-primary" href="/">Back to ${escapeHtml(config.brand.name)}</a></p>
  </main>
<!--@footer-->
</body>
</html>
`;
  return page(body, { title: `Page not found — ${config.brand.name}`, description: config.seo.description, path: '/404', noindex: true }, { home: false });
}

/* ------------------------------------------------------------------ */
/* Generated metadata files                                            */
/* ------------------------------------------------------------------ */
const INDEXABLE = ['/', '/terms', '/privacy', '/contact'];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${INDEXABLE.map((p) => `  <url><loc>${abs(p)}</loc></url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${abs('/sitemap.xml')}
`;

const manifest = JSON.stringify({
  name: `${config.brand.name} — ${config.brand.descriptor}`,
  short_name: config.brand.name,
  description: config.seo.description,
  start_url: '/',
  icons: [
    { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/assets/logo.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
  theme_color: '#155E3B',
  background_color: '#FFF4E2',
  display: 'browser',
}, null, 2) + '\n';

// Allow Cloudflare Web Analytics whether its beacon is added manually (token)
// or injected automatically by Cloudflare on the proxied domain.
const beaconOn = Boolean(config.analytics.cloudflareWebAnalytics || config.analytics.cloudflareBeaconToken);
const csp = [
  "default-src 'self'",
  `script-src 'self'${beaconOn ? ' https://static.cloudflareinsights.com' : ''}`,
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${beaconOn ? ' https://cloudflareinsights.com' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const headers = `# Generated by scripts/build.mjs. Edit the build script, not this file.
/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()

# Fingerprinted CSS/JS: the file name changes whenever the content does.
/static/*
  Cache-Control: public, max-age=31536000, immutable

# Images and icons keep stable names, so revalidate after a day.
/assets/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
`;

/* ------------------------------------------------------------------ */
/* Write / check                                                       */
/* ------------------------------------------------------------------ */
const OUTPUT = {
  'public/index.html': homePage(),
  ...Object.fromEntries(DOCS.map((d) => [`public/${d.output}`, docPage(d)])),
  'public/404.html': notFoundPage(),
  [`public${ASSETS.css}`]: css,
  [`public${ASSETS.js}`]: js,
  'public/sitemap.xml': sitemap,
  'public/robots.txt': robots,
  'public/site.webmanifest': manifest,
  'public/_headers': headers,
};

const check = process.argv.includes('--check');
const staticDir = join(ROOT, 'public/static');
const staleStatic = existsSync(staticDir)
  ? readdirSync(staticDir).filter((f) => !Object.keys(OUTPUT).includes(`public/static/${f}`))
  : [];

if (check) {
  const stale = Object.entries(OUTPUT).filter(([f, c]) => !existsSync(join(ROOT, f)) || readFileSync(join(ROOT, f), 'utf8') !== c).map(([f]) => f);
  stale.push(...staleStatic.map((f) => `public/static/${f} (orphan)`));
  if (stale.length) { console.error(`out of date:\n  ${stale.join('\n  ')}\nrun: npm run build`); process.exit(1); }
  console.log('public/ is up to date');
} else {
  mkdirSync(staticDir, { recursive: true });
  for (const f of staleStatic) unlinkSync(join(staticDir, f));
  for (const [f, c] of Object.entries(OUTPUT)) writeFileSync(join(ROOT, f), c);
  console.log(`built ${Object.keys(OUTPUT).length} files`);
}
