import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2000));
console.log(await p.evaluate(()=>{const g=window.__game;const o=[];for(let z=-750;z<=-712;z+=2){let r='';for(let x=-160;x<=-126;x+=2)r+=window.__inDivider(x,z)?'D':g.solid(x,z)?'#':g.parked.solid(x,z)?'p':'.';o.push(z+' '+r)}return 'x -160..-126 step2\n'+o.join('\n')}));await b.close();
