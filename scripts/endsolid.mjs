import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
console.log(await p.evaluate(()=>{const g=window.__game;let o=[];for(const [x,z0,z1] of [[-430,-262,-246],[-428,-262,-246],[-297,-264,-248],[-299,-264,-248]]){let r='';for(let z=z0;z<=z1;z+=1)r+=g.solid(x,z)?'#':'.';o.push(x+' '+r)}return o.join('\n')}));await b.close();
