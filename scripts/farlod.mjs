import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  g.auto.x=200; g.auto.z=-266; g.auto.a=Math.PI/2; g.auto.v=0;
  step(90);
  const n=g.crowd.peds.length;
  const gems=g.crowd.peds.filter(q=>q._gemVariant!==undefined).length;
  window.__noRender=false; const f1=await cap(); window.__noRender=true;
  // knock the nearest ped to verify the knocked far path renders
  const p=g.crowd.peds.reduce((a,q)=>{const d=Math.hypot(q.x-g.auto.x,q.z-g.auto.z);return d<a[0]?[d,q]:a;},[1e9,null])[1];
  let knState=null;
  if(p){ g.crowd.kickAt(p.x,p.z,1,0,1); step(6); knState={kn:!!p.kn}; window.__noRender=false; var f2=await cap(); window.__noRender=true; step(200); knState.recovered=!p.kn; }
  return {f1,f2:f2||null,n,gems,knState};
});
writeFileSync('/tmp/far-1.png', Buffer.from(r.f1.split(',')[1],'base64'));
if(r.f2) writeFileSync('/tmp/far-2.png', Buffer.from(r.f2.split(',')[1],'base64'));
console.log(JSON.stringify({peds:r.n,gems:r.gems,kn:r.knState,errs:errs.slice(0,3)}));
await b.close();
