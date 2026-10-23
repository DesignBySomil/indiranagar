import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=12; if(g.applyTime) g.applyTime(12);
  const cvs=document.getElementById('c');
  const shot=async()=>{ await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  g.auto.x=-94.3; g.auto.z=214; g.auto.a=0; g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<25;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const img=await shot();
  // render-cost probe: 40 rAF deltas
  const deltas=await new Promise(res=>{ const ds=[]; let last=performance.now(); const loop=()=>{ const n=performance.now(); ds.push(n-last); last=n; if(ds.length<40) requestAnimationFrame(loop); else res(ds); }; requestAnimationFrame(loop); });
  deltas.sort((a,b)=>a-b);
  return {img, medianMs:+deltas[20].toFixed(1), p90Ms:+deltas[36].toFixed(1)};
});
writeFileSync('/tmp/gem-street.png', Buffer.from(r.img.split(',')[1],'base64'));
console.log(JSON.stringify({medianMs:r.medianMs,p90Ms:r.p90Ms}));
await b.close();
