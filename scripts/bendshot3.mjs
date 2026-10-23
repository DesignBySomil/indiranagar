import puppeteer from 'puppeteer-core';
const [,,OUT]=process.argv;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,400']});
const p=await b.newPage(); await p.setViewport({width:640,height:400});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-500,208,-1.34);
  let t0=90000; for(let k=0;k<40;k++){t0+=33;window.__step(0.033,t0);}
  // bird's-eye of the Appareddy bend: pull the chase camera up high, look at the bend corner
  const cam=g.camera;
  g.state.viewMode='free';
  cam.position.set(-498, 42, 196);
  cam.lookAt(-517, 0, 220);
  window.__noRender=false; t0+=33; window.__step(0.033,t0);
  cam.position.set(-498, 42, 196); cam.lookAt(-517, 0, 220);
  t0+=33; window.__step(0.033,t0);
});
await new Promise(r=>setTimeout(r,1200));
await p.screenshot({path:OUT});
console.log('SAVED',OUT);
await b.close(); process.exit(0);
