import puppeteer from 'puppeteer-core';
const url = process.env.URL || 'http://localhost:4180/';
const steps = +(process.env.STEPS||900);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PE',String(e).slice(0,150)));
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate((steps)=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  window.__spawnAt(-203,-708,Math.atan2(-9,7));
  let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}};
  stp(40); window.__recLog=[]; window.__trc.recycled=0; window.__trc.held=0;
  stp(steps);
  const R=window.__recLog||[];
  const byWhy={}; const sites={};
  for(const e of R){ byWhy[e.why]=(byWhy[e.why]||0)+1; const k=e.why+' @ '+e.x+','+e.z; sites[k]=(sites[k]||0)+1; }
  const top=Object.entries(sites).sort((a,b)=>b[1]-a[1]).slice(0,12);
  return {n:R.length, byWhy, top, recycled:window.__trc.recycled, held:window.__trc.held};
}, steps);
console.log('RECPROBE', JSON.stringify(r));
await b.close(); process.exit(0);
