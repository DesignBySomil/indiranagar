import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PE',String(e).slice(0,150)));
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(process.env.URL||'http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  window.__spawnAt(-203,-708,Math.atan2(-9,7));
  let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}};
  stp(40);
  const units=window.__traffic().units;
  const last=new Map(); const flips=new Map(); const hops=[]; let laneFlips=[];
  for(let k=0;k<2500;k++){
    stp(1);
    for(const u of units){
      const pr=last.get(u);
      if(pr){
        const j=Math.hypot(u.x-pr.x,u.z-pr.z);
        if(j>3.5) hops.push({k,j:+j.toFixed(1),from:[+pr.x.toFixed(0),+pr.z.toFixed(0)],to:[+u.x.toFixed(0),+u.z.toFixed(0)],seg:u.seg?u.seg.name:'',d:+Math.hypot(u.x-g.auto.x,u.z-g.auto.z).toFixed(0)});
        if(u.dir!==pr.dir){ flips.set(u,(flips.get(u)||0)+1); }
      }
      last.set(u,{x:u.x,z:u.z,dir:u.dir});
    }
  }
  const trc=window.__trc?{trans:window.__trc.trans,failNext:window.__trc.failNext,failJump:window.__trc.failJump,realFail:window.__trc.realFail||0,held:window.__trc.held,recycled:window.__trc.recycled}:null;
  const flipCounts=[...flips.values()]; const osc=flipCounts.filter(c=>c>10).length;
  const nearHops=hops.filter(h=>h.d<120);
  let overlap=0; for(const u of units){if(Math.hypot(u.x-g.auto.x,u.z-g.auto.z)<2.5)overlap++;}
  return {trc, totalHopsOver3_5:hops.length, nearHops:nearHops.length, nearSample:nearHops.slice(0,8), unitsFlipped:flipCounts.length, oscillatingUnits:osc, maxFlips:flipCounts.length?Math.max(...flipCounts):0, playerOverlapNow:overlap};
});
console.log('REG',JSON.stringify(r));
await b.close(); process.exit(0);
