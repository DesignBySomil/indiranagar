import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
console.log(await p.evaluate(()=>{const w=window.__world||window.__game.world;for(const bd of w.buildings){const xs=bd.p.map(q=>q[0]);if(bd.p.length==13&&Math.min(...xs)<-430&&Math.min(...xs)>-431)return JSON.stringify(bd.p)+' noMesh '+bd.noMesh}}));await b.close();
