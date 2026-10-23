import puppeteer from 'puppeteer-core';
const port=process.argv[2],N=+process.argv[3]||4;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate((N)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,out=[];
 const sps=g.parked.spotsNear?g.parked.spotsNear(a.x,a.z,60):[];
 for(const sp of sps){ if(out.length>=N)break;
  const dx0=sp.x-a.x; const yaw=sp.yaw; // approach along the spot's long axis
  const fx=Math.sin(yaw),fz=Math.cos(yaw);a.x=sp.x-fx*9;a.z=sp.z-fz*9;a.a=Math.atan2(fx,fz);a.v=0;stp(3);
  const x0=sp.x,z0=sp.z,yw0=sp.yaw;window.__keys['KeyW']=true;let hit=false,ymax=0;for(let k=0;k<150;k++){stp(1);ymax=Math.max(ymax,sp.ky||0);if(Math.hypot(sp.x-x0,sp.z-z0)>0.05||(sp.ky||0)>0.05){hit=true;break;}}
  window.__keys['KeyW']=false; if(!hit)continue;
  const hx=a.x,hz=a.z; for(let k=0;k<150;k++){stp(1);ymax=Math.max(ymax,sp.ky||0);}
  const dx=sp.x-x0,dz=sp.z-z0; const along=dx*fx+dz*fz, lat=dx*fz-dz*fx;
  const sx=hx-fx*3,sz=hz-fz*3; a.x=sx;a.z=sz;a.v=0;window.__keys['KeyW']=true;let minD=99;for(let k=0;k<180;k++){stp(1);minD=Math.min(minD,Math.hypot(a.x-sp.x,a.z-sp.z));}window.__keys['KeyW']=false;
  out.push({type:sp.type,hopPeak:+ymax.toFixed(2),movedAlong:+along.toFixed(2),movedLateral:+lat.toFixed(2),yawTurn:+(sp.yaw-yw0).toFixed(2),finalKy:+(sp.ky||0).toFixed(2),finalSolidCentre:!!g.solid(sp.x,sp.z),playerProgress6s:+((a.x-sx)*fx+(a.z-sz)*fz).toFixed(1),minDist:+minD.toFixed(2),aheadSolid:!!g.solid(a.x+fx*2.2,a.z+fz*2.2),otherSpotNear:g.parked.spotsNear(a.x+fx*2.5,a.z+fz*2.5,3).filter(o=>o!==sp).length,aheadObstacle:!!(g.world&&g.world.inDivider&&g.world.inDivider(a.x+fx*2.2,a.z+fz*2.2))});
 }
 return {n:sps.length,out};},N);
console.log(JSON.stringify(r));await b.close();process.exit(0);
