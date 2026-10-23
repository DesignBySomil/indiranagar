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
  const ax=g.auto.x, az=g.auto.z;
  const u=g.traffic.units.filter(u=>u.x!==0&&u.seg&&u.seg.len>60&&u.td.key==='sedan')
    .sort((a,b)=>Math.hypot(a.x-ax,a.z-az)-Math.hypot(b.x-ax,b.z-az))[0];
  if(!u) return {err:'no sedan'};
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  g.auto.x=u.x-fx*8-fz*2.6; g.auto.z=u.z-fz*8+fx*2.6;
  g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<15;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const a=await shot();
  const ok=g.traffic.kickAt(u.x,u.z,fz,-fx,6.0);
  window.__noRender=true;
  for(let k=0;k<20;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const mid={ok,off:+Math.hypot(u.kx,u.kz).toFixed(2),ky:+u.ky.toFixed(2),ks:+u.ks.toFixed(2)};
  const bShot=await shot();
  window.__noRender=true;
  for(let k=0;k<260;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const settled=+Math.hypot(u.kx,u.kz).toFixed(3);
  const c=await shot();
  return {mid,settled,a:a.length,b:bShot.length,c:c.length,aData:a,bData:bShot,cData:c};
});
if(r.err){console.log(JSON.stringify(r));await b.close();process.exit(1);}
for(const [k,f] of [['aData','/tmp/impact-a-rest.png'],['bData','/tmp/impact-b-shoved.png'],['cData','/tmp/impact-c-settled.png']])
  writeFileSync(f, Buffer.from(r[k].split(',')[1],'base64'));
console.log(JSON.stringify({mid:r.mid,settled:r.settled,sizes:[r.a,r.b,r.c]}));
await b.close();
