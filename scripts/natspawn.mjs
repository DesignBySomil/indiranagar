import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:120000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000});
const r=await p.evaluate(()=>{const A=window.__game.auto;const s=window.__traffic&&window.__game;const seg=window.__placeOnRoad(A.x,A.z);return {x:+A.x.toFixed(1),z:+A.z.toFixed(1),a:+A.a.toFixed(2),solid:!!window.__solid(A.x,A.z)};});
console.log(JSON.stringify(r));
await b.close(); process.exit(0);
