// Drive-through coverage: physically drive road polylines with simulated keys.
// Usage: node scripts/driveall.mjs <startIdx> <count> <progressFile>
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, existsSync } from 'fs';
const [,,START='0',COUNT='8',PROG='/tmp/drive-progress.json']=process.argv;
const world=JSON.parse(readFileSync('public/data/world.json'));
const MAP={x0:-650,x1:830,z0:-805,z1:775};
const inMap=(x,z)=>x>MAP.x0+35&&x<MAP.x1-35&&z>MAP.z0+35&&z<MAP.z1-35;
// user: ALL reachable game roads. Clip each polyline to maximal runs of consecutive
// in-bounds points (reachable portions of partially-in-bounds roads still count).
const roads=[];
for(const r of world.roads){
  if(!r.p||r.p.length<2) continue;
  let run=[];
  const flush=()=>{ if(run.length>=2) roads.push({n:r.n||'(unnamed)',k:r.k,p:run}); run=[]; };
  for(const pt of r.p){ if(inMap(pt[0],pt[1])) run.push(pt); else flush(); }
  flush();
}
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=480,270']});
const p=await b.newPage(); await p.setViewport({width:480,height:270});
p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,120)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const slice=roads.slice(+START,+START+ +COUNT).map(r=>({n:r.n||'(unnamed)',k:r.k,p:r.p}));
const res=await p.evaluate(async(slice)=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  let t0=90000; window.__noRender=true;
  const step=()=>{t0+=33;window.__step(0.033,t0);};
  for(let k=0;k<30;k++) step();
  const A=g.auto, K=window.__keys;
  const log=[];
  function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
  for(const road of slice){
    const pts=road.p;
    // start at first point, aim at second
    const yaw0=Math.atan2(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]);
    window.__spawnAt(pts[0][0],pts[0][1],yaw0);
    for(let k=0;k<25;k++) step(); // let chunks stream near spawn
    let wi=1, stuckT=0, maxW=0, offT=0, dist=0, lx=A.x, lz=A.z;
    const rec={name:road.n,kind:road.k,points:pts.length,done:false,stuck:false,offRoadMax:0,maxSegW:0};
    for(let k=0;k<1400&&wi<pts.length;k++){
      // steering controller toward waypoint
      const ty=Math.atan2(pts[wi][0]-A.x,pts[wi][1]-A.z);
      const err=norm(ty-A.a);
      K.KeyA=err<-0.06; K.KeyD=err>0.06; K.KeyW=Math.abs(err)<2.6; K.KeyS=Math.abs(err)>=2.6; // keep rolling while turning
      step();
      dist+=Math.hypot(A.x-lx,A.z-lz); lx=A.x; lz=A.z;
      const d=Math.hypot(pts[wi][0]-A.x,pts[wi][1]-A.z);
      if(d<6){ wi++; }
      // seg width audit at current position
      const segs=g.roadSegs(); let best=1e9,bw=0;
      for(const s of segs){const x1=s.x1??s[0],z1=s.z1??s[1],x2=s.x2??s[2],z2=s.z2??s[3];
        const mx=(x1+x2)/2,mz=(z1+z2)/2;const dd=Math.hypot(mx-A.x,mz-A.z);if(dd<best){best=dd;bw=s.width??s[6];}}
      if(bw>maxW)maxW=bw;
      if(best>12) offT+=0.033; else offT=0;
      if(offT>rec.offRoadMax) rec.offRoadMax=offT;
      if(Math.abs(A.v)<0.4&&K.KeyW){ stuckT+=0.033; if(stuckT>4){ rec.stuck=true; break; } } else stuckT=0;
    }
    K.KeyW=K.KeyA=K.KeyD=false;
    rec.done=wi>=pts.length; rec.dist=+dist.toFixed(0); rec.maxSegW=+maxW.toFixed(1); rec.offRoadMax=+rec.offRoadMax.toFixed(1);
    rec.waypointsReached=wi-1; rec.waypointsTotal=pts.length-1;
    rec.start=[+pts[0][0].toFixed(0),+pts[0][1].toFixed(0)]; rec.end=[+A.x.toFixed(0),+A.z.toFixed(0)];
    log.push(rec);
  }
  window.__noRender=false;
  return log;
},slice);
let prog=existsSync(PROG)?JSON.parse(readFileSync(PROG)): {done:0,records:[],incidents:[]};
res.forEach(r=>{prog.records.push({idx:+START+prog.records.length,...r});
  if(r.stuck||r.offRoadMax>2||r.maxSegW>7.8) prog.incidents.push(r);});
prog.done=Math.max(prog.done,+START+res.length);
writeFileSync(PROG,JSON.stringify(prog));
console.log(JSON.stringify({processed:res.length,total:prog.done,of:roads.length,incidents:prog.incidents.length,slice:res}));
await b.close(); process.exit(0);
