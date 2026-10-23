import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=1280,800']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,300)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000});
const res=await p.evaluate(()=>{
  const g=window.__game; g.go(0);
  window.__noRender=true;
  // pick a traffic unit on a long seg, place auto behind it
  const u=g.traffic.units.find(u=>u.x!==0&&u.seg&&u.seg.len>60);
  if(!u) return {err:'no unit'};
  const i=g.traffic.units.indexOf(u);
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  g.auto.x=u.x-fx*10; g.auto.z=u.z-fz*10; g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  window.__keys['KeyW']=true;
  const track=[]; let t0=1000;
  for(let k=0;k<900;k++){ t0+=16; window.__step(0.016,t0);
    if(k%15===0) track.push({v:+g.auto.v.toFixed(2),kx:+(u.kx||0).toFixed(3),kz:+(u.kz||0).toFixed(3),ky:+(u.ky||0).toFixed(3),ks:+(u.ks||0).toFixed(3),d:+Math.hypot(u.x-g.auto.x,u.z-g.auto.z).toFixed(2)});
  }
  window.__keys['KeyW']=false;
  for(let k=0;k<240;k++){ t0+=16; window.__step(0.016,t0); }
  const peak=track.reduce((m,s)=>Math.max(m,Math.hypot(s.kx,s.kz)),0);
  const settled={kx:+u.kx.toFixed(4),kz:+u.kz.toFixed(4),ks:+u.ks.toFixed(4),ky:+u.ky.toFixed(4)};
  // parked kick direct
  const pk=g.parked.kickAt(g.auto.x+2,g.auto.z,1,0,3.0);
  let parkedOff=null;
  if(pk){ for(let k=0;k<60;k++){ t0+=16; window.__step(0.016,t0); }
    // find the kicked spot via a second call's absence; instead measure: kick again should fail while cool
    parkedOff={secondKickRejected:!g.parked.kickAt(g.auto.x+2,g.auto.z,1,0,3.0)};
  }
  window.__noRender=false;
  return {peak:+peak.toFixed(3),settled,sample:track.filter((_,j)=>j%4===0).slice(0,16),parked:{kicked:pk,...parkedOff},au:{x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1)}};
});
console.log(JSON.stringify(res));
await new Promise(r=>setTimeout(r,700));
await p.screenshot({path:'/tmp/impact-after.png'});
console.log('ERRS',JSON.stringify(errs.slice(0,4)));
await b.close();
