import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,,OUT]=process.argv;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,400']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.setViewport({width:640,height:400});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const data=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-500,208,-1.34);
  let t0=90000; for(let k=0;k<40;k++){t0+=33;window.__step(0.033,t0);}
  const cam=g.camera;
  cam.position.set(-498, 46, 194);
  cam.lookAt(-517, 0, 220);
  cam.updateMatrixWorld(true);
  window.__renderer.render(window.__scene, cam);
  return window.__renderer.domElement.toDataURL('image/jpeg',0.85);
});
fs.writeFileSync(OUT, Buffer.from(data.split(',')[1],'base64'));
console.log('SAVED',OUT);
await b.close(); process.exit(0);
