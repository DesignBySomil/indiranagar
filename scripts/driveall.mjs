const T0=Date.now();
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, existsSync } from 'fs';
const [,,START='0',COUNT='8',PROG='/tmp/drive-progress.json',TRACE='0']=process.argv;
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
const BOOT_MS=Date.now()-T0; const DRIVE_BUDGET_MS=Math.max(25000,103000-BOOT_MS);
const slice=roads.slice(+START,+START+ +COUNT).map(r=>({n:r.n||'(unnamed)',k:r.k,p:r.p}));
let prog=existsSync(PROG)?JSON.parse(readFileSync(PROG)):{done:0,records:[],incidents:[]};
let segTotal=prog.totalSegsDriven||0;
await p.exposeFunction('reportRoute',(idx,rec,covN)=>{
  const row={idx:+START+idx,...rec};
  const oi=prog.records.findIndex(r=>r.idx===row.idx);
  if(oi>=0) prog.records[oi]=row; else prog.records.push(row);
  if(rec.stuck||rec.offRoadMax>2||rec.maxSegW>7.8) prog.incidents.push(rec);
  prog.done=Math.max(prog.done,+START+idx+1);
  const u=new Set(); prog.records.forEach(r=>(r.segsList||[]).forEach(q=>u.add(q)));
  segTotal=u.size; prog.totalSegsDriven=u.size;
  writeFileSync(PROG,JSON.stringify(prog));
  console.log('ROUTE',+START+idx,rec.done?'DONE':'PART',rec.name,'wp',rec.waypointsReached+'/'+rec.waypointsTotal,'segs',rec.segsTraversed);
});
const TIME_BUDGET_MS=0; // computed after boot
p.on('console',m=>{const t=m.text(); if(t.startsWith('TR ')) console.log(t);});
const res=await p.evaluate(async(slice,TIME_BUDGET_MS,TRACE)=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  let t0=90000; window.__noRender=true;
  const step=()=>{t0+=33;window.__step(0.033,t0);};
  for(let k=0;k<30;k++) step();
  const A=g.auto, K=window.__keys;
  const log=[];
  function norm(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
  const segsAll=g.roadSegs();
  const segMid=segsAll.map(s=>{const x1=s.x1??s[0],z1=s.z1??s[1],x2=s.x2??s[2],z2=s.z2??s[3];return [(x1+x2)/2,(z1+z2)/2,(s.width??s[6])||7,x1,z1,x2,z2];});
  const ptSeg=(x,z,m)=>{const dx=m[5]-m[3],dz=m[6]-m[4];const L2=dx*dx+dz*dz||1e-9;let t=((x-m[3])*dx+(z-m[4])*dz)/L2;t=Math.max(0,Math.min(1,t));return Math.hypot(x-(m[3]+t*dx),z-(m[4]+t*dz));};
  // 40m buckets so per-step nearest-seg is O(few)
  const buckets=new Map();
  segMid.forEach((m,i)=>{const key=Math.floor(m[0]/40)+','+Math.floor(m[1]/40);let a=buckets.get(key);if(!a){a=[];buckets.set(key,a);}a.push(i);});
  const nearSeg=(x,z)=>{const cx=Math.floor(x/40),cz=Math.floor(z/40);let best=1e9,bi=-1;
    for(let i=cx-1;i<=cx+1;i++)for(let j=cz-1;j<=cz+1;j++){const a=buckets.get(i+','+j);if(!a)continue;
      for(const q of a){const m=segMid[q];const dd=ptSeg(x,z,m);if(dd<best){best=dd;bi=q;}}}
    return [best,bi];};
  const cov=new Set(); const tStart=performance.now();
  let ri=-1;
  for(const road of slice){
    ri++;
    if(ri>0&&performance.now()-tStart>TIME_BUDGET_MS) break; // stop between routes, never mid-route
    const pts=road.p;
    const yaw0=Math.atan2(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]);
    window.__spawnAt(pts[0][0],pts[0][1],yaw0);
    for(let k=0;k<15;k++) step();
    let wi=1, stuckT=0, offT=0, dist=0, lx=A.x, lz=A.z, lastD=1e9, unstick=0, unstickTries=0;
    const segsHit=new Set(); const trav=new Map(); const segDetail=[];
    // route arc-length coverage: 1m bins along the route's own polyline
    const rpts=pts; const rcum=[0]; for(let i=1;i<rpts.length;i++) rcum.push(rcum[i-1]+Math.hypot(rpts[i][0]-rpts[i-1][0],rpts[i][1]-rpts[i-1][1]));
    const rLen=rcum[rcum.length-1]; const bins=new Set();
    // corridor tolerance from THIS road's actual width + vehicle margin (not a flat radius)
    const wMap={5:7.6,4:7.2,3:7.0,2:6.6,1:5.5};
    const rw=/Chinmaya/i.test(road.n)?4.8:(/100\s*Feet|100Ft/i.test(road.n)?5.2:(wMap[road.k]||7.0));
    const corridorTol=rw/2+1.2;
    const arcPos=(x,z)=>{let bd=1e9,bs=0;
      for(let i=0;i<rpts.length-1;i++){const dx=rpts[i+1][0]-rpts[i][0],dz=rpts[i+1][1]-rpts[i][1];const L2=dx*dx+dz*dz||1e-9;
        let t=((x-rpts[i][0])*dx+(z-rpts[i][1])*dz)/L2; t=Math.max(0,Math.min(1,t));
        const px=rpts[i][0]+t*dx,pz=rpts[i][1]+t*dz; const dd=Math.hypot(x-px,z-pz);
        if(dd<bd){bd=dd;bs=rcum[i]+t*Math.sqrt(L2);}}
      return [bd,bs];};
    const rec={name:road.n,kind:road.k,points:pts.length,done:false,stuck:false,offRoadMax:0,maxSegW:0,offEdgeMaxM:0,offEdgeT:0};
    const budget=Math.min(1900,pts.length*240+350);
    for(let k=0;k<budget&&wi<pts.length;k++){
      const ty=Math.atan2(pts[wi][0]-A.x,pts[wi][1]-A.z);
      const err=norm(ty-A.a);
      // CORRECT input model: str=+1 is KeyA and INCREASES auto.a; err>0 needs a to increase -> KeyA
      K.KeyA=err>0.05; K.KeyD=err<-0.05;
      // keep speed in the steering-authority band; slow for sharp turns
      const wantSlow=Math.abs(err)>0.55;
      K.KeyW=wantSlow?(A.v<3.2):(A.v<8.5);
      K.KeyS=!wantSlow?false:(A.v>4.5);
      if(unstick>0){ // override BEFORE step: reverse out with steering wiggle
        K.KeyW=false; K.KeyS=true; K.KeyA=(unstick%60)<30; K.KeyD=!K.KeyA;
        unstick--; if(unstick===0) stuckT=0;
      }
      step();
      dist+=Math.hypot(A.x-lx,A.z-lz); lx=A.x; lz=A.z;
      if(TRACE==='1'&&k<400&&k%10===0) console.log('TR',k,'x',A.x.toFixed(1),'z',A.z.toFixed(1),'v',A.v.toFixed(2),'a',A.a.toFixed(2),'W',K.KeyW?1:0,'A',K.KeyA?1:0,'D',K.KeyD?1:0,'S',K.KeyS?1:0,'wi',wi,'unst',unstick);
      { const [bd,bs]=arcPos(A.x,A.z); if(bd<corridorTol) bins.add(Math.floor(bs)); }
      const d=Math.hypot(pts[wi][0]-A.x,pts[wi][1]-A.z);
      if(d<5.5||(d>lastD+0.01&&lastD<9)){ wi++; lastD=1e9; } else lastD=Math.min(lastD,d);
      // physical traversal: project onto nearest seg axis; credit only after covering >=50% of its length within corridor
      const [best,bi]=nearSeg(A.x,A.z);
      if(bi>=0&&best<segMid[bi][2]/2+1.6){
        const m=segMid[bi]; const dx=m[5]-m[3],dz=m[6]-m[4]; const L2=dx*dx+dz*dz||1e-9;
        let t=((A.x-m[3])*dx+(A.z-m[4])*dz)/L2; t=Math.max(0,Math.min(1,t));
        let tr=trav.get(bi); if(!tr){tr={lo:t,hi:t};trav.set(bi,tr);} else { if(t<tr.lo)tr.lo=t; if(t>tr.hi)tr.hi=t; }
      }
      const bw=bi>=0?segMid[bi][2]:0; if(bw>rec.maxSegW)rec.maxSegW=bw;
      if(bi>=0){ const over=best-bw/2; if(over>rec.offEdgeMaxM)rec.offEdgeMaxM=over; if(over>0)rec.offEdgeT+=0.033; }
      if(best>12) offT+=0.033; else offT=0;
      if(offT>rec.offRoadMax) rec.offRoadMax=offT;
      if(unstick===0){
        if(Math.abs(A.v)<0.35&&K.KeyW){
          stuckT+=0.033;
          if(stuckT>2&&unstickTries<2){ unstick=75; unstickTries++; stuckT=0; }
          else if(stuckT>5){ rec.stuck=true; break; }
        } else stuckT=0;
      }
    }
    K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;
    rec.done=wi>=pts.length; rec.dist=+dist.toFixed(0);
    rec.routeLen=+rLen.toFixed(0); rec.arcCoveredM=bins.size; rec.arcFrac=+(bins.size/Math.max(1,Math.floor(rLen))).toFixed(2);
    rec.fullRoute=rec.arcFrac>=0.95; // whole corridor traversed, small endpoint tolerance
    rec.segDetail=segDetail; rec.offRoadMax=+rec.offRoadMax.toFixed(1);
    rec.maxSegW=+rec.maxSegW.toFixed(1);
    rec.offEdgeMaxM=+rec.offEdgeMaxM.toFixed(1); rec.offEdgeT=+rec.offEdgeT.toFixed(1);
    rec.waypointsReached=wi-1; rec.waypointsTotal=pts.length-1;
    for(const [bi,tr] of trav){ const m=segMid[bi]; const len=Math.hypot(m[5]-m[3],m[6]-m[4]);
      segDetail.push({seg:bi,lo:+tr.lo.toFixed(2),hi:+tr.hi.toFixed(2),len:+len.toFixed(1),cov:+(tr.hi-tr.lo).toFixed(2)});
      if(tr.hi-tr.lo>=0.5){ segsHit.add(bi); cov.add(bi); } }
    rec.segsTraversed=segsHit.size; rec.segsList=[...segsHit];
    rec.unstickTries=unstickTries;
    rec.start=[+pts[0][0].toFixed(0),+pts[0][1].toFixed(0)]; rec.end=[+A.x.toFixed(0),+A.z.toFixed(0)];
    log.push(rec);
    await window.reportRoute(ri,rec,cov.size);
  }
  window.__coverage=[...cov];
  window.__noRender=false;
  return {log,totalSegsDriven:(window.__coverage||[]).length};
},slice,DRIVE_BUDGET_MS,TRACE);
const recs=(res&&res.log)||[];
console.log(JSON.stringify({processed:recs.length,total:prog.done,of:roads.length,segsDriven:prog.totalSegsDriven,incidents:prog.incidents.length}));
await b.close(); process.exit(0);
