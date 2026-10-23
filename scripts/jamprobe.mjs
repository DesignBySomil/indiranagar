import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__noRender=true;
  const JX=-106,JZ=-69;
  const sample=()=>{
    const t=window.__traffic(); if(!t||!t.units) return null;
    return t.units.filter(u=>Math.hypot(u.x-JX,u.z-JZ)<45).map(u=>({x:+u.x.toFixed(1),z:+u.z.toFixed(1),v:+(u.v??u.speed??-1).toFixed(1)}));
  };
  let t0=90000; for(let k=0;k<300;k++){t0+=33;window.__step(0.033,t0);} // 10s settle
  const s0=sample();
  for(let k=0;k<600;k++){t0+=33;window.__step(0.033,t0);} // +20s
  const s1=sample();
  for(let k=0;k<600;k++){t0+=33;window.__step(0.033,t0);} // +20s
  const s2=sample();
  return {n0:s0&&s0.length,n1:s1&&s1.length,n2:s2&&s2.length,s0:s0&&s0.slice(0,14),s2:s2&&s2.slice(0,14)};
});
console.log(JSON.stringify(out));
await b.close(); process.exit(0);
