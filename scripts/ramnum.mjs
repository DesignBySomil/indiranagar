import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=480,270']});
const p=await b.newPage(); await p.setViewport({width:480,height:270});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const units=(g.traffic&&g.traffic.units)||[];
  const A=g.auto;
  let t=null,bd=1e9;
  for(const u of units){const d=Math.hypot(u.x-A.x,u.z-A.z); if(d>8&&d<bd){bd=d;t=u;}}
  if(!t) return {err:'no unit'};
  t.kvx=t.kvz=t.kx=t.kz=0; if(t.v!==undefined)t.v=0; if(t.spd!==undefined)t.spd=0;
  const fx=Math.sin(t.yaw), fz=Math.cos(t.yaw);
  A.x=t.x-fx*20; A.z=t.z-fz*20; A.a=t.yaw; A.v=0;
  window.__noRender=true;
  let t0=90000; const K=window.__keys; K.KeyW=true;
  let peakKy=0, peakOx=0, peakOz=0, hit=false;
  for(let k=0;k<300;k++){
    t0+=33; window.__step(0.033,t0);
    if((t.ky||0)>peakKy) peakKy=t.ky;
    if(Math.abs(t.ox||0)>Math.abs(peakOx)) peakOx=t.ox;
    if(Math.abs(t.oz||0)>Math.abs(peakOz)) peakOz=t.oz;
    if((t.ky||0)>0.05) hit=true;
  }
  K.KeyW=false;
  // let it fully settle
  for(let k=0;k<60;k++){ t0+=33; window.__step(0.033,t0); }
  return {err:null,hit,peakKy:+peakKy.toFixed(2),
    settled:{ox:+(t.ox||0).toFixed(2),oz:+(t.oz||0).toFixed(2),oyaw:+(t.oyaw||0).toFixed(2),kx:+(t.kx||0).toFixed(3),kz:+(t.kz||0).toFixed(3),ky:+(t.ky||0).toFixed(2)},
    persistDisp:+Math.hypot(t.ox||0,t.oz||0).toFixed(2)};
});
console.log(JSON.stringify(r));
await b.close(); process.exit(0);
