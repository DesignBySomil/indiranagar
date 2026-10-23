import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';
const PTS = JSON.parse(readFileSync('graze455e.mjs','utf8').match(/const PTS=(\[\[.*?\]\]);/s)[1]);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
await p.evaluate((PTS)=>{
  const g=window.__game,K=window.__keys;
  const cum=[0];for(let i=1;i<PTS.length;i++)cum.push(cum[i-1]+Math.hypot(PTS[i][0]-PTS[i-1][0],PTS[i][1]-PTS[i-1][1]));
  const L=cum[cum.length-1];
  const at=(t)=>{t=Math.max(0,Math.min(L,t));let i=1;while(i<cum.length-1&&cum[i]<t)i++;const f=(t-cum[i-1])/((cum[i]-cum[i-1])||1);return[PTS[i-1][0]+(PTS[i][0]-PTS[i-1][0])*f,PTS[i-1][1]+(PTS[i][1]-PTS[i-1][1])*f]};
  window.__camStats=[];
  for(const dir of [1,-1]){
    const s0=dir>0?at(0):at(L),s1=dir>0?at(2):at(L-2);
    g.auto.x=s0[0];g.auto.z=s0[1];g.auto.a=Math.atan2(s1[0]-s0[0],s1[1]-s0[1]);g.auto.v=0;g.auto.steer=0;
    let minD=1e9,maxY=-1e9,solidHits=0,liftSteps=0,steps=0,maxDY=0,lastY=null,prog=0,lastBi=dir>0?0:PTS.length-1;
    for(let n=0;n<4000;n++){
      let best=1e9,bi=lastBi;const lo=Math.max(0,lastBi-6),hi=Math.min(PTS.length-1,lastBi+50);for(let i=lo;i<=hi;i++){const d=Math.hypot(PTS[i][0]-g.auto.x,PTS[i][1]-g.auto.z);if(d<best){best=d;bi=i}}lastBi=bi;
      prog=dir>0?cum[bi]:L-cum[bi];
      const tq=at(dir>0?cum[bi]+7:cum[bi]-7);
      const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
      const vt=Math.abs(err)>0.6?1.5:Math.abs(err)>0.3?3:Math.abs(err)>0.15?5:7;
      K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;
      window.__step(0.05,performance.now()); steps++;
      const c=g.camera.position, dC=Math.hypot(c.x-g.auto.x,c.z-g.auto.z);
      if(dC<minD)minD=dC; if(c.y>maxY)maxY=c.y;
      if(g.solid(c.x,c.z))solidHits++;
      if(dC<4.2)liftSteps++;
      if(lastY!==null){const dy=Math.abs(c.y-lastY);if(dy>maxDY)maxDY=dy}
      lastY=c.y;
      if(prog>=L-2)break;
    }
    K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;
    window.__camStats.push({dir,steps,prog:+prog.toFixed(1),L:+L.toFixed(0),minDCam:+minD.toFixed(2),maxCamY:+maxY.toFixed(2),camSolidHits:solidHits,liftSteps,maxStepDY:+maxDY.toFixed(3),autoPos:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)]});
  }
},PTS);
// screenshots mid-pinch (dir 1 auto ended east; teleport back to pinch and drive a few steps with render on)
await p.evaluate(()=>{const g=window.__game;g.auto.x=-444.5;g.auto.z=207.2;g.auto.a=Math.atan2(-434+444.5,204.8-207.2);g.auto.v=0;window.__keys.KeyW=true;for(let i=0;i<60;i++)window.__step(0.05,performance.now());});
await p.evaluate(()=>{window.__noRender=false}); await new Promise(r=>setTimeout(r,4000));
await p.screenshot({path:'/tmp/camdrive-pinch.png'});
await p.evaluate(()=>{window.__noRender=true;const g=window.__game;g.auto.x=-380;g.auto.z=203.05;g.auto.a=Math.atan2(-366+380,202.5-203.05);g.auto.v=0;for(let i=0;i<60;i++)window.__step(0.05,performance.now());});
await p.evaluate(()=>{window.__noRender=false}); await new Promise(r=>setTimeout(r,4000));
await p.screenshot({path:'/tmp/camdrive-channel.png'});
const stats = await p.evaluate(()=>window.__camStats);
for(const s of stats) console.log(JSON.stringify(s));
await b.close();
