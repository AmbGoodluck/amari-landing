#!/usr/bin/env node
/**
 * Builds public/terms.html and public/privacy.html from content/legal/*.md.
 *
 * Zero dependencies: a small Markdown converter covering exactly what the
 * legal documents use (headings, paragraphs, bold, links, bullet/numbered
 * lists, tables, rules). Output is static HTML, so the pages need no
 * client-side rendering and work under the site's strict CSP.
 *
 *   node scripts/build-legal.mjs          write the pages
 *   node scripts/build-legal.mjs --check  exit 1 if the pages are stale
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  {
    source: 'content/legal/terms.md',
    output: 'public/terms.html',
    route: '/terms',
    title: 'Terms of Use — Amari',
    description: 'The terms that apply when you use Amari, the AI kitchen assistant: accounts, free use and fair-use limits, food and allergy safety, AI features and your rights.',
  },
  {
    source: 'content/legal/privacy.md',
    output: 'public/privacy.html',
    route: '/privacy',
    title: 'Privacy Policy — Amari',
    description: 'How Amari handles your information: what stays on your device, why photos are never stored, which AI services are used, and the choices and rights you have.',
    // Internal working notes in the source document, not for publication.
    stripFrom: /^## Appendix A\b/m,
    stripInline: [/\s*\[Confirm against each provider's current API terms before publishing\.\]/g],
  },
];

// Links in the documents that should resolve on this site rather than elsewhere.
const LINK_REWRITES = { 'https://app.askamari.us/privacy': '/privacy', 'https://app.askamari.us/terms': '/terms' };

/* ------------------------------------------------------------------ */
/* Inline Markdown                                                     */
/* ------------------------------------------------------------------ */
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const safeHref = (url) => {
  const u = LINK_REWRITES[url] ?? url;
  return /^(https:\/\/|mailto:|\/|#)/.test(u) ? u : null; // reject javascript:, data:, etc.
};

function inline(text) {
  const tokens = [];
  const stash = (html) => `\u0000${tokens.push(html) - 1}\u0000`;
  let s = escapeHtml(text);
  // [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = safeHref(url.replace(/&amp;/g, '&'));
    if (!href) return label;
    const ext = href.startsWith('https://');
    return stash(`<a href="${escapeHtml(href)}"${ext ? ' rel="noopener"' : ''}>${label}</a>`);
  });
  // email addresses → mailto
  s = s.replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, (m) => stash(`<a href="mailto:${m}">${m}</a>`));
  // unfilled placeholders like [Legal name of the operator]
  s = s.replace(/\[([^\]\u0000]+)\]/g, (_, t) => stash(`<mark class="placeholder" title="To be completed before launch">[${t}]</mark>`));
  // **bold**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[+i]);
}

const slugify = (t) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ------------------------------------------------------------------ */
/* Block Markdown                                                      */
/* ------------------------------------------------------------------ */
function convert(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const toc = [];
  let title = '';
  let intro = null; // blocks before the first rule form the page header
  let i = 0;

  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { flush(); i++; continue; }

    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flush();
      const level = m[1].length;
      const html = inline(m[2]);
      if (level === 1) { title = m[2].trim(); i++; continue; }
      const id = slugify(m[2]);
      if (level === 2) toc.push({ id, html });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++; continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      flush();
      if (intro === null) { intro = out.splice(0); } else { out.push('<hr>'); }
      i++; continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flush();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++; }
      const label = toc.length ? toc[toc.length - 1].html.replace(/<[^>]+>/g, '') : 'Details';
      out.push(
        `<div class="table-wrap" role="region" tabindex="0" aria-label="Table: ${escapeHtml(label)}"><table>` +
        `<thead><tr>${head.map((h) => `<th scope="col">${inline(h)}</th>`).join('')}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>` +
        '</table></div>'
      );
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flush();
  return { title, intro: intro ?? [], body: out, toc };
}

/* ------------------------------------------------------------------ */
/* Page template (shares the site's header, footer, styles and JS)     */
/* ------------------------------------------------------------------ */
const SPRITE = `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <symbol id="logo" viewBox="0 0 1024 1024"><circle cx="407.5" cy="487.5" r="123.5" fill="#E4572E"/><path fill="#2E9B5A" d="M535 542C522 400 590 272 752 232C778 350 735 490 535 542Z"/><path fill="#155E3B" d="M160 540H864A352 352 0 0 1 160 540Z"/></symbol>
      <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 8h16M4 16h16"/></symbol>
      <symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
      <symbol id="i-apple" viewBox="0 0 24 24"><path stroke="none" fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5.9-1.4 1.3-2.8 1.4-2.8-.1 0-2.7-1-2.4-4.2ZM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5Z"/></symbol>
      <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
    </defs>
  </svg>`;

