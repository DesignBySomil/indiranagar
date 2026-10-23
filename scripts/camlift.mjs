import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:240000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();});
await new Promise(r=>setTimeout(r,2500));
const spots=[
 ['pinch-inside', -440.5, 207.2, -434.0, 204.8],
 ['mid-channel',  -376.0, 203.1, -366.0, 202.5],
 ['pinch-east',   -452.0, 209.5, -436.0, 205.5],
];
for(const [name,cx,cz,tx,tz] of spots){
  await p.evaluate((cx,cz,tx,tz)=>{const g=window.__game;window.__noRender=true;g.auto.x=cx;g.auto.z=cz;g.auto.a=Math.atan2(tx-cx,tz-cz);g.auto.v=0;},cx,cz,tx,tz);
  await p.evaluate(()=>{window.__noRender=false;}); await new Promise(r=>setTimeout(r,9000));
  const st = await p.evaluate(()=>{const g=window.__game;const c=g.camera.position;const d=Math.hypot(c.x-g.auto.x,c.z-g.auto.z);
    return {camX:+c.x.toFixed(2), camY:+c.y.toFixed(2), camZ:+c.z.toFixed(2), dCam:+d.toFixed(2), camInSolid:g.solid(c.x,c.z), autoX:+g.auto.x.toFixed(1), autoZ:+g.auto.z.toFixed(1)};});
  console.log(name, JSON.stringify(st));
  await p.evaluate(()=>{window.__noRender=true;});
  await p.screenshot({path:'/tmp/camlift-'+name+'.png'});
}
await b.close();
