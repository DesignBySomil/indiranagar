import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:400000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game,K=window.__keys; g.go(0);
  g.state.hour=12; if(g.applyTime)g.applyTime(12);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  g.auto.x=-133; g.auto.z=-345; g.auto.a=0; g.auto.v=0;
  step(30);
  // nearest traffic unit, ram from behind (stays in chase-cam frame)
  const units=g.traffic.units;
  let tgt=null,bd=1e9;
  for(const u of units){const d=Math.hypot(u.x-g.auto.x,u.z-g.auto.z);if(d<bd){bd=d;tgt=u;}}
  if(!tgt) return {hit:false,frames:[],err:'no traffic'};
  K.KeyW=true;
  // approach: aim at a point 3m short, then straight into it
  let hit=false;
  for(let f=0;f<400;f++){
    const ta=Math.atan2(tgt.x-g.auto.x,tgt.z-g.auto.z);let d=ta-g.auto.a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
    g.auto.a+=Math.max(-0.07,Math.min(0.07,d));
    step(2);
    const dd=Math.hypot(tgt.x-g.auto.x,tgt.z-g.auto.z);
    if(dd<3.4){hit=true;break;}
  }
  K.KeyW=false;
  const frames=[];
  if(hit){ window.__noRender=false;
    for(let k=0;k<12;k++){ frames.push(await cap()); window.__noRender=true; step(2); window.__noRender=false; }
  }
  return {hit,frames,tgt:[+tgt.x.toFixed(0),+tgt.z.toFixed(0)],ky:tgt.ky};
});
if(r.hit){ for(let i=0;i<r.frames.length;i++) writeFileSync(`/tmp/car-${String(i).padStart(2,'0')}.png`, Buffer.from(r.frames[i].split(',')[1],'base64')); }
console.log(JSON.stringify({hit:r.hit,frames:r.frames.length,tgt:r.tgt}));
await b.close();
