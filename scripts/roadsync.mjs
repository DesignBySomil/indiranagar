import puppeteer from 'puppeteer-core';
const [,, url, tag] = process.argv;
const POSES=[['r455',-430,207,1.63],['r141',-490,130,2.01],['r412',-460,-740,2.6]].filter(p=>!process.env.ONLY||process.env.ONLY.split(',').includes(p[0]));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
for (const [name,x,z,a] of POSES) {
  const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
  await p.goto(url,{waitUntil:'load'});
  await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
  await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();});
  await new Promise(r=>setTimeout(r,3000));
  const pose=()=>p.evaluate(()=>{const g=window.__game,c=g.camera.position;return {auto:[+g.auto.x.toFixed(2),+g.auto.z.toFixed(2),+g.auto.a.toFixed(2)],cam:[+c.x.toFixed(2),+c.y.toFixed(2),+c.z.toFixed(2)]}});
  await p.evaluate(([x,z,a])=>{const g=window.__game;window.__noRender=true;window.__paused=true;g.auto.x=x;g.auto.z=z;g.auto.a=a;g.auto.v=0;g.auto.steer=0;for(let i=0;i<40;i++)window.__step(0.05,performance.now()+i*50);},[x,z,a]);
  const before=await pose();
  await p.evaluate(()=>{window.__noRender=false;});
  // wait for 4 rAF ticks after the pose is set, then freeze and wait 2 more
  await p.evaluate(()=>new Promise(res=>{let n=0;const f=()=>{if(++n>=4)res();else requestAnimationFrame(f)};requestAnimationFrame(f)}));
  await p.evaluate(()=>{window.__noRender=true;});
  await p.evaluate(()=>new Promise(res=>{let n=0;const f=()=>{if(++n>=3)res();else requestAnimationFrame(f)};requestAnimationFrame(f)}));
  const mid=await pose();
  await p.screenshot({path:`/tmp/sync-${tag}-${name}.png`});
  const after=await pose();
  console.log(tag,name,'BEFORE',JSON.stringify(before),'AT-SHOT',JSON.stringify(mid),'AFTER',JSON.stringify(after));
  await p.close();
}
await b.close();