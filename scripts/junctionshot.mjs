import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=12; if(g.applyTime) g.applyTime(12);
  const cvs=document.getElementById('c');
  const shot=async()=>{ await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  // approach from the south driving north toward the junction at (-96,226)
  g.auto.x=-96+1.7; g.auto.z=214; g.auto.a=0; g.auto.v=0; // heading +z (north in this frame? a=0 faces +z)
  window.__noRender=true; let t0=90000;
  for(let k=0;k<25;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  return {a:await shot()};
});
writeFileSync('/tmp/junction-100ft.png', Buffer.from(r.a.split(',')[1],'base64'));
console.log('ok');
await b.close();
