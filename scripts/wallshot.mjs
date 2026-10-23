import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const img=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=12; if(g.applyTime)g.applyTime(12);
  g.auto.x=-100; g.auto.z=724; g.auto.a=0; g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<20;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false;
  await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r));
  return document.getElementById('c').toDataURL('image/png');
});
writeFileSync('/tmp/wall-night.png', Buffer.from(img.split(',')[1],'base64'));
console.log('ok');
await b.close();
