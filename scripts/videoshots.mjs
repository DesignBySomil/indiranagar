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
  const g=window.__game;
  const cum=[0];for(let i=1;i<PTS.length;i++)cum.push(cum[i-1]+Math.hypot(PTS[i][0]-PTS[i-1][0],PTS[i][1]-PTS[i-1][1]));
  window.__cum=cum; window.__L=cum[cum.length-1]; window.__PTS=PTS;
  const at=(t)=>{t=Math.max(0,Math.min(window.__L,t));let i=1;while(i<cum.length-1&&cum[i]<t)i++;const f=(t-cum[i-1])/((cum[i]-cum[i-1])||1);return[PTS[i-1][0]+(PTS[i][0]-PTS[i-1][0])*f,PTS[i-1][1]+(PTS[i][1]-PTS[i-1][1])*f]};
  window.__at=at; window.__lastBi=0;
  g.auto.x=-450.5; g.auto.z=208.3; g.auto.a=Math.atan2(-440+450.5,206.5-208.3); g.auto.v=0; g.auto.steer=0;
  for(let k=0;k<60;k++)window.__step(0.05,performance.now());
},PTS);
for(let f=0;f<46;f++){
  const done = await p.evaluate(()=>{
    const g=window.__game,K=window.__keys,PTS=window.__PTS,cum=window.__cum,L=window.__L;
    for(let s=0;s<4;s++){
      let best=1e9,bi=window.__lastBi;const lo=Math.max(0,window.__lastBi-6),hi=Math.min(PTS.length-1,window.__lastBi+50);for(let i=lo;i<=hi;i++){const d=Math.hypot(PTS[i][0]-g.auto.x,PTS[i][1]-g.auto.z);if(d<best){best=d;bi=i}}window.__lastBi=bi;
      const prog=cum[bi];
      if(prog>=L-28){K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;return true}
      const tq=window.__at(prog+7);
      const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
      const vt=Math.abs(err)>0.6?2:Math.abs(err)>0.3?3.5:Math.abs(err)>0.15?5:8;
      K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;
      window.__step(0.05,performance.now());
    }
    return false;
  });
  await p.screenshot({path:'/tmp/vf/f_'+String(f).padStart(3,'0')+'.png'});
  if(done) break;
}
const st = await p.evaluate(()=>{const g=window.__game,c=g.camera.position;return {x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1),camY:+c.y.toFixed(2),dCam:+Math.hypot(c.x-g.auto.x,c.z-g.auto.z).toFixed(2),solid:g.solid(c.x,c.z)?1:0}});
console.error('ENDSTATE '+JSON.stringify(st));
await b.close();
