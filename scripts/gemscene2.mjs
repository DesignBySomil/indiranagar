import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
p.on('console',m=>{const t=m.text();if(t.includes('error')||t.includes('Error'))console.log('CONS',t.slice(0,150));});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
console.log('loaded');
const s1=await p.evaluate(()=>{
  const g=window.__game; g.go(0);
  g.state.hour=12; if(g.applyTime) g.applyTime(12);
  g.auto.x=-94.3; g.auto.z=214; g.auto.a=0; g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<25;k++){t0+=16;window.__step(0.016,t0);}
  window.__noRender=false;
  return 'sim-done';
});
console.log(s1);
const img=await p.evaluate(async()=>{
  const cvs=document.getElementById('c');
  await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r));
  return cvs.toDataURL('image/png');
});
writeFileSync('/tmp/gem-street.png', Buffer.from(img.split(',')[1],'base64'));
console.log('shot-done');
await b.close();
