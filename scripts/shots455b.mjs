import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:240000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();});
await new Promise(r=>setTimeout(r,2500));
const spots=[
 ['west-approach', -458.5, 208.7, -440.0, 206.5],
 ['east-mouth', -361.5, 202.0, -368.0, 202.9],
 ['mid-channel', -376.0, 203.1, -366.0, 202.5],
];
for(const [name,cx,cz,tx,tz] of spots){
  await p.evaluate((cx,cz,tx,tz)=>{const g=window.__game;window.__noRender=true;g.auto.x=cx;g.auto.z=cz;g.auto.a=Math.atan2(tx-cx,tz-cz);g.auto.v=0;},cx,cz,tx,tz);
  await p.evaluate(()=>{window.__noRender=false;}); await new Promise(r=>setTimeout(r,9000));
  await p.evaluate(()=>{window.__noRender=true;});
  await p.screenshot({path:'/tmp/455b-'+name+'.png'});
  console.log('shot', name);
}
await b.close();
