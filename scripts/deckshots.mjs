import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:120000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__paused=true;window.__noRender=false});
await new Promise(r=>setTimeout(r,2500));
const spots=[['station-crush',-413.1,-244.4,Math.PI],['footbridge-crush',-349.4,-267.5,Math.PI]];
for(const [name,x,z,a] of spots){
  const st = await p.evaluate((x,z,a)=>{const g=window.__game;g.auto.x=x;g.auto.z=z;g.auto.a=a;g.auto.v=0;g.auto.steer=0;
    for(let k=0;k<90;k++)window.__step(0.05,performance.now());
    const c=g.camera.position;return {camY:+c.y.toFixed(2),dCam:+Math.hypot(c.x-g.auto.x,c.z-g.auto.z).toFixed(2),inSolid:g.solid(c.x,c.z)?1:0}},x,z,a);
  console.error(name.toUpperCase()+' '+JSON.stringify(st));
  await p.screenshot({path:'/tmp/deck-'+name+'.png'});
}
await b.close();
