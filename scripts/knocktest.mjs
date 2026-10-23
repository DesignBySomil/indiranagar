import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,300)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game,K=window.__keys; g.go(0);
  if(g.applyTime)g.applyTime(12);
  const cvs=document.getElementById('c');
  const shot=async()=>{ await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000;
  const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  // find nearest ped to the auto start
  const P=g.crowd.peds;
  g.auto.x=-133; g.auto.z=-345; g.auto.a=0; g.auto.v=0;
  step(30);
  let best=null,bd=1e9;
  for(const q of P){const d=(q.x-g.auto.x)**2+(q.z-g.auto.z)**2; if(d<bd){bd=d;best=q;}}
  const target={x:best.x,z:best.z};
  // aim and drive at the ped
  const aim=()=>{const ta=Math.atan2(best.x-g.auto.x,best.z-g.auto.z);let d=ta-g.auto.a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;g.auto.a+=Math.max(-0.09,Math.min(0.09,d));};
  let hitFrame=-1,peakKy=0,preX=best.x,preZ=best.z;
  const frames={};
  K.KeyW=true;
  for(let f=0;f<240;f++){
    aim(); step(2);
    if(best.kn&&hitFrame<0){ hitFrame=f; window.__noRender=false; frames.contact=await shot(); window.__noRender=true; }
    if(best.ky>peakKy)peakKy=best.ky;
    if(hitFrame>0&&f===hitFrame+24){ window.__noRender=false; frames.flight=await shot(); window.__noRender=true; }
    if(hitFrame>0&&f===hitFrame+90){ window.__noRender=false; frames.after=await shot(); window.__noRender=true; break; }
  }
  K.KeyW=false;
  return {hitFrame,peakKy:+peakKy.toFixed(2),displaced:+Math.hypot(best.x-preX,best.z-preZ).toFixed(1),recovered:!best.kn,
    frames:{contact:frames.contact,flight:frames.flight,after:frames.after}};
});
for(const k of ['contact','flight','after']) if(r.frames[k]) writeFileSync(`/tmp/knock-${k}.png`, Buffer.from(r.frames[k].split(',')[1],'base64'));
console.log(JSON.stringify({hitFrame:r.hitFrame,peakKy:r.peakKy,displaced:r.displaced,recovered:r.recovered}));
await b.close();