function render(page, doc) {
  const current = (r) => (r === page.route ? ' aria-current="page"' : '');
  return `<!doctype html>
<!-- Generated by scripts/build-legal.mjs from ${page.source}. Edit the Markdown, then run \`npm run build:legal\`. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#FCFAF8" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0B0B0C" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:image" content="/assets/og.jpg">
  <link rel="stylesheet" href="/styles.css">
  <script src="/app.js" defer></script>
</head>
<body class="legal-page">
  ${SPRITE}

  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header" data-header>
    <div class="container nav">
      <a class="brand" href="/" aria-label="Amari home">
        <span class="brand-mark" aria-hidden="true"><svg><use href="#logo"/></svg></span>
        <span class="brand-name">Amari</span>
      </a>

      <nav id="nav-menu" class="nav-menu" aria-label="Primary">
        <ul class="nav-links">
          <li><a href="/#features">Features</a></li>
          <li><a href="/#how-it-works">How It Works</a></li>
          <li><a href="/#recipes">Recipes</a></li>
          <li><a href="/#download">Download</a></li>
        </ul>
        <div class="nav-actions">
          <a class="btn btn-primary btn-sm" href="/#download"><svg class="ico" aria-hidden="true"><use href="#i-apple"/></svg>Get the App</a>
          <a class="btn btn-secondary btn-sm" href="/#download">Sign In</a>
        </div>
      </nav>

      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
        <svg class="ico" aria-hidden="true"><use href="#i-menu"/></svg>
      </button>
    </div>
  </header>

  <main id="main" tabindex="-1" class="legal">
    <div class="container legal-grid">
      <header class="legal-head">
        <p class="kicker">Legal</p>
        <h1 class="h2">${escapeHtml(doc.title)}</h1>
        <div class="legal-meta">${doc.intro.join('\n')}</div>
      </header>

      <aside class="legal-toc" aria-label="On this page">
        <details data-legal-toc>
          <summary>On this page<svg class="ico" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary>
          <ol>${doc.toc.map((t) => `<li><a href="#${t.id}">${t.html}</a></li>`).join('')}</ol>
        </details>
      </aside>

      <article class="legal-doc">
${doc.body.map((b) => '        ' + b).join('\n')}
        <p class="legal-back"><a class="round-btn round-btn--sm" href="#main" aria-label="Back to top"><svg class="ico" aria-hidden="true"><use href="#i-arrow-up"/></svg></a></p>
      </article>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <a class="brand" href="/" aria-label="Amari home">
        <span class="brand-mark brand-mark--sm" aria-hidden="true"><svg><use href="#logo"/></svg></span>
        <span class="brand-name">Amari</span>
      </a>
      <nav aria-label="Footer">
        <ul class="footer-links">
          <li><a href="/#features">Features</a></li>
          <li><a href="/#how-it-works">How It Works</a></li>
          <li><a href="/#recipes">Recipes</a></li>
          <li><a href="/#download">Download</a></li>
          <li><a href="/terms"${current('/terms')}>Terms</a></li>
          <li><a href="/privacy"${current('/privacy')}>Privacy</a></li>
        </ul>
      </nav>
      <p class="footer-note">© <span data-year>2026</span> Amari. Always check labels if you have a food allergy.</p>
    </div>
  </footer>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
const check = process.argv.includes('--check');
let stale = [];
for (const page of PAGES) {
  let md = readFileSync(join(ROOT, page.source), 'utf8');
  if (page.stripFrom) { const m = md.match(page.stripFrom); if (m) md = md.slice(0, m.index).replace(/\n-{3,}\s*$/, '\n'); }
  for (const re of page.stripInline ?? []) md = md.replace(re, '');
  const html = render(page, convert(md));
  const target = join(ROOT, page.output);
  if (check) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== html) stale.push(page.output);
  } else {
    writeFileSync(target, html);
    console.log(`wrote ${page.output}`);
  }
}
if (check && stale.length) { console.error(`stale: ${stale.join(', ')} — run npm run build:legal`); process.exit(1); }
