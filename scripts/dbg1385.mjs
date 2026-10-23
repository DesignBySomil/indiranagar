import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;
 g.auto.x=522.5;g.auto.z=-540;g.auto.a=Math.PI;g.auto.v=0;for(let i=0;i<40;i++)window.__step(0.05,performance.now()+i*50);
 const a=g.auto;let row=[];for(let dz=-8;dz<=8;dz+=1){let r='';for(let dx=-5;dx<=5;dx+=1)r+=g.solid(a.x+dx,a.z+dz)?'#':'.';row.push(r)}
 return {x:a.x,z:a.z,ang:a.a,row}})));
await b.close();