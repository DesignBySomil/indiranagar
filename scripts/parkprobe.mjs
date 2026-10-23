import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-104,60,0);
  let t0=90000; const K=window.__keys; K.KeyW=true; for(let k=0;k<200;k++){t0+=33;window.__step(0.033,t0);} K.KeyW=false;
  const all=(typeof window.__parkedSpots==='function')?window.__parkedSpots():null;
  const spots=(all||[]).filter(s=>Math.hypot(s.x-(-104),s.z-85)<45);
  if(!all||!all.length){return {err:'no spots',hasFn:typeof window.__parkedSpots,total:(all||[]).length,player:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)]};}
  const segs=g.roadSegs().map((s,i)=>({i,name:s.name,x1:s.x1??s[0],z1:s.z1??s[1],x2:s.x2??s[2],z2:s.z2??s[3],w:s.width??s[6],ow:!!s.oneway}));
  const hseg=segs.filter(s=>/100 Feet/.test(s.name||''));
  const lat=(x,z,s)=>{const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1e-9;let t=((x-s.x1)*dx+(z-s.z1)*dz)/L2;t=Math.max(0,Math.min(1,t));
    const px=s.x1+t*dx,pz=s.z1+t*dz;const side=Math.sign((x-px)*(-dz)+(z-pz)*(dx));
    return {d:+Math.hypot(x-px,z-pz).toFixed(2),side,t:+t.toFixed(2)};};
  const rows=spots.map(sp=>{
    let best=null;
    for(const s of hseg){const r=lat(sp.x,sp.z,s);if(!best||r.d<best.d)best={...r,seg:s.i,w:s.w,ow:s.ow};}
    return {...sp,...best};
  }).sort((a,b)=>a.z-b.z);
  return {count:spots.length,rows};
});
console.log(JSON.stringify(out,null,1));
await b.close(); process.exit(0);
