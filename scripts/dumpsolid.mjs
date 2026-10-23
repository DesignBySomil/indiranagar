import puppeteer from 'puppeteer-core';
import fs from 'fs';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
const W=[[360,400,10,70],[270,330,-592,-560],[470,630,-575,-490],[500,560,-580,-515]];
const res=await p.evaluate((W)=>{const g=window.__game;return W.map(([x0,x1,z0,z1])=>{const rows=[];for(let z=z0;z<=z1;z+=0.5){let r='';for(let x=x0;x<=x1;x+=0.5)r+=g.solid(x,z)?'1':'0';rows.push(r)}return {x0,x1,z0,z1,rows}})},W);
fs.writeFileSync('/tmp/solid.json',JSON.stringify(res));
await b.close();