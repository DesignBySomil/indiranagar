import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();});
await new Promise(r=>setTimeout(r,2500));
const spots=[
 ['pinch-east', -452.0, 209.5, -436.0, 205.5],  // from west of pinch looking east along alley
 ['pinch-inside', -440.5, 207.2, -434.0, 204.8], // inside pinch looking east
 ['mouth-west', -371.5, 203.4, -363.5, 202.2],   // in the channel looking at east mouth
];
for(const [name,cx,cz,tx,tz] of spots){
  await p.evaluate((cx,cz,tx,tz)=>{
    const g=window.__game;
    g.auto.x=cx; g.auto.z=cz; g.auto.a=Math.atan2(tx-cx,tz-cz); g.auto.v=0;
  },cx,cz,tx,tz);
  await new Promise(r=>setTimeout(r,1800));
  await p.screenshot({path:'/tmp/455-'+name+'.png'});
  console.log('shot', name);
}
await b.close();
