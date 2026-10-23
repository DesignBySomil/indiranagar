import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game,K=window.__keys; g.go(0);
  g.state.hour=12; if(g.applyTime)g.applyTime(12);
  const cvs=document.getElementById('c');
  const shot=async()=>{ await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  // gem slots are the high-fi Groups among crowd.group children (name starts with pedestrian_)
  const gemChildren=g.crowd.group.children.filter(c=>c.name&&c.name.startsWith('pedestrian_'));
  const slotVariant=gemChildren.map(c=>c.name);
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  // start on 100 Feet Rd with peds around
  g.auto.x=-94.3; g.auto.z=150; g.auto.a=0; g.auto.v=5;
  step(20);
  // sample: for each ped within 65m, which gem slot (by position match) and variant
  const track=new Map(); // pedId -> Set of variants seen
  const seen=new Set();
  K.KeyW=true;
  for(let s=0;s<16;s++){
    step(30); // ~1s
    for(const q of g.crowd.peds){
      const d=Math.hypot(q.x-g.auto.x,q.z-g.auto.z);
      if(d>65) continue;
      // find gem child at ped position
      const v=q._gemVariant!==undefined?String(q._gemVariant):null;
      if(!track.has(q.id)) track.set(q.id,new Set());
      if(v){ track.get(q.id).add(v); seen.add(q.id); }
    }
  }
  K.KeyW=false;
  let flips=0, tracked=0;
  for(const [id,set] of track){ if(set.size>0){tracked++; if(set.size>1)flips++;} }
  // wall approach shot: normal chase framing toward boundary on a road end
  const segs=g.roadSegs(); let best=null,bd=1e9;
  for(const s of segs){ for(const [ex,ez] of [[s.x1,s.z1],[s.x2,s.z2]]){ if(Math.abs(ez-747)<bd){bd=Math.abs(ez-747);best={s,ex,ez};} } }
  const s=best.s, cx=(s.x1+s.x2)/2, cz=(s.z1+s.z2)/2;
  const a=Math.atan2(best.ex-cx,best.ez-cz);
  g.auto.x=best.ex-Math.sin(a)*30; g.auto.z=best.ez-Math.cos(a)*30; g.auto.a=a; g.auto.v=0;
  step(15);
  window.__noRender=false;
  const wall=await shot();
  return {tracked,flips,gemChildren:gemChildren.length,sampleFlip:[...track.entries()].filter(([i,st])=>st.size>1).slice(0,3).map(([i,st])=>[i,[...st]]),wall,wallAt:[+g.auto.x.toFixed(0),+g.auto.z.toFixed(0)]};
});
writeFileSync('/tmp/wall-approach.png', Buffer.from(r.wall.split(',')[1],'base64'));
console.log(JSON.stringify({tracked:r.tracked,flips:r.flips,gemChildren:r.gemChildren,sampleFlip:r.sampleFlip,wallAt:r.wallAt}));
await b.close();
