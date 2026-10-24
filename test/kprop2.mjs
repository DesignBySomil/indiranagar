import puppeteer from 'puppeteer-core';
const port=process.argv[2],N=+process.argv[3]||5,OFF=+process.argv[4]||1.3;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate((N,OFF)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,out=[],segs=g.roadSegs();
 const its=g.props.items.filter(it=>it.mass>1).filter(it=>Math.hypot(it.x-a.x,it.z-a.z)<250).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z));
 for(const it of its){ if(out.length>=N)break; if(it.state!==0)continue;
  let bs=null,bd=1e9,bx=0,bz=0; for(const s of segs){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((it.x-s.x1)*dx+(it.z-s.z1)*dz)/L2)),qx=it.x-(s.x1+dx*t),qz=it.z-(s.z1+dz*t),d=qx*qx+qz*qz;if(d<bd){bd=d;bs=s;bx=qx;bz=qz;}}
  const L=Math.hypot(bs.x2-bs.x1,bs.z2-bs.z1),fx=(bs.x2-bs.x1)/L,fz=(bs.z2-bs.z1)/L,al=Math.hypot(bx,bz),ax=bx/al,az=bz/al;
  // car line offset toward the road by OFF metres from the trunk centre
  a.x=it.x-ax*OFF-fx*10;a.z=it.z-az*OFF-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(3);
  const x0=a.x,z0=a.z; window.__keys['KeyW']=true;let hit=false,vmin=99,vHit=0;let kHit=-1;
  for(let k=0;k<260;k++){stp(1); if(!hit&&it.state!==0){hit=true;kHit=k;vHit=a.v;} if(hit)vmin=Math.min(vmin,a.v); }
  window.__keys['KeyW']=false;
  let rec=null; const stuck=hit&&Math.abs(a.v)<0.5&&Math.hypot(a.x-x0,a.z-z0)<12;
  if(stuck){ const rx=-ax,rz=-az; const key=(rx*fz+rz*(-fx))>0?'KeyD':'KeyA'; const p0x=a.x,p0z=a.z;
    window.__keys['KeyS']=true; stp(25); window.__keys['KeyS']=false;
    window.__keys[key]=true; window.__keys['KeyW']=true; stp(25); window.__keys[key]=false; stp(60); window.__keys['KeyW']=false;
    rec={key,gained:+(((a.x-p0x)*fx+(a.z-p0z)*fz)).toFixed(1)}; }
  const prog=((a.x-x0)*fx+(a.z-z0)*fz);
  // closest approach of the car centre line to the fallen trunk
  const E=it.len*Math.sin(it.th||0);
  out.push({offsetToRoad:OFF,dist:+Math.hypot(it.x-x0,it.z-z0).toFixed(1),touched:hit,state:it.state,vHit:+vHit.toFixed(1),vMinAfter:hit?+vmin.toFixed(1):null,progress:+prog.toFixed(1),fallAwayDot:+(it.fx*ax+it.fz*az).toFixed(2),fallAlongDot:+(it.fx*fx+it.fz*fz).toFixed(2),recovery:rec,carLatToBase:+(((a.x-it.x)*ax+(a.z-it.z)*az)).toFixed(1)});
 }
 return {n:its.length,out};},N,OFF);
console.log(JSON.stringify(r));await b.close();process.exit(0);
