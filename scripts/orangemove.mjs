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
  const seg=g.roadSegs()[219];
  const segInfo={}; for(const k of Object.getOwnPropertyNames(seg)) segInfo[k]=seg[k];
  g.auto.x=-94.3; g.auto.z=214; g.auto.a=0; g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<25;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false; const a=await shot();
  // teleport back to identical spot, advance traffic 15s of sim
  window.__noRender=true;
  for(let k=0;k<940;k++){t0+=16;window.__step(0.016,t0);}
  g.auto.x=-94.3; g.auto.z=214; g.auto.a=0; g.auto.v=0;
  for(let k=0;k<5;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false; const c=await shot();
  return {a,c,segInfo:JSON.stringify(segInfo)};
});
writeFileSync('/tmp/junction-t0.png', Buffer.from(r.a.split(',')[1],'base64'));
writeFileSync('/tmp/junction-t15.png', Buffer.from(r.c.split(',')[1],'base64'));
console.log(r.segInfo);
await b.close();
