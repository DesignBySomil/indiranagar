import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
await p.evaluate(()=>{ const g=window.__game; g.go(0); if(g.applyTime)g.applyTime(12);
  g.auto.x=-94.3; g.auto.z=214; g.auto.a=0; g.auto.v=0; window.__noRender=true; let t0=90000;
  for(let k=0;k<25;k++){t0+=16;window.__step(0.016,t0);} window.__noRender=false; });
// warm up shaders
await p.evaluate(()=>new Promise(r=>{let n=0;const l=()=>{if(++n<6)requestAnimationFrame(l);else r();};requestAnimationFrame(l);}));
const d=await p.evaluate(()=>new Promise(res=>{const ds=[];let last=performance.now();const l=()=>{const n=performance.now();ds.push(n-last);last=n;if(ds.length<20)requestAnimationFrame(l);else res(ds);};requestAnimationFrame(l);}));
d.sort((a,b)=>a-b);
console.log(JSON.stringify({medianMs:+d[10].toFixed(1),p90Ms:+d[18].toFixed(1)}));
await b.close();
