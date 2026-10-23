import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=1280,800']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,300)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000});

// PART 1: night canopy drive on 100 Feet Road — camera must never enter crowns, no black plane
const r1=await p.evaluate(()=>{
  const g=window.__game; g.go(0);
  g.state.hour=22; if(g.applyTime) g.applyTime(22);
  window.__noRender=true;
  // 100 Feet Road area: drive a long stretch
  g.auto.x=-136; g.auto.z=-420; g.auto.a=Math.PI; g.auto.v=0; // heading south along 100ft? a=PI faces -z? keep W drive
  window.__keys['KeyW']=true;
  let t0=1000, maxCamUnderCrown=0, camMax=0, minD=99, vols=window.__camBridgeVols||[];
  for(let k=0;k<1500;k++){ t0+=16; window.__step(0.016,t0);
    const cy=g.camera.position.y; if(cy>camMax)camMax=cy;
    // check if camera is inside any crown volume: vol rect {x,z,halfLen,halfW,clearanceY,a?}
    for(const v of vols){
      if(v.clearanceY===undefined)continue;
      const dx=g.camera.position.x-v.x, dz=g.camera.position.z-v.z;
      if(Math.abs(dx)<(v.halfLen||4)+1 && Math.abs(dz)<(v.halfW||4)+1){
        if(cy>maxCamUnderCrown) maxCamUnderCrown=cy;
      }
    }
    const d=Math.hypot(g.camera.position.x-g.auto.x,g.camera.position.z-g.auto.z);
    if(d<minD)minD=d;
  }
  window.__keys['KeyW']=false;
  const end={x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1)};
  window.__noRender=false;
  return {camMax:+camMax.toFixed(2),maxCamUnderCrown:+maxCamUnderCrown.toFixed(2),end,vols:vols.length};
});
console.log('CANOPY',JSON.stringify(r1));
await new Promise(r=>setTimeout(r,600));
await p.screenshot({path:'/tmp/decisive-night-drive.png'});

// PART 2: impact — fast stepped drive into a traffic vehicle
const r2=await p.evaluate(()=>{
  const g=window.__game;
  window.__noRender=true;
  const u=g.traffic.units.find(u=>u.x!==0&&u.seg&&u.seg.len>60);
  if(!u) return {err:'no unit'};
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  g.auto.x=u.x-fx*10; g.auto.z=u.z-fz*10; g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  window.__keys['KeyW']=true;
  let t0=50000, peak=0, peakKy=0, hitV=0;
  const seq=[];
  for(let k=0;k<700;k++){ t0+=16; window.__step(0.016,t0);
    const o=Math.hypot(u.kx||0,u.kz||0);
    if(o>peak){peak=o;hitV=g.auto.v;}
    if((u.ky||0)>peakKy)peakKy=u.ky;
    if(k%35===0)seq.push({v:+g.auto.v.toFixed(1),off:+o.toFixed(2),ky:+(u.ky||0).toFixed(2),ks:+(u.ks||0).toFixed(2)});
  }
  window.__keys['KeyW']=false;
  for(let k=0;k<300;k++){ t0+=16; window.__step(0.016,t0); }
  const settled={off:+Math.hypot(u.kx,u.kz).toFixed(4),ks:+u.ks.toFixed(4),ky:u.ky};
  // collider follows displaced vehicle: solid() must be true at displaced pos during a kick
  let colliderFollows=null;
  const u2=g.traffic.units.find(x=>x!==u&&x.x!==0);
  if(u2){ const ok=g.traffic.kickAt(u2.x,u2.z,1,0,3.5);
    for(let k=0;k<25;k++){ t0+=16; window.__step(0.016,t0); }
    colliderFollows=g.traffic.solid(u2.x,u2.z); // u.x includes offset
  }
  window.__noRender=false;
  return {peak:+peak.toFixed(3),peakKy:+peakKy.toFixed(3),hitV:+hitV.toFixed(1),settled,seq,colliderFollows};
});
console.log('IMPACT',JSON.stringify(r2));
await new Promise(r=>setTimeout(r,600));
await p.screenshot({path:'/tmp/decisive-impact.png'});
console.log('ERRS',JSON.stringify(errs.slice(0,4)));
await b.close();
