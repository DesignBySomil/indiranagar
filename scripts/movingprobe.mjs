import puppeteer from 'puppeteer-core';
const url = process.env.URL || 'http://localhost:4180/';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PE',String(e).slice(0,150)));
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  // route: start near regtest spawn, drive a loop along main roads toward the pocket area
  window.__spawnAt(-203,-708,Math.atan2(-9,7));
  let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}};
  stp(40);
  const route=[[-280,-700],[-360,-720],[-430,-740],[-466,-752],[-473,-754],[-470,-745],[-460,-735],[-450,-745],[-446,-765],[-444,-779],[-430,-800],[-400,-820]];
  const K=window.__keys; let wi=0;
  const prev=new Map(); const events=[];
  const a=g.auto;
  const steps=2400;
  for(let i=0;i<steps;i++){
    // steering toward route waypoint
    const wp=route[Math.min(wi,route.length-1)];
    const dx=wp[0]-a.x, dz=wp[1]-a.z;
    if(Math.hypot(dx,dz)<4 && wi<route.length-1) wi++;
    const target=Math.atan2(dx,dz);
    let err=target-a.a; while(err>Math.PI)err-=2*Math.PI; while(err<-Math.PI)err+=2*Math.PI;
    K.KeyW=true; K.KeyA=err>0.08; K.KeyD=err<-0.08; if(Math.abs(err)<=0.08){K.KeyA=false;K.KeyD=false;}
    T+=33; window.__step(0.033,T);
    // census
    const units=window.__traffic().units; const seen=new Set();
    const hx=Math.sin(a.a), hz=Math.cos(a.a);
    for(const u of units){ seen.add(u);
      const ux=u.x-a.x, uz=u.z-a.z; const d=Math.hypot(ux,uz);
      const inView=(ux*hx+uz*hz)/(d||1) > 0.3;
      const pr=prev.get(u);
      if(!pr){ if(d<150 && inView) events.push({i,kind:'appear',d:+d.toFixed(0),x:+u.x.toFixed(0),z:+u.z.toFixed(0)}); }
      else { const j=Math.hypot(u.x-pr.x,u.z-pr.z); if(j>40 && d<180 && inView) events.push({i,kind:'teleport',d:+d.toFixed(0),j:+j.toFixed(0),x:+u.x.toFixed(0),z:+u.z.toFixed(0)}); }
      prev.set(u,{x:u.x,z:u.z});
    }
    for(const [u,pr] of prev){ if(!seen.has(u)){ const d0=Math.hypot(pr.x-a.x,pr.z-a.z); if(d0<150) events.push({i,kind:'vanish',d:+d0.toFixed(0),x:+pr.x.toFixed(0),z:+pr.z.toFixed(0)}); prev.delete(u); } }
  }
  K.KeyW=K.KeyA=K.KeyD=false;
  const trc=window.__trc;
  const near=events.filter(e=>e.d<60), mid=events.filter(e=>e.d>=60&&e.d<120), far=events.filter(e=>e.d>=120);
  return {fl:(window.__flLog||[]).reduce((m,e)=>{const k=e.k+' @ '+e.x+','+e.z+' ow'+e.ow;m[k]=(m[k]||0)+1;return m;},{}), hl:(window.__hlLog||[]).reduce((m,e)=>{const k=e.why+' @ '+e.x+','+e.z+' ow'+e.ow;m[k]=(m[k]||0)+1;return m;},{}), raw:(window.__flLog||[]).filter(e=>e.x>-150&&e.x<-135).slice(-14), endPos:[+a.x.toFixed(0),+a.z.toFixed(0)],wp:wi, events:events.length, near:near.length, mid:mid.length, far:far.length,
    nearList:near.slice(0,10), midList:mid.slice(0,10),
    recycled:trc.recycled, held:trc.held, realFail:trc.realFail||0, failNext:trc.failNext, failJump:trc.failJump};
});
console.log('MOVING', JSON.stringify(r));
await b.close(); process.exit(0);
