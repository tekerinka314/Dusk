import fs from 'fs';
const B = '<rect x="3" y="12" width="9" height="1"/><rect x="1" y="13" width="13" height="1" opacity="0.55"/>';
// Ключ узнавания: у всех трёх башен есть ПЕРЕМЫЧКА-архитрав (полоса 5px) над
// двойными стенами со щелью. Руина обязана нести те же стены + ОБЛОМОК перемычки,
// и отличаться только срезанным верхом — тогда это «та же башня», а не абстракция.
const wallsFull = '<rect x="5" y="8" width="2" height="4"/>';
const R6 = `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<rect x="5" y="7" width="2" height="1" opacity="0.85"/>`   // обломок перемычки
  + wallsFull
  + `<path d="M8 12V9H9V10H10V12Z"/>`                            // правая стена сколота
  + `<rect x="11" y="11" width="2" height="1" opacity="0.7"/>`   // рухнувший блок
  + B + `</svg>`;
const R7 = `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<rect x="5" y="7" width="3" height="1" opacity="0.85"/>`    // перемычка длиннее, обрублена справа
  + wallsFull
  + `<path d="M8 12V9H9V10H10V12Z"/>`
  + `<rect x="11" y="11" width="2" height="1" opacity="0.7"/>`
  + `<rect x="2" y="11" width="2" height="1" opacity="0.45"/>`
  + B + `</svg>`;
// эталон для сравнения — «низкий» и «средний»
const tower = (fy, ay, by) => `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<rect x="7" y="${fy}" width="1" height="${ay - fy}"/>`
  + `<path d="M7.5 ${ay}L10.5 ${by}H4.5Z"/>`
  + `<rect x="5" y="${by}" width="5" height="1"/>`
  + `<rect x="5" y="${by + 1}" width="2" height="${11 - by}"/>`
  + `<rect x="8" y="${by + 1}" width="2" height="${11 - by}"/>`
  + B + `</svg>`;
fs.writeFileSync('D:/tmp/pw/_ruin3.json', JSON.stringify({ R6, R7, LOW: tower(5, 7, 10), MED: tower(3, 5, 8) }, null, 1));
console.log('ok');
