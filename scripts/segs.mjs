import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360'] });
const p = await b.newPage(); await p.goto(process.env.URL,{waitUntil:'load'});
await p.waitForFunction('window.__game && window.__step',{timeout:180000});
const o = await p.evaluate(()=>window.__game.roadSegs().filter(s=>(s.name||'').includes('Chinmaya')).map(s=>[Math.round(s.x1),Math.round(s.z1),Math.round(s.x2),Math.round(s.z2),s.width]));
console.log(JSON.stringify(o)); await b.close();
