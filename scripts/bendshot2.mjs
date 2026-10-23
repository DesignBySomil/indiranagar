import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,,X,Z,A,OUT]=process.argv;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const data=await p.evaluate(async(x,z,a)=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(x,z,a);
  let t0=90000; for(let k=0;k<40;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false; t0+=33; window.__step(0.033,t0);
  const c=window.__renderer.domElement;
  return c.toDataURL('image/jpeg',0.85);
}, +X, +Z, +A);
fs.writeFileSync(OUT, Buffer.from(data.split(',')[1], 'base64'));
console.log('SAVED',OUT);
await b.close(); process.exit(0);
