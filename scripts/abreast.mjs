import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-118,330,0);
  window.__noRender=true; let t0=90000;
  for(let k=0;k<600;k++){t0+=33;window.__step(0.033,t0);} // 20s traffic settle
  window.__noRender=false;
  await new Promise(r=>requestAnimationFrame(r));
  const A=g.auto;
  const segs=g.roadSegs();
  const segOf=(x,z)=>{let bd=1e9,bs=null;
    for(const s of segs){const mx=(s.x1+s.x2)/2,mz=(s.z1+s.z2)/2;const d=Math.hypot(mx-x,mz-z);if(d<bd){bd=d;bs=s;}}
    return [bd,bs];};
  // traffic units: find the traffic system's unit list
  const units=[];
  const tr=window.__trafficUnits||null;
  const img=document.getElementById('c').toDataURL('image/jpeg',0.82);
  return {car:{x:+A.x.toFixed(0),z:+A.z.toFixed(0)},img,hasUnits:!!tr};
});
writeFileSync('/downloads/hundredft-settle.jpg',Buffer.from(r.img.split(',')[1],'base64'));
console.log('car',JSON.stringify(r.car),'unitsExposed',r.hasUnits);
await b.close(); process.exit(0);
