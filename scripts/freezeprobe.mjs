import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.setViewport({width:320,height:180});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  window.__spawnAt(-126.5,-260,0); // south of the suspect queue point (-126.5,-221), facing north
  let t0=90000; for(let k=0;k<300;k++){t0+=33;window.__step(0.033,t0);}
  const units=(window.__traffic?window.__traffic().units:[])||[];
  const near=units.filter(u=>Math.hypot(u.x-(-126.5),u.z-(-221))<60).map(u=>({type:u.td&&u.td.key,v:+u.speed.toFixed(2),t:+u.t.toFixed(3),dir:u.dir,seg:u.seg&&u.seg.name||'',wreck:!!u.wreck,held:u.__held||0,why:u.__why||''}));
  return {trc:window.__trc||null, nearQueue:near.slice(0,14), total:units.length};
});
console.log('RESULT '+JSON.stringify(r));
await b.close(); process.exit(0);
