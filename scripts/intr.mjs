import puppeteer from 'puppeteer-core';
import fs from 'fs';
const rows=[...require0('/tmp/rd-o0.json'),...require0('/tmp/rd-o1.json')];
function require0(f){return JSON.parse(fs.readFileSync(f,'utf8'))}
const pts=[];
for(const x of rows){ if(x.startSolid){pts.push({idx:x.idx,t:'start',p:x.start,solid:1});continue}
 if(x.jumps&&x.blocked&&x.blocked[0]){const h=x.blocked[0].h;for(const s of h){const m=s.match(/^\d+:([a-z+]+)@(-?[\d.]+),(-?[\d.]+)/);if(m&&/solid/.test(m[1])){pts.push({idx:x.idx,t:'hop',p:[+m[2],+m[3]]});break}}}}
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
const out=await p.evaluate((pts)=>{const g=window.__game,S=g.roadSegs();return pts.map(q=>{let best=1e9,bs=null;S.forEach((s,i)=>{const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz;let t=Math.max(0,Math.min(1,((q.p[0]-s.x1)*dx+(q.p[1]-s.z1)*dz)/L2));const d=Math.hypot(q.p[0]-(s.x1+t*dx),q.p[1]-(s.z1+t*dz));if(d<best){best=d;bs=[i,s.width]}});return {...q,d:+best.toFixed(2),seg:bs}})},pts);
fs.writeFileSync('/tmp/intr.json',JSON.stringify(out));
for(const o of out)console.log(o.idx,o.t,o.p.join(','),'d',o.d,'seg',o.seg.join('/'));
await b.close();
