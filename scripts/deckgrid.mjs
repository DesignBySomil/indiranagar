import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2000));
const out = await p.evaluate(async ()=>{
  const g=window.__game, S=g.roadSegs();
  const extras = await (await fetch('/data/extras.json')).json();
  // replicate runtime bridgeVolumes exactly
  const vols=[];
  if(extras.station && extras.station.pts){
    const sPts=extras.station.pts; let scx=0,scz=0; sPts.forEach(pt=>{scx+=pt[0];scz+=pt[1]}); scx/=sPts.length; scz/=sPts.length;
    vols.push({name:'station',x:scx,z:scz,r:32,clearanceY:7.4,span:null,yaw:null});
  }
  const spansAnyRoad=(pts)=>{
    const mx=(pts[0][0]+pts[pts.length-1][0])*0.5, mz=(pts[0][1]+pts[pts.length-1][1])*0.5;
    for(const s of S){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,((mx-s.x1)*dx+(mz-s.z1)*dz)/L2));
      if(Math.hypot(mx-(s.x1+dx*t),mz-(s.z1+dz*t))<s.width+6)return true}
    return false;
  };
  for(const fb of (extras.footbridges||[])){
    if(!fb.pts||fb.pts.length<2||!spansAnyRoad(fb.pts))continue;
    const p1=fb.pts[0],p2=fb.pts[fb.pts.length-1];
    const dx=p2[0]-p1[0],dz=p2[1]-p1[1],span=Math.hypot(dx,dz);
    if(span<5||span>65)continue;
    vols.push({name:'fb@'+( (p1[0]+p2[0])/2 ).toFixed(0)+','+( (p1[1]+p2[1])/2 ).toFixed(0),x:(p1[0]+p2[0])*0.5,z:(p1[1]+p2[1])*0.5,r:span*0.5+3,clearanceY:4.5,span,yaw:Math.atan2(dx,dz)});
  }
  // faithful pull-in replica (solid + parked; traffic/crowd are dynamic, excluded by design note)
  const m=0.8;
  const solid=g.solid.bind(g), parkedS=g.parked?g.parked.solid.bind(g.parked):()=>false;
  const mkLos=(ax,az)=>(x,z)=>{ if(solid(ax,az))return false; for(let t=0.15;t<0.9;t+=0.15) if(solid(x+(ax-x)*t,z+(az-z)*t)) return true; return false; };
  const results=[];
  for(const v of vols){
    let tested=0,liftEngage=0,capMiss=0,maxUncappedY=0,minD=1e9;
    const R=v.r+4;
    for(let gx=-R;gx<=R;gx+=4)for(let gz=-R;gz<=R;gz+=4){
      const ax=+(v.x+gx).toFixed(1), az=+(v.z+gz).toFixed(1);
      if(solid(ax,az))continue;
      for(let h=0;h<8;h++){
        const a=h*Math.PI/4, dx=Math.sin(a), dz=Math.cos(a);
        // auto hull free at this heading?
        let ok=true; for(const [lx,lz] of [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]]){if(solid(ax+dz*0+Math.cos(a)*lx+Math.sin(a)*lz, az-Math.sin(a)*lx+Math.cos(a)*lz)){ok=false;break}}
        if(!ok)continue;
        tested++;
        let cx=ax-dx*6.4, cz=az-dz*6.4;
        const los=mkLos(ax,az);
        const bad=(x,z)=>solid(x,z)||solid(x+m,z)||solid(x-m,z)||solid(x,z+m)||solid(x,z-m)||los(x,z)||parkedS(x,z);
        for(let k=0;k<24&&bad(cx,cz);k++){cx+=(ax-cx)*0.2;cz+=(az-cz)*0.2}
        const dCam=Math.hypot(cx-ax,cz-az);
        if(dCam<minD)minD=dCam;
        if(dCam<4.2){
          liftEngage++;
          const uncapped=3.0+(4.2-dCam)*1.8; if(uncapped>maxUncappedY)maxUncappedY=uncapped;
          const withinR=Math.hypot(cx-v.x,cz-v.z)<(v.r||18);
          if(!withinR)capMiss++;
        }
      }
    }
    results.push({name:v.name,x:+v.x.toFixed(0),z:+v.z.toFixed(0),r:+v.r.toFixed(1),clearanceY:v.clearanceY,tested,liftEngage,capMiss,maxUncappedY:+maxUncappedY.toFixed(1),minDCam:+minD.toFixed(2)});
  }
  return results;
});
for(const r of out) console.log('DECK', JSON.stringify(r));
await b.close();
