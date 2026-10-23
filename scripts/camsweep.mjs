import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:300000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto(process.argv[2],{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
const ARGS=[Number(process.argv[3]||0),Number(process.argv[4]||60),Number(process.argv[5]||8)];
console.log(JSON.stringify(await p.evaluate(([off,stride,max])=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;
 const S=g.roadSegs().filter(s=>Math.hypot(s.x2-s.x1,s.z2-s.z1)>15);let n=0,bad=0,min=99,inb=[];
 for(let i=off,c=0;i<S.length&&c<max;i+=stride,c++){const s=S[i];const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);const a=Math.atan2(s.x2-s.x1,s.z2-s.z1);
  g.auto.x=s.x1+(s.x2-s.x1)*0.5;g.auto.z=s.z1+(s.z2-s.z1)*0.5;g.auto.a=a;g.auto.v=0;g.auto.steer=0;
  for(let k=0;k<14;k++)window.__step(0.05,performance.now()+k*50);
  const c=g.camera.position;n++;if(g.solid(c.x,c.z)&&c.y<12){bad++;if(inb.length<5)inb.push([s.id,c.x.toFixed(0),c.z.toFixed(0),c.y.toFixed(1)]);}}
 return {sampled:n,cameraInsideSolidFootprintBelow12m:bad,examples:inb};},ARGS)));
await b.close();
