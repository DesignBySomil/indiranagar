import puppeteer from 'puppeteer-core';
const [,, url, tag] = process.argv;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
await p.goto(url,{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();});
await new Promise(r=>setTimeout(r,3000));
for (const [name,x,z,a,v] of [['100ft',-35.7,500,0,0],['speed',-35.7,500,0,12],['lane',601,-545,Math.PI,0]]) {
  await p.evaluate(([x,z,a,v])=>{const g=window.__game;window.__noRender=true;window.__paused=true;g.auto.x=x;g.auto.z=z;g.auto.a=a;g.auto.v=v;g.auto.steer=0;window.__keys.KeyW=v>0;for(let i=0;i<40;i++)window.__step(0.05,performance.now()+i*50);window.__keys.KeyW=false;},[x,z,a,v]);
  await p.evaluate(()=>{window.__noRender=false;}); await new Promise(r=>setTimeout(r,9000));
  await p.evaluate(()=>{window.__noRender=true;});
  const cam = await p.evaluate(()=>{const g=window.__game,c=g.camera.position;return {d:Math.hypot(c.x-g.auto.x,c.z-g.auto.z).toFixed(1),h:c.y.toFixed(1)}});
  console.log(tag,name,JSON.stringify(cam));
  await p.screenshot({path:`/tmp/cam-${tag}-${name}.png`});
}
await b.close();