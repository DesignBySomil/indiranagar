import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game,K=window.__keys; g.go(0);
  const cvs=document.getElementById('c');
  const shot=async()=>{ await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  let t0=90000; const step=(n,dt=0.033)=>{for(let k=0;k<n;k++){t0+=33;window.__step(dt,t0);}};
  const out={};
  // A) boundary wall, night (user's framing was night)
  g.state.hour=22; if(g.applyTime)g.applyTime(22);
  g.auto.x=-100; g.auto.z=700; g.auto.a=0; g.auto.v=0;
  window.__noRender=true; step(20); window.__noRender=false;
  out.wallNight=await shot();
  // B) identity stability while driving through peds
  g.state.hour=12; if(g.applyTime)g.applyTime(12);
  g.auto.x=-94.3; g.auto.z=190; g.auto.a=0; g.auto.v=6;
  window.__noRender=true; step(15);
  const map1=g.crowd.peds.filter(q=>q._gemVariant!==undefined).map(q=>q.id+':'+q._gemVariant);
  const snap=()=>{const m={};for(const q of g.crowd.peds){} return null;};
  // record slot->ped assignments via the exposed peds: use gem visibility marker if available; fallback: check assigned via crowd internal not exposed -> instead track which peds are hidden-instanced is not observable. Use distance-invariant check: capture variant of slot assignment by reading crowd group children names? Do numeric: store nearest-18 ordered list now and after drive; flapping = different variants for same ped id. Since slots not exposed, measure INSTANCED visible counts only is weak. Skip numeric; capture two frames instead.
  out.idT0=null;
  window.__noRender=false; out.id0=await shot();
  window.__noRender=true; K.KeyW=true; step(60); K.KeyW=false; window.__noRender=false; out.id1=await shot();
  // C) knock with brake-on-contact
  g.auto.x=-133; g.auto.z=-345; g.auto.a=0; g.auto.v=0;
  window.__noRender=true; step(30);
  const P=g.crowd.peds; let best=null,bd=1e9;
  for(const q of P){const d=(q.x-g.auto.x)**2+(q.z-g.auto.z)**2; if(d<bd){bd=d;best=q;}}
  K.KeyW=true; let hitF=-1;
  for(let f=0;f<200;f++){
    const ta=Math.atan2(best.x-g.auto.x,best.z-g.auto.z);let d=ta-g.auto.a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
    g.auto.a+=Math.max(-0.09,Math.min(0.09,d));
    step(2);
    if(best.kn){ hitF=f; break; }
  }
  K.KeyW=false; K.KeyS=true; step(6); K.KeyS=false;
  out.knockHit=hitF; out.peakKy=0;
  for(let f=0;f<14;f++){ step(2); if(best.ky>out.peakKy)out.peakKy=best.ky; }
  window.__noRender=false; out.knockFlight=await shot();
  window.__noRender=true; step(60);
  window.__noRender=false; out.knockAfter=await shot();
  out.recovered=!best.kn;
  return out;
});
for(const k of ['wallNight','id0','id1','knockFlight','knockAfter']) if(r[k]) writeFileSync(`/tmp/bv-${k}.png`, Buffer.from(r[k].split(',')[1],'base64'));
console.log(JSON.stringify({knockHit:r.knockHit,peakKy:r.peakKy,recovered:r.recovered}));
await b.close();
