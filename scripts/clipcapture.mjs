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
  const P=g.crowd.peds; let best=null,bd=1e9;
  for(const q of P){const d=(q.x-g.auto.x)**2+(q.z-g.auto.z)**2; if(d<bd){bd=d;best=q;}}
  K.KeyW=true; let hit=false;
  for(let f=0;f<240;f++){
    const ta=Math.atan2(best.x-g.auto.x,best.z-g.auto.z);let d=ta-g.auto.a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
    g.auto.a+=Math.max(-0.09,Math.min(0.09,d));
    step(2);
    if(best.kn){hit=true;break;}
  }
  const frames=[];
  if(hit){ window.__noRender=false;
    for(let k=0;k<11;k++){ frames.push(await cap()); window.__noRender=true; step(2); window.__noRender=false; }
  }
  return {hit,frames};
});
if(r.hit){ for(let i=0;i<r.frames.length;i++) writeFileSync(`/tmp/clip-${String(i).padStart(2,'0')}.png`, Buffer.from(r.frames[i].split(',')[1],'base64')); }
console.log(JSON.stringify({hit:r.hit,frames:r.frames.length}));
await b.close();
