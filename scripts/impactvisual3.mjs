import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:90000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0);
  const ax=g.auto.x, az=g.auto.z;
  const u=g.traffic.units.filter(u=>u.x!==0&&u.seg&&u.seg.len>60&&u.td.key==='sedan')
    .sort((a,b)=>Math.hypot(a.x-ax,a.z-az)-Math.hypot(b.x-ax,b.z-az))[0];
  if(!u) return {err:'no sedan'};
  const i=g.traffic.units.indexOf(u);
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  g.auto.x=u.x-fx*12-fz*1.6; g.auto.z=u.z-fz*12+fx*1.6;
  g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<15;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  return {i};
});
if(r.err){console.log(JSON.stringify(r));process.exit(1);}
await p.evaluate(()=>new Promise(r=>setTimeout(r,350)));
await p.screenshot({path:'/tmp/impact-a-rest.png'});
const mid=await p.evaluate((i)=>{
  const g=window.__game; const u=g.traffic.units[i];
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  const ok=g.traffic.kickAt(u.x,u.z,-fz,fx,5.5);
  window.__noRender=true; let t0=95000;
  for(let k=0;k<13;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  return {ok,off:+Math.hypot(u.kx,u.kz).toFixed(2),ky:+u.ky.toFixed(2),ks:+u.ks.toFixed(2)};
},r.i);
await p.evaluate(()=>new Promise(r=>setTimeout(r,350)));
await p.screenshot({path:'/tmp/impact-b-shoved.png'});
const settled=await p.evaluate((i)=>{
  const g=window.__game; const u=g.traffic.units[i];
  window.__noRender=true; let t0=98000;
  for(let k=0;k<260;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  return {off:+Math.hypot(u.kx,u.kz).toFixed(3)};
},r.i);
await p.evaluate(()=>new Promise(r=>setTimeout(r,350)));
await p.screenshot({path:'/tmp/impact-c-settled.png'});
console.log(JSON.stringify({mid,settled}));
await b.close();
