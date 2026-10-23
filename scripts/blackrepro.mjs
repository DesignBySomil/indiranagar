import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:600000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:960,height:600});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game; g.state.hour=0; g.state.auto=false; g.go(); window.__paused=true;});
await new Promise(r=>setTimeout(r,1500));
const res=await p.evaluate(()=>{
  const g=window.__game,K=window.__keys;
  let ri=-1,bd=1e9;
  g.world.roads.forEach((r,i)=>{ r.p.forEach(pt=>{ const d=Math.hypot(pt[0]+136,pt[1]+400); if(d<bd){bd=d;ri=i;} }); });
  const raw=g.world.roads[ri].p;
  const ib=raw.map(pt=>pt[0]>=-622&&pt[0]<=802&&pt[1]>=-777&&pt[1]<=747);
  let best=[0,0],cur=null;
  for(let i=0;i<raw.length;i++){ if(ib[i]){ if(cur===null)cur=i; if(i-cur>best[1]-best[0])best=[cur,i]; } else cur=null; }
  const PTS=raw.slice(best[0],best[1]+1);
  const cum=[0];for(let i=1;i<PTS.length;i++)cum.push(cum[i-1]+Math.hypot(PTS[i][0]-PTS[i-1][0],PTS[i][1]-PTS[i-1][1]));
  const L=cum[cum.length-1];
  const at=(t)=>{t=Math.max(0,Math.min(L,t));let i=1;while(i<cum.length-1&&cum[i]<t)i++;const f=(t-cum[i-1])/((cum[i]-cum[i-1])||1);return[PTS[i-1][0]+(PTS[i][0]-PTS[i-1][0])*f,PTS[i-1][1]+(PTS[i][1]-PTS[i-1][1])*f]};
  const s0=at(0),s1=at(2);
  g.auto.x=s0[0];g.auto.z=s0[1];g.auto.a=Math.atan2(s1[0]-s0[0],s1[1]-s0[1]);g.auto.v=0;
  const cam=g.camera; const log=[]; let lastBi=0;
  K.KeyW=true;
  for(let n=0;n<1400;n++){
    let dd=1e9,bi=lastBi;const lo=Math.max(0,lastBi-6),hi=Math.min(PTS.length-1,lastBi+50);
    for(let i=lo;i<=hi;i++){const d=Math.hypot(PTS[i][0]-g.auto.x,PTS[i][1]-g.auto.z);if(d<dd){dd=d;bi=i}}
    lastBi=bi;
    const tq=at(cum[bi]+7); const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);
    const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
    K.KeyA=err>0.05;K.KeyD=err<-0.05;
    window.__step(0.05,performance.now());
    if(n%40===0) log.push({n,x:+g.auto.x.toFixed(0),z:+g.auto.z.toFixed(0),v:+g.auto.v.toFixed(1),camY:+cam.position.y.toFixed(1),camSolid:g.solid(cam.position.x,cam.position.z)?1:0,dCam:+Math.hypot(cam.position.x-g.auto.x,cam.position.z-g.auto.z).toFixed(1)});
    if(cum[bi]>=L-3)break;
  }
  K.KeyW=K.KeyA=K.KeyD=false;
  return {ri,L:+L.toFixed(0),log};
});
console.log('DRIVE100FT', JSON.stringify(res));
await b.close();
