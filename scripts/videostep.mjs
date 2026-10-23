import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';
const PTS = JSON.parse(readFileSync('graze455e.mjs','utf8').match(/const PTS=(\[\[.*?\]\]);/s)[1]);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:120000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__paused=true;window.__noRender=false});
await new Promise(r=>setTimeout(r,2500));
await p.evaluate((PTS)=>{
  const g=window.__game,K=window.__keys;
  const cum=[0];for(let i=1;i<PTS.length;i++)cum.push(cum[i-1]+Math.hypot(PTS[i][0]-PTS[i-1][0],PTS[i][1]-PTS[i-1][1]));
  const L=cum[cum.length-1];
  const at=(t)=>{t=Math.max(0,Math.min(L,t));let i=1;while(i<cum.length-1&&cum[i]<t)i++;const f=(t-cum[i-1])/((cum[i]-cum[i-1])||1);return[PTS[i-1][0]+(PTS[i][0]-PTS[i-1][0])*f,PTS[i-1][1]+(PTS[i][1]-PTS[i-1][1])*f]};
  g.auto.x=-450.5; g.auto.z=208.3; g.auto.a=Math.atan2(-440+450.5,206.5-208.3); g.auto.v=0; g.auto.steer=0;
  window.__camLog=[]; window.__driveDone=false; let lastBi=0,lastY=null;
  for(let k=0;k<60;k++)window.__step(0.05,performance.now()); // settle camera behind auto
  window.__ap=setInterval(()=>{
    let best=1e9,bi=lastBi;const lo=Math.max(0,lastBi-6),hi=Math.min(PTS.length-1,lastBi+50);for(let i=lo;i<=hi;i++){const d=Math.hypot(PTS[i][0]-g.auto.x,PTS[i][1]-g.auto.z);if(d<best){best=d;bi=i}}lastBi=bi;
    const prog=cum[bi];
    if(prog>=L-28){K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;window.__driveDone=true;return}
    const tq=at(prog+7);
    const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
    const vt=Math.abs(err)>0.6?2:Math.abs(err)>0.3?3.5:Math.abs(err)>0.15?5:8;
    K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;
    window.__step(0.05,performance.now());
    const c=g.camera.position,d=Math.hypot(c.x-g.auto.x,c.z-g.auto.z);
    const dy=lastY===null?0:+(c.y-lastY).toFixed(3); lastY=c.y;
    window.__camLog.push({dCam:+d.toFixed(2),y:+c.y.toFixed(2),dy,inSolid:g.solid(c.x,c.z)?1:0});
  },50);
},PTS);
await new Promise(r=>setTimeout(r,1500));
const rec = await p.screencast({path:'/tmp/alley-step.webm'});
console.error('REC-START');
for(let i=0;i<35;i++){
  await new Promise(r=>setTimeout(r,1500));
  if(await p.evaluate(()=>window.__driveDone)) break;
}
await p.evaluate(()=>{for(let k=0;k<40;k++)window.__step(0.05,performance.now())});
await new Promise(r=>setTimeout(r,1500));
await rec.stop();
console.error('REC-STOP');
const stats = await p.evaluate(()=>{const L=window.__camLog;let maxDY=0,solid=0,lift=0,minD=1e9,maxY=0;for(const e of L){if(Math.abs(e.dy)>maxDY)maxDY=Math.abs(e.dy);if(e.inSolid)solid++;if(e.dCam<4.2)lift++;if(e.dCam<minD)minD=e.dCam;if(e.y>maxY)maxY=e.y}return {steps:L.length,liftSteps:lift,solidHits:solid,maxDYperStep:maxDY,minDCam:+minD.toFixed(2),maxCamY:+maxY.toFixed(2)}});
console.error('CAMSTATS '+JSON.stringify(stats));
await b.close();
