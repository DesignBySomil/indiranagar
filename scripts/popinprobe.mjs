import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--disable-gpu','--window-size=320,180']});
const p=await b.newPage(); await p.setViewport({width:320,height:180});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step&&window.__peds,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  window.__spawnAt(-260,-140,1.57);
  const prev=new Map();
  const jumps=[]; let t0=90000;
  for(let k=0;k<600;k++){t0+=33; window.__step(0.033,t0);
    const a=g.auto; const hx=Math.sin(a.a), hz=Math.cos(a.a);
    for(const pd of window.__peds){
      const pr=prev.get(pd.id);
      if(pr){const d=Math.hypot(pd.x-pr.x,pd.z-pr.z);
        if(d>30){const dx=pd.x-a.x,dz=pd.z-a.z;const dist=Math.hypot(dx,dz);const dot=dist>1?(dx*hx+dz*hz)/dist:0;
          jumps.push({id:pd.id,dist:+dist.toFixed(1),dot:+dot.toFixed(2),inView:dist<80&&dot>0.5});}}
      prev.set(pd.id,{x:pd.x,z:pd.z});
    }}
  const near=window.__peds.filter(pd=>Math.hypot(pd.x-g.auto.x,pd.z-g.auto.z)<100).length;
  return {totalJumps:jumps.length, inViewJumps:jumps.filter(j=>j.inView).length, sample:jumps.slice(0,6), nearPeds100m:near};
});
console.log(JSON.stringify(r));
await b.close(); process.exit(0);
