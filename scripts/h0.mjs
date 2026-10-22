import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
console.log(await p.evaluate(()=>{const w=window.__world||window.__game.world;const h={};let z=0;for(const b of w.buildings){if(!b.h)z++;}return 'n '+w.buildings.length+' h0 '+z}));await b.close();
