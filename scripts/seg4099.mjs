import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>{const S=window.__game.roadSegs();const s=S[4099];return {x1:s.x1,z1:s.z1,x2:s.x2,z2:s.z2,name:s.name,w:s.width}})));
await b.close();
