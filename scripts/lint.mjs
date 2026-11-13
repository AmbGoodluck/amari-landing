#!/usr/bin/env node
// Zero-dependency checks that guard the design system and page hygiene.
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const fail = [];
const read = (p) => readFileSync(p, 'utf8');

// 1. Every JS file parses.
for (const f of ['src/app.js', 'worker/index.js', 'scripts/build.mjs', 'scripts/lint.mjs']) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { fail.push(`${f}: syntax error\n${e.stderr}`); }
}

// 2. Design system: no raw colors outside the token blocks in src/styles.css.
const css = read('src/styles.css').split('\n');
let inTokens = false;
css.forEach((line, i) => {
  if (/^(:root \{|  :root:not|:root\[data-theme)/.test(line)) inTokens = true;
  if (!inTokens && /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(line)) fail.push(`src/styles.css:${i + 1}: raw color outside tokens → use a var(--token)`);
  if (inTokens && /^\}/.test(line)) inTokens = false;
});

// 3. Generated HTML hygiene.
for (const f of readdirSync('public').filter((f) => f.endsWith('.html'))) {
  const html = read(join('public', f));
  if (/\{\{/.test(html)) fail.push(`public/${f}: unresolved {{token}}`);
  if (/\sstyle="/.test(html)) fail.push(`public/${f}: inline style attribute (blocked by CSP)`);
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(html)) fail.push(`public/${f}: inline script (blocked by CSP)`);
  if (/href="javascript:/i.test(html)) fail.push(`public/${f}: javascript: URL`);
  if (/target="_blank"(?![^>]*rel="[^"]*noopener)/.test(html)) fail.push(`public/${f}: target=_blank without rel=noopener`);
  for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
    if (!/\balt="/.test(img) || !/\bwidth="/.test(img) || !/\bheight="/.test(img)) fail.push(`public/${f}: <img> missing alt/width/height: ${img.slice(0, 80)}`);
  }
  if ((html.match(/<h1\b/g) ?? []).length !== 1) fail.push(`public/${f}: expected exactly one <h1>`);
}

// 4. JSON files parse.
for (const f of ['site.config.json', 'public/site.webmanifest', 'package.json']) {
  try { JSON.parse(read(f)); } catch { fail.push(`${f}: invalid JSON`); }
}

if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
console.log('lint: ok');
