import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=18.4; if(g.applyTime)g.applyTime(18.4);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  g.auto.x=-388; g.auto.z=-227; g.auto.a=Math.PI*0.75; g.auto.v=0; // face SW toward building row at -401..-409,-239
  step(40);
  const frames=[];
  window.__noRender=false; frames.push(await cap()); window.__noRender=true;
  return {frames,gantry:[-401,-239]};
});
for(let i=0;i<r.frames.length;i++) writeFileSync(`/tmp/quad-${String(i).padStart(2,'0')}.png`, Buffer.from(r.frames[i].split(',')[1],'base64'));
console.log(JSON.stringify({n:r.frames.length,gantry:r.gantry}));
await b.close();
