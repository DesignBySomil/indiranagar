import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>{const g=window.__game,S=g.roadSegs();
 const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
 const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
 const out={};
 const W=[[380,37],[301,-578],[601,-553],[498,-503],[591,-564],[535,-566],[522,-548],[610,-564],[602,-564],[604,-520]];for(const i of S.map((_,i)=>i).filter(i=>{const s=S[i],mx=(s.x1+s.x2)/2,mz=(s.z1+s.z2)/2;return W.some(w=>Math.hypot(w[0]-mx,w[1]-mz)<16)})){
  const s=S[i];const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);const bad=[];
  for(const d of [1,-1]){const ux=d*(s.x2-s.x1)/L,uz=d*(s.z2-s.z1)/L,a=Math.atan2(ux,uz);const x0=d>0?s.x1:s.x2,z0=d>0?s.z1:s.z2;let nb=0;for(let t=0;t<=L;t+=.5)if(!free(x0+ux*t,z0+uz*t,a))nb++;bad.push(nb)}
  out[i]={L:+L.toFixed(1),blockedSamples:bad,total:Math.floor(L/.5)+1}}
 return out})));
await b.close();
