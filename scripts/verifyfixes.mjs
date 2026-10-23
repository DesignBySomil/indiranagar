import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  // 1) junction leak: parked solid at the 100 Feet Road lane
  const leak=[];
  for(const [x,z] of [[-96,224],[-96,225.5],[-94.5,225.5],[-96,227],[-94.5,228],[-97.5,226.5]]) leak.push(g.parked.solid(x,z));
  // 2) boundary clamp landing inside the building at (-516.4, 747)
  g.auto.x=-516.4; g.auto.z=800; g.auto.a=0; g.auto.v=0; // z beyond clamp -> clamps to 747
  for(let k=0;k<30;k++){t0+=16;window.__step(0.016,t0);}
  const clamp={x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1),solidAfter:g.solid(g.auto.x,g.auto.z)};
  // 3) si51 median mouth visual: 2nd Main Road at (-150,-711), approach from west heading east
  g.state.hour=12; if(g.applyTime) g.applyTime(12);
  g.auto.x=-162; g.auto.z=-712; g.auto.a=Math.PI/2; g.auto.v=0;
  for(let k=0;k<25;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  const cvs=document.getElementById('c');
  const shot=async()=>{ await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  const img=await shot();
  return {leak,clamp,img};
});
writeFileSync('/tmp/si51-mouth.png', Buffer.from(r.img.split(',')[1],'base64'));
console.log(JSON.stringify({leak:r.leak,clamp:r.clamp}));
await b.close();
