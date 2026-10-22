import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
const out=await p.evaluate(()=>{const g=window.__game,S=g.roadSegs();const r=[];for(const i of [1545,1548,1549,1550,1553,1555,1122,1312,1634,1401,1397,1392,872,1385]){const s=S[i];const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);let n=0,m=0;for(let t=0;t<=L;t+=1){const x=s.x1+(s.x2-s.x1)*t/L,z=s.z1+(s.z2-s.z1)*t/L;m++;if(g.solid(x,z))n++}r.push([i,s.name,s.width,+L.toFixed(0),n+'/'+m,s.x1.toFixed(0)+','+s.z1.toFixed(0),s.x2.toFixed(0)+','+s.z2.toFixed(0)].join(' '))}return r});
console.log(out.join('\n'));await b.close();
