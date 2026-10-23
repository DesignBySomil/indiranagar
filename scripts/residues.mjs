import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  // residue (a): solid profile around (-516.4, 744..758) — boundary wall?
  const prof=[];
  for(let z=742;z<=760;z+=1) prof.push([z, g.solid(-516.4,z)?1:0, g.solid(-510,z)?1:0, g.solid(-525,z)?1:0, g.solid(-540,z)?1:0]);
  // residue (b): place at (-611,-710), hold W, check DOM overlays + state
  g.auto.x=-611; g.auto.z=-710; g.auto.a=0; g.auto.v=0;
  window.__keys['KeyW']=true;
  const trace=[];
  for(let k=0;k<200;k++){ t0+=16; window.__step(0.016,t0); if(k%40===0) trace.push({v:+g.auto.v.toFixed(2),x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1)}); }
  window.__keys['KeyW']=false;
  const dom={start:!!document.querySelector('#start.on'), card:!!document.querySelector('#card.on'), toast:document.getElementById('toast')?.innerText||'', paused:!!window.__paused};
  const freeAtSpot=!g.solid(-611,-710);
  window.__noRender=false;
  return {prof,trace,dom,freeAtSpot};
});
console.log(JSON.stringify(r));
await b.close();
