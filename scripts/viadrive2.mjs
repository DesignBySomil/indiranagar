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
  // CMH Road westbound->east drive: carriageway centerline z = -242.5 - 0.027*(x+840)
  g.auto.x=-845; g.auto.z=-242.5; g.auto.a=Math.PI/2; g.auto.v=0;
  step(40);
  K.KeyW=true;
  const frames=[]; window.__noRender=false; frames.push(await cap()); window.__noRender=true;
  for(let k=1;k<10;k++){
    for(let s2=0;s2<22;s2++){
      const tz=-242.5-0.027*(g.auto.x+840);
      const err=tz-g.auto.z;
      const ta=Math.PI/2+Math.max(-0.35,Math.min(0.35,-err*0.12));
      let d=ta-g.auto.a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
      g.auto.a+=Math.max(-0.04,Math.min(0.04,d));
      step(1);
    }
    window.__noRender=false; frames.push(await cap()); window.__noRender=true;
  }
  K.KeyW=false;
  return {frames,x:+g.auto.x.toFixed(0),z:+g.auto.z.toFixed(1)};
});
for(let i=0;i<r.frames.length;i++) writeFileSync(`/tmp/vb-${String(i).padStart(2,'0')}.png`, Buffer.from(r.frames[i].split(',')[1],'base64'));
console.log(JSON.stringify({n:r.frames.length,x:r.x,z:r.z}));
await b.close();
