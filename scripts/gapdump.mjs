import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,900)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const t=window.__traffic();
  const ex=-98.0, ez=215.6;
  const raw=t.__segs.filter(q=>Math.hypot(q.x2-ex,q.z2-ez)<3||Math.hypot(q.x1-ex,q.z1-ez)<3);
  for(const q of raw){
    const len=Math.hypot(q.x2-q.x1,q.z2-q.z1);
    console.log((q.name||'?')+' ('+q.x1.toFixed(1)+','+q.z1.toFixed(1)+')->('+q.x2.toFixed(1)+','+q.z2.toFixed(1)+') len='+len.toFixed(1)+' ow='+(q.oneway?1:0));
  }
  // all segs starting within 25m of exit
  const near=t.__segs.filter(q=>Math.hypot(q.x1-ex,q.z1-ez)<25||Math.hypot(q.x2-ex,q.z2-ez)<25);
  console.log('NEAR:');
  near.slice(0,10).forEach(q=>{
    const d1=Math.hypot(q.x1-ex,q.z1-ez),d2=Math.hypot(q.x2-ex,q.z2-ez);
    console.log('  '+(q.name||'?')+' d1='+d1.toFixed(1)+' d2='+d2.toFixed(1)+' ow='+(q.oneway?1:0)+' ('+q.x1.toFixed(1)+','+q.z1.toFixed(1)+')->('+q.x2.toFixed(1)+','+q.z2.toFixed(1)+')');
  });
});
await b.close(); process.exit(0);
