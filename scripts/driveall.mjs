const T0=Date.now();
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, existsSync } from 'fs';
const [,,START='0',COUNT='8',PROG='/tmp/drive-progress.json',TRACE='0']=process.argv;
const world=JSON.parse(readFileSync('public/data/world.json'));
// Mirror src/street.js: narrow the 100Ft one-way pair to GAP100 so harness routes match the built road
{
  const W100=5.2, GAP100=W100+1.2;
  const hSegs=[];
  world.roads.forEach((r,ri)=>{ if(!(r.n&&r.n.includes('100 Feet')))return;
    for(let i=0;i<r.p.length-1;i++){ const [ax,az]=r.p[i],[bx,bz]=r.p[i+1]; const L=Math.hypot(bx-ax,bz-az); if(L<0.2)continue;
      hSegs.push({ri,i,x1:ax,z1:az,x2:bx,z2:bz,ux:(bx-ax)/L,uz:(bz-az)/L,L}); } });
  const perpOf=new Map();
  for(const a of hSegs){ const nx=-a.uz,nz=a.ux; const mx=(a.x1+a.x2)/2,mz=(a.z1+a.z2)/2; let best=null;
    for(const b of hSegs){ if(b.ri===a.ri)continue; if(Math.abs(a.ux*b.ux+a.uz*b.uz)<0.9)continue;
      const rx=(b.x1+b.x2)/2-mx,rz=(b.z1+b.z2)/2-mz; const along=rx*a.ux+rz*a.uz,perp=rx*nx+rz*nz;
      if(Math.abs(perp)<5||Math.abs(perp)>30||Math.abs(along)>(a.L+b.L)/2)continue;
      if(!best||Math.abs(perp)<Math.abs(best.perp))best={b,perp}; }
    if(best) perpOf.set(a.ri+':'+a.i,best.perp); }
  const done=new Set();
  for(const a of hSegs){
    const perp=perpOf.get(a.ri+':'+a.i); if(perp===undefined)continue;
    const sh=Math.max(0,(Math.abs(perp)-GAP100)/2); if(sh<=0)continue;
    const sgn=Math.sign(perp); const sx=-a.uz*sgn*sh, sz=a.ux*sgn*sh;
    const rp=world.roads[a.ri].p;
    for(const pi of [a.i,a.i+1]){ const k2=a.ri+':'+pi; if(done.has(k2))continue; done.add(k2); rp[pi][0]+=sx; rp[pi][1]+=sz; }
  }
}
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
await p.goto('http://localhost:4180/'+(process.env.TRAFFIC?('?traffic='+process.env.TRAFFIC):''),{waitUntil:'domcontentloaded',timeout:60000});
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
p.on('console',m=>{const t=m.text(); if(t.startsWith('TR ')||t.startsWith('JAM')) console.log(t);});
const res=await p.evaluate(async(slice,TIME_BUDGET_MS,TRACE,MAXB)=>{
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
  // register each seg in EVERY bucket its AABB touches: midpoint-only registration misses long segs whose midpoint is >1 bucket away (offEdge false-positives)
  segMid.forEach((m,i)=>{const bx0=Math.floor(Math.min(m[3],m[5])/40),bx1=Math.floor(Math.max(m[3],m[5])/40),bz0=Math.floor(Math.min(m[4],m[6])/40),bz1=Math.floor(Math.max(m[4],m[6])/40);
    for(let bx=bx0;bx<=bx1;bx++)for(let bz=bz0;bz<=bz1;bz++){const key=bx+','+bz;let a=buckets.get(key);if(!a){a=[];buckets.set(key,a);}a.push(i);}});
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
    let wi=1, stuckT=0, offT=0, dist=0, lx=A.x, lz=A.z, lastD=1e9, unstick=0, unstickTries=0; const progBuf=[];
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
    const budget=Math.min(MAXB,pts.length*520+350);
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
      if(TRACE==='1'&&k%10===0) console.log('TR',k,'x',A.x.toFixed(1),'z',A.z.toFixed(1),'v',A.v.toFixed(2),'a',A.a.toFixed(2),'W',K.KeyW?1:0,'A',K.KeyA?1:0,'D',K.KeyD?1:0,'S',K.KeyS?1:0,'wi',wi,'unst',unstick);
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
      if(bi>=0){ const over=best-bw/2; if(over>rec.offEdgeMaxM){rec.offEdgeMaxM=over; rec.offEdgeMaxPos=[+A.x.toFixed(1),+A.z.toFixed(1)];} if(over>0)rec.offEdgeT+=0.033; }
      if(best>12) offT+=0.033; else offT=0;
      if(offT>rec.offRoadMax) rec.offRoadMax=offT;
      if(unstick===0){
        if(Math.abs(A.v)<0.35&&K.KeyW){
          stuckT+=0.033;
          // wait out signal/queue stops first (signals cycle); reverse only if it never clears
          if(TRACE==='1'&&stuckT>3&&!rec._jamDump){ rec._jamDump=true;
            const t=window.__traffic&&window.__traffic();
            rec.jam=t&&t.units?t.units.filter(u=>Math.hypot(u.x-A.x,u.z-A.z)<45).map(u=>({x:+u.x.toFixed(1),z:+u.z.toFixed(1),v:+((u.speed??u.v)??-1).toFixed(1),t:+(u.t??-1).toFixed(2),seg:(u.seg&&u.seg.name)||'',ow:!!(u.seg&&u.seg.oneway),ux:+(u.seg&&u.seg.ux||0).toFixed(2),uz:+(u.seg&&u.seg.uz||0).toFixed(2),dir:u.dir})):null;
            console.log('JAM',JSON.stringify({car:[+A.x.toFixed(1),+A.z.toFixed(1)],a:+A.a.toFixed(2),units:rec.jam})); }
          if(stuckT>12&&unstickTries<2){ unstick=75; unstickTries++; stuckT=0; rec.waited=true; (rec.unsticks=rec.unsticks||[]).push({x:+A.x.toFixed(1),z:+A.z.toFixed(1),wi}); }
          else if(stuckT>16){ rec.stuck=true; break; }
        } else stuckT=0;
      }
      // creep detector: 10s sliding window, flag when displacement < 15m even if v > stuck threshold
      progBuf.push([A.x,A.z]); if(progBuf.length>300)progBuf.shift();
      if(Math.abs(A.v)<2&&K.KeyW&&unstick===0) rec._crawlT=(rec._crawlT||0)+1; else rec._crawlT=0;
      rec._shots=rec._shots||0;
      if((progBuf.length===300&&(Math.hypot(A.x-progBuf[0][0],A.z-progBuf[0][1])<15||rec._crawlT>120))&&rec._shots<3&&(k-(rec._lastShotK||-999))>500){
        const [x0,z0]=progBuf[0]; const adv=Math.hypot(A.x-x0,A.z-z0);
        {
          const t=window.__traffic&&window.__traffic();
          const hx=Math.sin(A.a),hz=Math.cos(A.a);
          const ahead=t&&t.units?t.units.filter(u=>{const dx=u.x-A.x,dz=u.z-A.z;const d=Math.hypot(dx,dz);return d<25&&(dx*hx+dz*hz)>-2&&(Math.abs(-dx*hz+dz*hx)<7);}).map(u=>({x:+u.x.toFixed(1),z:+u.z.toFixed(1),v:+((u.speed??0)).toFixed(1),seg:(u.seg&&u.seg.name)||'',held:u.__held||0,braking:u.braking?1:0})):null;
          rec._shots++; rec.crawl=rec.crawl||[]; rec.crawl.push({pos:[+A.x.toFixed(1),+A.z.toFixed(1)],wi,adv10s:+adv.toFixed(1),inDivider:window.__inDivider?!!window.__inDivider(A.x,A.z):null,solidHere:window.__solid(A.x,A.z),solidAhead3m:window.__solid(A.x+hx*3,A.z+hz*3),ahead});
          window.__noRender=false; await new Promise(r=>requestAnimationFrame(r));
          rec['_crawlShot'+rec._shots]=document.getElementById('c').toDataURL('image/jpeg',0.82); rec._lastShotK=k;
          window.__noRender=true;
          console.log('CRAWL',JSON.stringify(rec.crawl));
        }
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
},slice,DRIVE_BUDGET_MS,TRACE,parseInt(process.env.MAXBUDGET||'3400'));
const recs=(res&&res.log)||[];
import { writeFileSync as _w } from 'fs';
for(const r of recs){ for(let si=0;si<3;si++){ const key='_crawlShot'+si; if(r[key]){ const fn='/tmp/crawl-'+r.name.replace(/[^A-Za-z0-9]+/g,'_')+'-'+si+'.jpg'; _w(fn,Buffer.from(r[key].split(',')[1],'base64')); delete r[key]; console.log('CRAWLSHOT',fn); } } }
console.log(JSON.stringify({processed:recs.length,total:prog.done,of:roads.length,segsDriven:prog.totalSegsDriven,incidents:prog.incidents.length}));
await b.close(); process.exit(0);
