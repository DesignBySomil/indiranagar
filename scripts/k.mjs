import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(await p.evaluate(()=>{const g=window.__game;const u=g.traffic.units[0];return Object.keys(u).join(',')+' | '+g.traffic.units.length+' | '+JSON.stringify(Object.fromEntries(Object.entries(u).filter(([k,v])=>typeof v=='number')))}));await b.close();
