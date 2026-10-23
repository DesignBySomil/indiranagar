import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=1280,800']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,200)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0);
  const out={kickAtType:typeof g.traffic.kickAt, parkedKickType:typeof g.parked.kickAt};
  // direct API proof first
  const u=g.traffic.units.find(u=>u.x!==0&&u.seg&&u.seg.len>60);
  const direct=g.traffic.kickAt(u.x,u.z,1,0,3.5);
  window.__noRender=true; let t0=90000;
  for(let k=0;k<20;k++){t0+=16;window.__step(0.016,t0);}
  out.direct={kicked:direct,offAfter20:+Math.hypot(u.kx,u.kz).toFixed(3)};
  // instrumented chase
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  g.auto.x=u.x-fx*10; g.auto.z=u.z-fz*10; g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  window.__keys['KeyW']=true;
  const frames=[];
  for(let k=0;k<500;k++){ t0+=16; window.__step(0.016,t0);
    const v=g.auto.v;
    if(Math.abs(v)>2.0){
      const dirS=v>0?1:-1;
      const nx=g.auto.x+Math.sin(g.auto.a)*dirS*2.05, nz=g.auto.z+Math.cos(g.auto.a)*dirS*2.05;
      frames.push({k,v:+v.toFixed(2),ts:g.traffic.solid(nx,nz),ps:g.parked.solid(nx,nz),uoff:+Math.hypot(u.kx,u.kz).toFixed(3),dU:+Math.hypot(u.x-g.auto.x,u.z-g.auto.z).toFixed(2)});
    }
  }
  window.__keys['KeyW']=false;
  out.lastFrames=frames.slice(-14);
  out.uPeak=+frames.reduce((m,f)=>Math.max(m,f.uoff),0).toFixed(3);
  window.__noRender=false;
  return out;
});
console.log(JSON.stringify(r,null,1));
console.log('ERRS',JSON.stringify(errs.slice(0,3)));
await b.close();
