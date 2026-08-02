// S3/B5 contrast — archive rows (B2-05 data) + grim callout, using switchPage.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import zlib from 'zlib'; import fs from 'fs'; import path from 'path';
const DIR = ensureShots('s3');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };
function decodePNG(buf){let p=8,w=0,h=0,ct=0;const idat=[];while(p<buf.length){const len=buf.readUInt32BE(p),type=buf.toString('ascii',p+4,p+8),data=buf.slice(p+8,p+8+len);if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);ct=data[9];}else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;p+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const bpp=ct===6?4:ct===2?3:4,rb=w*bpp,out=Buffer.alloc(h*rb);const paeth=(a,b,c)=>{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};let sp=0;for(let y=0;y<h;y++){const ft=raw[sp++];for(let x=0;x<rb;x++){const v=raw[sp++],a=x>=bpp?out[y*rb+x-bpp]:0,b=y>0?out[(y-1)*rb+x]:0,c=(x>=bpp&&y>0)?out[(y-1)*rb+x-bpp]:0;let r;switch(ft){case 0:r=v;break;case 1:r=v+a;break;case 2:r=v+b;break;case 3:r=v+((a+b)>>1);break;case 4:r=v+paeth(a,b,c);break;default:r=v;}out[y*rb+x]=r&255;}}return{w,h,bpp,rb,out};}
function px(g,x,y){const i=y*g.rb+x*g.bpp;return[g.out[i],g.out[i+1],g.out[i+2]];}
function rl([r,g,b]){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);}
function ct2(fg,bg){const a=Math.max(rl(fg),rl(bg)),b=Math.min(rl(fg),rl(bg));return(a+0.05)/(b+0.05);}
function prgb(s){const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(parseFloat);return[p[0],p[1],p[2]];}
const { srv, port } = await serve();
const browser = await launch();
const out=[];
async function meas(p,sel,desc,pg){const el=await p.$(sel);if(!el){out.push({desc,pg,err:'NF'});return;}
  const info=await el.evaluate(n=>{const cs=getComputedStyle(n),r=n.getBoundingClientRect();return{color:cs.color,fs:cs.fontSize,fw:cs.fontWeight,x:r.x,y:r.y,w:r.width,h:r.height,txt:(n.textContent||'').trim().slice(0,22),deco:cs.textDecorationLine};});
  if(info.w<1){out.push({desc,pg,err:'zero'});return;}
  const fg=prgb(info.color);
  await el.evaluate(n=>{n.__c=n.style.color;n.style.color='transparent';n.style.textShadow='none';n.style.webkitTextFillColor='transparent';});
  const cx=Math.round(info.x+info.w/2),cy=Math.round(info.y+info.h/2);
  const buf=await p.screenshot({clip:{x:Math.max(0,cx-2),y:Math.max(0,cy-2),width:5,height:5}});
  await el.evaluate(n=>{n.style.color=n.__c||'';n.style.textShadow='';n.style.webkitTextFillColor='';});
  const g=decodePNG(buf),bg=px(g,2,2),r=ct2(fg,bg);
  out.push({desc,pg,txt:info.txt,fs:info.fs,fw:info.fw,deco:info.deco,fg:`rgb(${fg})`,bg:`rgb(${bg})`,ratio:+r.toFixed(2),pass:r>=4.5});
}
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  await p.evaluate(()=>switchPage('archive')); await p.waitForTimeout(800);
  const dump=await p.evaluate(()=>({items:document.querySelectorAll('.archive-item').length, firstHTML:(document.querySelector('.archive-item')||{}).outerHTML?.slice(0,200)}));
  console.log('archive items:',dump.items);
  await meas(p,'.archive-item .task-text','archived row title','archive');
  await meas(p,'.archive-month-name','archive month header','archive');
  await meas(p,'.archive-item .archive-sub-text','archived subtask text','archive');
  await meas(p,'.archive-item .meta-tag.muted-tag','archive date meta','archive');
}
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port, page:'notes' });
  await p.waitForTimeout(400);
  await p.evaluate(()=>grimOpen('n5')); await p.waitForTimeout(800);
  const cdump=await p.evaluate(()=>{const c=document.querySelector('.grim-callout');return c?c.outerHTML.slice(0,220):'NO CALLOUT; body='+(document.querySelector('.grim-body')||{}).innerHTML?.slice(0,150);});
  console.log('callout dump:',cdump);
  await meas(p,'.grim-callout p','warn callout body','notes');
  await meas(p,'.grim-callout','warn callout (node)','notes');
}
fs.writeFileSync(path.join(DIR,'_contrast2.json'),JSON.stringify(out,null,2));
console.log('\n=== CONTRAST 2 ===');
for(const r of out){ if(r.err){console.log(`✗ ${r.desc} — ${r.err}`);continue;} console.log(`${r.pass?'PASS':'FAIL'} ${r.ratio}:1 — ${r.desc} [${r.pg}] fs=${r.fs} fw=${r.fw} deco=${r.deco} fg=${r.fg} bg=${r.bg} "${r.txt}"`); }
await browser.close(); srv.close();
