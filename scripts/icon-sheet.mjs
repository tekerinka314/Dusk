// icon-sheet.mjs — контактный лист ВСЕХ глифов приложения одной страницей.
// Эвристика (icon-suspects) ловит только грубые примитивы; «старый, но не
// примитивный» арт видно только глазами. Лист = один скриншот вместо 177.
//
//   node scripts/icon-sheet.mjs  →  audit-v2/icon-sheet.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAll, REGISTRY_PATH } from './icon-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const srcCache = {};

function fullSvg(file, line) {
  const text = srcCache[file] ??= fs.readFileSync(path.join(ROOT, file), 'utf8');
  const upto = text.split('\n').slice(0, line).join('\n');
  const start = upto.lastIndexOf('<svg');
  if (start < 0) return '';
  const end = text.indexOf('</svg>', start);
  return end < 0 ? '' : text.slice(start, end + 6);
}

function anchorFor(file, line) {
  const text = srcCache[file] ??= fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = text.split('\n').slice(Math.max(0, line - 12), line);
  const pats = [/title="([^"]{2,40})"/, /aria-label="([^"]{2,40})"/, /data-act="([\w]+)"/,
                /id="([\w-]+)"/, /^\s*(\w+):\s*`?<svg/];
  for (let i = lines.length - 1; i >= 0; i--)
    for (const p of pats) { const m = lines[i].match(p); if (m) return m[1]; }
  return '?';
}

// Литералы шаблонных строк внутри арта (${...}) ломают статический рендер —
// глушим их, глиф от этого меняется только в цвете/классе.
const clean = (s) => s.replace(/\$\{[^}]*\}/g, '');

const seen = new Set(); const cells = [];
for (const g of extractAll()) {
  if (seen.has(g.hash)) continue; seen.add(g.hash);
  let svg = fullSvg(g.file, g.line);
  if (!svg || svg.length > 6000) continue;
  svg = clean(svg)
    .replace(/<svg /, '<svg width="34" height="34" ')
    .replace(/ (width|height)="\d+"(?=[^>]*>)/g, (m, p, off) => off < 6 ? m : '');
  const role = (registry[g.hash] || {}).role || '—';
  cells.push(`<figure><div class="g">${svg}</div>
    <figcaption>${g.file.replace('dusk/', '').replace('.ts', '').replace('index.html', 'html')}:${g.line}<br>
    <b>${anchorFor(g.file, g.line)}</b><br><i>${role}</i></figcaption></figure>`);
}

// Склад <symbol> из index.html — иначе все <use>-обёртки нарисуют пустоту.
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dStart = idx.indexOf('<svg width="0"');
const defs = dStart < 0 ? '' : idx.slice(dStart, idx.indexOf('</svg>', idx.lastIndexOf('</symbol>')) + 6);

const html = `<meta charset="utf-8"><title>DUSK · контактный лист глифов (${cells.length})</title>
<style>
 body{background:#0d0616;color:#d9c9f0;font:11px/1.25 system-ui,sans-serif;margin:0;padding:12px}
 h1{font-size:14px;margin:0 0 10px;color:#b98cff}
 .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:6px}
 figure{margin:0;background:#170a26;border:1px solid #2c1745;border-radius:4px;padding:5px 3px;text-align:center}
 .g{height:38px;display:flex;align-items:center;justify-content:center;color:#cbb0f5}
 svg{max-width:34px;max-height:34px}
 figcaption{font-size:8.5px;line-height:1.2;color:#8f7bb0;word-break:break-all}
 figcaption b{color:#e5d6ff;font-weight:600} figcaption i{color:#6d5a8c}
</style>
${defs}
<h1>DUSK · все инлайн-глифы: ${cells.length}</h1>
<div class="grid">${cells.join('\n')}</div>`;

const out = path.join(ROOT, 'audit-v2', 'icon-sheet.html');
fs.writeFileSync(out, html);
console.log('лист:', out, '· глифов:', cells.length);
