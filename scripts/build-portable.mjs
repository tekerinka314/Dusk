// Portable single-file build (migration 2d): dist/dusk-portable.html —
// самодостаточный HTML, работающий с диска двойным кликом (file://), без
// сервера. Это аварийный фолбэк: хостинг умер / нет сети / чужой компьютер.
//   • app.js и style.css инлайнятся (инлайновый <script type="module"> не
//     делает сетевых запросов → CORS-запрета file:// нет);
//   • pen-asset.js инлайнится (звук пера полностью офлайн);
//   • bg-gothic.jpg уходит в data:-URI внутри CSS;
//   • SW не регистрируется на file:// (register().catch уже молчит), тост
//     обновления не срабатывает (version.json недоступен — fetch тихо падает);
//   • Google-шрифты/GIS требуют сети — деградируют мягко.
// Данные живут в localStorage происхождения file:// — ОТДЕЛЬНОМ от сайта.
// Перенос данных: экспорт/импорт JSON (штатный no-login фолбэк).
// Запуск: npm run build:portable  (сначала соберёт обычный dist).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = (p) => path.join(ROOT, 'dist', p);

let html = readFileSync(dist('index.html'), 'utf8');
const js  = readFileSync(dist('app.js'), 'utf8');
const css = readFileSync(dist('style.css'), 'utf8');
const pen = readFileSync(dist('pen-asset.js'), 'utf8');
const bg  = readFileSync(dist('bg-gothic.jpg'));

// `</script>` внутри инлайнового JS обрывает тег — экранируем (внутри строк
// JS `<\/` === `</`, вне строк такая последовательность в валидном JS не встречается).
const safeJs = (s) => s.replace(/<\/script/gi, '<\\/script');

// CSS: фон → data URI (иначе file:// рядом с одиноким html файла не найдёт)
const cssInline = css.replace(/url\((['"]?)(?:\.\/)?bg-gothic\.jpg\1\)/g,
    `url(data:image/jpeg;base64,${bg.toString('base64')})`);

const subs = [
    // стиль: link → <style>
    [/<link rel="stylesheet"[^>]*href="\.\/style\.css"[^>]*>/,
     () => `<style>\n${cssInline}\n</style>`],
    // бандл: внешний module → инлайновый module (исполняется на file:// свободно)
    [/<script type="module"[^>]*src="\.\/app\.js"[^>]*><\/script>/,
     () => `<script type="module">\n${safeJs(js)}\n</script>`],
    // звук пера: внешний classic → инлайновый classic
    [/<script src="pen-asset\.js"><\/script>/,
     () => `<script>\n${safeJs(pen)}\n</script>`],
];
for (const [re, rep] of subs) {
    if (!re.test(html)) { console.error(`portable: pattern not found: ${re}`); process.exit(1); }
    html = html.replace(re, rep);
}

const out = dist('dusk-portable.html');
writeFileSync(out, html);
console.log(`portable build → ${out} (${(html.length / 1048576).toFixed(1)} MB)`);
