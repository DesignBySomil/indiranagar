import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:90000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=12; if(g.applyTime) g.applyTime(12);
  const cvs=document.getElementById('c');
  const shot=async()=>{ await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  // find a parked vehicle we can frame: probe parked.solid on a ring near the auto, pick the nearest
  const ax0=g.auto.x, az0=g.auto.z;
  let hit=null;
  outer: for(const rad of [6,9,12,16,22,30]){
    for(let k=0;k<24;k++){
      const a=k*Math.PI/12, x=ax0+Math.sin(a)*rad, z=az0+Math.cos(a)*rad;
      if(g.parked.solid(x,z)){ hit={x,z}; break outer; }
    }
  }
  if(!hit) return {err:'no parked near spawn'};
  // place the auto 9m from the parked vehicle, facing it, parked vehicle 2.4m right of axis
  const dx=hit.x-ax0, dz=hit.z-az0, d=Math.hypot(dx,dz), ux=dx/d, uz=dz/d;
  g.auto.x=hit.x-ux*9-uz*2.4; g.auto.z=hit.z-uz*9+ux*2.4;
  g.auto.a=Math.atan2(ux,uz); g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<15;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const a=await shot();
  // kick it sideways across the frame (perpendicular to view axis)
  const ok=g.parked.kickAt(hit.x,hit.z,-uz,ux,4.8);
  window.__noRender=true;
  for(let k=0;k<20;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const bShot=await shot();
  window.__noRender=true;
  for(let k=0;k<280;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const c=await shot();
  return {ok,hit,a:a.length,b:bShot.length,c:c.length,aData:a,bData:bShot,cData:c};
});
if(r.err){console.log(JSON.stringify(r));await b.close();process.exit(1);}
for(const [k,f] of [['aData','/tmp/parked-a-rest.png'],['bData','/tmp/parked-b-shoved.png'],['cData','/tmp/parked-c-settled.png']])
  writeFileSync(f, Buffer.from(r[k].split(',')[1],'base64'));
console.log(JSON.stringify({ok:r.ok,hit:r.hit,sizes:[r.a,r.b,r.c]}));
await b.close();
