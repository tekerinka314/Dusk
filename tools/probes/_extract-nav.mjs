import fs from 'fs';
const h = fs.readFileSync('D:/VSCode projects/DUSK_v2.0/index.html', 'utf8');
const g = (id, cap, join) => {
  const re = new RegExp(`<symbol id="${id}" viewBox="[^"]+">([\\s\\S]*?)</symbol>`);
  const m = h.match(re);
  if (!m) throw new Error('no ' + id);
  return `<svg viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="${cap}" stroke-linejoin="${join}">${m[1].replace(/\s+/g, ' ')}</svg>`;
};
fs.writeFileSync('D:/tmp/pw/_nav15b.json', JSON.stringify({
  NEW_tomb: g('icon-tomb', 'square', 'miter'),
  NEW_tome: g('icon-tome', 'round', 'round'),
}, null, 1));
console.log('ok');
