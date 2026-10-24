import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(process.env.URL||'http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  window.__spawnAt(-203,-708,Math.atan2(-9,7));
  let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}};
  stp(40);
  const units=window.__traffic().units;
  const last=new Map(); const flips=new Map();
  for(let k=0;k<2500;k++){ stp(1);
    for(const u of units){ const pr=last.get(u);
      if(pr && u.dir!==pr.dir){ if(!flips.has(u)) flips.set(u,[]); const a=flips.get(u); if(a.length<40) a.push([k,+u.x.toFixed(1),+u.z.toFixed(1),u.seg?u.seg.name:'',u.seg?[+u.seg.x1.toFixed(1),+u.seg.z1.toFixed(1),+u.seg.x2.toFixed(1),+u.seg.z2.toFixed(1)]:null]); }
      last.set(u,{x:u.x,z:u.z,dir:u.dir}); } }
  const out=[...flips.entries()].filter(([,a])=>a.length>10).map(([u,a])=>({n:a.length,first:a[0],last:a[a.length-1],sample:a.slice(0,6)}));
  return out;
});
console.log('OSCPOS',JSON.stringify(r,null,1));
await b.close(); process.exit(0);
