import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=150',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  const A=g.auto, K=window.__keys;
  let t0=90000; window.__noRender=true;
  const step=()=>{t0+=33;window.__step(0.033,t0);};
  for(let k=0;k<30;k++) step(); // let traffic settle at natural game spawn first
  window.__spawnAt(321,563.4,Math.PI); // face south (dz negative -> atan2(0,-1)=PI)
  const afterSpawn=[+A.x.toFixed(2),+A.z.toFixed(2),+A.a.toFixed(2)];
  const log=[[0,+A.x.toFixed(1),+A.z.toFixed(1),+A.v.toFixed(1)]];
  // hold W only, no steering - pure straight-line behavior
  K.KeyW=true;
  for(let k=0;k<450;k++){ step(); if(k%30===0) log.push([+(k*0.033).toFixed(1),+A.x.toFixed(1),+A.z.toFixed(1),+A.v.toFixed(1)]); }
  K.KeyW=false;
  return {afterSpawn,log,solidAtSpawn:window.__solid(321,563.4)};
});
console.log(JSON.stringify(out));
await b.close(); process.exit(0);
