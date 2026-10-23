import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const [,,px,pz,pa,out]=process.argv;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const f=await p.evaluate(async(px,pz,pa)=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  const A=g.auto;
  window.__spawnAt(px,pz,pa);
  window.__noRender=true; let t0=90000;
  for(let k=0;k<40;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false;
  await new Promise(r=>requestAnimationFrame(r));
  return document.getElementById('c').toDataURL('image/jpeg',0.82);
},+px,+pz,+pa);
writeFileSync(out,Buffer.from(f.split(',')[1],'base64'));
console.log('OK',out);
await b.close(); process.exit(0);
