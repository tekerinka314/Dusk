// icon-inventory.mjs — инвентарь всех inline-SVG приложения + ратчет-реестр.
//
// Извлекает каждый SVG-литерал (сырой `<svg>…</svg>` и URL-encoded
// `%3Csvg…%3C/svg%3E` в CSS data-URI) из поверхностей приложения, нормализует
// и хэширует. Реестр audit-v2/icon-registry.json сопоставляет хэш → роль
// (вердикт иконочной программы A–BU / derive / decor). Vitest-тест
// tests/icon-ratchet.test.js падает на любом глифе вне реестра — новая иконка
// не может появиться молча, изменение ратифицированного глифа тоже ловится
// (старый хэш устаревает + новый неизвестен).
//
//   node scripts/icon-inventory.mjs           — отчёт (unknown / stale)
//   node scripts/icon-inventory.mjs --update  — обновить реестр (роли/ноты
//                                               существующих хэшей сохраняются,
//                                               новые входят как UNASSIGNED,
//                                               исчезнувшие удаляются)
//
// Ограничение (принято): SVG, собранный конкатенацией без цельного литерала
// `<svg`, не ловится — такого стиля в кодовой базе нет.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY_PATH = path.join(ROOT, 'audit-v2', 'icon-registry.json');

// Поверхности приложения. Превью/аудит-файлы (audit-v2/previews) намеренно
// вне списка — там сотни кандидатов, не живой продукт.
function sourceFiles() {
  const files = ['index.html', 'style.css'];
  for (const dir of ['dusk', 'src']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      if (/\.(ts|js)$/.test(f)) files.push(`${dir}/${f}`);
    }
  }
  return files;
}

const RAW_RE = /<svg[\s\S]*?<\/svg>/gi;
const ENC_RE = /%3Csvg[\s\S]*?%3C(?:%2F|\/)svg%3E/gi;

function normalize(svg) {
  return svg.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
}

function hashOf(svg) {
  return crypto.createHash('sha256').update(normalize(svg)).digest('hex').slice(0, 16);
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

export function extractAll(root = ROOT) {
  const found = []; // { hash, file, line, preview }
  for (const rel of sourceFiles()) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const re of [RAW_RE, ENC_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        let svg = m[0];
        if (re === ENC_RE) {
          try { svg = decodeURIComponent(svg); } catch { /* хэшируем как есть */ }
        }
        found.push({
          hash: hashOf(svg),
          file: rel,
          line: lineAt(text, m.index),
          preview: normalize(svg).slice(0, 90),
        });
      }
    }
  }
  return found;
}

export function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return {};
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

export function diff(found = extractAll(), registry = loadRegistry()) {
  const seen = new Set(found.map((f) => f.hash));
  const unknown = found.filter((f) => !registry[f.hash]);
  const stale = Object.keys(registry).filter((h) => !seen.has(h));
  return { found, unknown, stale };
}

function update() {
  const old = loadRegistry();
  const found = extractAll();
  const next = {};
  for (const f of found) {
    if (!next[f.hash]) {
      next[f.hash] = {
        role: old[f.hash]?.role ?? 'UNASSIGNED',
        note: old[f.hash]?.note ?? '',
        preview: f.preview,
        locations: [],
      };
    }
    next[f.hash].locations.push(`${f.file}:${f.line}`);
  }
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(next, null, 1) + '\n');
  const dropped = Object.keys(old).filter((h) => !next[h]);
  console.log(`registry: ${Object.keys(next).length} глифов (${found.length} вхождений), ` +
    `новых ${found.filter((f) => !old[f.hash]).length ? new Set(found.filter((f) => !old[f.hash]).map((f) => f.hash)).size : 0}, удалено ${dropped.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--update')) {
    update();
  } else {
    const { found, unknown, stale } = diff();
    console.log(`глифов в коде: ${new Set(found.map((f) => f.hash)).size} (${found.length} вхождений)`);
    for (const u of unknown) console.log(`UNKNOWN ${u.file}:${u.line} ${u.hash} ${u.preview}`);
    for (const s of stale) console.log(`STALE   ${s} (в реестре, в коде отсутствует)`);
    if (!unknown.length) console.log('ратчет чист: все глифы в реестре');
    process.exitCode = unknown.length ? 1 : 0;
  }
}
