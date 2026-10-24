import puppeteer from 'puppeteer-core';
const url = process.env.URL || 'http://localhost:4180/';
const tag = process.env.TAG || 'after';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=800,450']});
const p=await b.newPage(); await p.setViewport({width:800,height:450});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const poses=[
 ['mouth', -482,-762, Math.atan2(-470-(-482),-748-(-762))],
 ['pocket', -470,-751, Math.atan2(-464-(-470),-736-(-751))],
 ['corner', -464,-744, Math.atan2(-449-(-464),-762-(-744))],
 ['tail', -446,-757, Math.atan2(-444-(-446),-778-(-757))],
];
for (const [nm,x,z,yaw] of poses){
  await p.evaluate((x,z,yaw)=>{ const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=false; window.__noCardUntil=performance.now()+600000; window.__spawnAt(x,z,yaw); let T=90000; for(let i=0;i<50;i++){T+=33;window.__step(0.033,T);} }, x,z,yaw);
  await p.screenshot({path:`/tmp/${tag}_${nm}.png`});
  console.log('shot',nm);
}
await b.close(); process.exit(0);
