import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=480,270']});
const p=await b.newPage(); await p.setViewport({width:480,height:270});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const segs=g.roadSegs();
  const widths={}; let cmh=null, h100=null, oneWays=0;
  for(const s of segs){const w=+(s.width??s[6]).toFixed(1); widths[w]=(widths[w]||0)+1;
    const n=s.name||s[4]||'';
    if(!cmh&&n.includes('Chinmaya')) cmh={w,oneway:!!s.oneway,lanes:s.lanes};
    if(!h100&&n.includes('100 Feet')) h100={w,oneway:!!s.oneway,lanes:s.lanes};
    if(s.oneway) oneWays++; }
  // single-hit ram: release throttle at first contact so no re-ram
  const units=(g.traffic&&g.traffic.units)||[];
  const A=g.auto; let t=null,bd=1e9;
  for(const u of units){const d=Math.hypot(u.x-A.x,u.z-A.z); if(d>8&&d<bd){bd=d;t=u;}}
  if(!t) return {err:'no unit'};
  t.kvx=t.kvz=t.kx=t.kz=0; if(t.v!==undefined)t.v=0; if(t.spd!==undefined)t.spd=0;
  const fx=Math.sin(t.yaw), fz=Math.cos(t.yaw);
  A.x=t.x-fx*20; A.z=t.z-fz*20; A.a=t.yaw; A.v=0;
  window.__noRender=true; let t0=90000; const K=window.__keys; K.KeyW=true;
  let peakKy=0, released=false;
  for(let k=0;k<140;k++){ t0+=33; window.__step(0.033,t0);
    if((t.ky||0)>peakKy) peakKy=t.ky;
    if(!released&&Math.hypot(t.x-A.x,t.z-A.z)<4.5){ K.KeyW=false; released=true; }
  }
  K.KeyW=false;
  const d1=Math.hypot(t.ox||0,t.oz||0);
  // 12s more sim: displacement must persist; unit should resume its route
  let moved=0; const sx=t.x, sz=t.z;
  for(let k=0;k<360;k++){ t0+=33; window.__step(0.033,t0); }
  moved=Math.hypot(t.x-sx,t.z-sz);
  const d2=Math.hypot(t.ox||0,t.oz||0);
  return {err:null,widths,oneWays,cmh,h100,
    ram:{peakKy:+peakKy.toFixed(2),released,
      dispAfterHit:+d1.toFixed(2),dispAfter12s:+d2.toFixed(2),
      movedAfter12s:+moved.toFixed(1),kx:+(t.kx||0).toFixed(3),ky:+(t.ky||0).toFixed(2)}};
});
console.log(JSON.stringify(r));
await b.close(); process.exit(0);
