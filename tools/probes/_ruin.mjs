import fs from 'fs';
const BASE15 = '<rect x="3" y="12" width="9" height="1"/><rect x="1" y="13" width="13" height="1" opacity="0.55"/>';
// R1 · разрушенная башня: обе стены обломаны на разной высоте, щель-окно цела,
// у подножия обрушенная перемычка и щебень.
const R1 = `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<path d="M5 12V8H6V9H7V12Z"/>`
  + `<path d="M8 12V10H9V11H10V12Z"/>`
  + `<rect x="11" y="11" width="2" height="1" opacity="0.8"/>`
  + `<rect x="3" y="11" width="1" height="1" opacity="0.5"/>`
  + BASE15 + `</svg>`;
// R2 · выше и заметнее: стены до y=7/9, косой скол, упавший блок крупнее
const R2 = `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<path d="M5 12V7H6V8H7V12Z"/>`
  + `<path d="M8 12V10H9V9H10V12Z"/>`
  + `<rect x="10" y="10" width="3" height="1" opacity="0.75"/>`
  + `<rect x="2" y="11" width="2" height="1" opacity="0.5"/>`
  + BASE15 + `</svg>`;
// R3 · с трещиной в уцелевшей стене и наклонённым блоком
const R3 = `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<path d="M4 12V7H5V6H6V8H7V12Z"/>`
  + `<path d="M8 12V10H9V11H10V12Z"/>`
  + `<rect x="11" y="10" width="2" height="2" opacity="0.7"/>`
  + `<rect x="2" y="11" width="1" height="1" opacity="0.5"/>`
  + BASE15 + `</svg>`;
fs.writeFileSync('D:/tmp/pw/_ruin.json', JSON.stringify({ R1, R2, R3 }, null, 1));
console.log('ok');
