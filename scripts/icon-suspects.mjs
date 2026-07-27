// icon-suspects.mjs — РАДАР старого арта (не ратчет).
//
// Ратчет (icon-inventory) ловит «глиф не зарегистрирован». Он НЕ ловит
// «глиф зарегистрирован, но нарисован в дореформенном, generic-стиле» — а
// именно такие всплывают у юзера один за другим. Здесь эвристика: считаем
// признаки готической проработки и признаки феезер-примитива.
//
//   node scripts/icon-suspects.mjs            — таблица подозреваемых
//   node scripts/icon-suspects.mjs --all      — все глифы со счётом
//
// Признаки ПРИМИТИВА (плюс к подозрению):
//   · ни одного <path> — только line/circle/rect/polyline/polygon
//   · ни одной opacity (готический арт в проекте всегда слоит полутонами)
//   · мало узлов (≤5)
//   · нет ни одного вложенного stroke-width (одна толщина на весь глиф)
// Признаки ПРОРАБОТКИ (минус к подозрению): opacity, fill="currentColor"
// детали, несколько stroke-width, >8 узлов, <use> (арт вынесен в symbol).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAll, REGISTRY_PATH } from './icon-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

// Полный текст глифа по его позиции в файле (в реестре хранится только превью).
const srcCache = {};
function fullSvg(file, line) {
  const text = srcCache[file] ??= fs.readFileSync(path.join(ROOT, file), 'utf8');
  const upto = text.split('\n').slice(0, line).join('\n');
  const start = upto.lastIndexOf('<svg');
  if (start < 0) return '';
  const end = text.indexOf('</svg>', start);
  return end < 0 ? '' : text.slice(start, end + 6);
}

// Ближайший назад якорь: title=, aria-label=, data-act=, id=, или имя константы.
function anchorFor(file, line) {
  const text = srcCache[file] ??= fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = text.split('\n').slice(Math.max(0, line - 12), line);
  const pats = [/title="([^"]{2,60})"/, /aria-label="([^"]{2,60})"/, /data-act="([\w]+)"/,
                /id="([\w-]+)"/, /^\s*(\w+):\s*`?<svg/, /--([\w-]+):\s*url/];
  for (let i = lines.length - 1; i >= 0; i--) {
    for (const p of pats) { const m = lines[i].match(p); if (m) return m[1]; }
  }
  return '?';
}

function score(svg) {
  const n = (re) => (svg.match(re) || []).length;
  const paths = n(/<path\b/g);
  const prims = n(/<(line|circle|rect|polyline|polygon|ellipse)\b/g);
  const opac = n(/opacity=/g);
  const sw = n(/stroke-width=/g) - 1;           // минус тот, что на <svg>
  const nodes = paths + prims;
  if (/<use\b/.test(svg)) return { s: -99, why: 'use → арт в symbol' };
  let s = 0; const why = [];
  if (paths === 0 && prims > 0) { s += 3; why.push('нет <path>'); }
  if (opac === 0)               { s += 2; why.push('нет полутонов'); }
  if (nodes <= 5)               { s += 2; why.push(`узлов ${nodes}`); }
  if (sw <= 0)                  { s += 1; why.push('одна толщина'); }
  if (opac >= 2)                 s -= 2;
  if (nodes >= 9)                s -= 2;
  if (sw >= 2)                   s -= 1;
  return { s, why: why.join(' · '), nodes, opac, paths, prims };
}

const seen = new Set();
const rows = [];
for (const g of extractAll()) {
  if (seen.has(g.hash)) continue;
  seen.add(g.hash);
  const svg = fullSvg(g.file, g.line);
  if (!svg || svg.length > 6000) continue;      // склад <defs> целиком не судим
  const r = score(svg);
  const reg = registry[g.hash] || {};
  rows.push({ ...g, ...r, role: reg.role || 'UNASSIGNED', anchor: anchorFor(g.file, g.line),
              locs: (reg.locations || []).length });
}

const all = process.argv.includes('--all');
const out = rows.filter(r => all || r.s >= 4).sort((a, b) => b.s - a.s);
console.log(`глифов: ${rows.length} · подозреваемых (счёт ≥4): ${rows.filter(r => r.s >= 4).length}\n`);
for (const r of out) {
  console.log(`${String(r.s).padStart(3)}  ${r.file}:${r.line}  [${r.role}]  «${r.anchor}»  ${r.why}`);
}
