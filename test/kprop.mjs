import puppeteer from 'puppeteer-core';
const port=process.argv[2],N=+process.argv[3]||3,which=process.argv[4]||'lamp';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate((N,which)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,out=[]; const its=g.props.items.filter(it=>which==='lamp'?it.mass===1:it.mass>1).filter(it=>Math.hypot(it.x-a.x,it.z-a.z)<250).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z));
 for(const it of its){ if(out.length>=N)break;
  // approach the prop head-on along the road direction from the nearest road seg
  const segs=g.roadSegs(); let bs=null,bd=1e9; for(const s of segs){const d=Math.hypot((s.x1+s.x2)/2-it.x,(s.z1+s.z2)/2-it.z); if(d<bd){bd=d;bs=s;}}
  const L=Math.hypot(bs.x2-bs.x1,bs.z2-bs.z1),fx=(bs.x2-bs.x1)/L,fz=(bs.z2-bs.z1)/L;
  a.x=it.x-fx*10;a.z=it.z-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(3);
  window.__keys['KeyW']=true;let hit=false,k0=0;for(let k=0;k<200;k++){stp(1);if(it.state!==0){hit=true;k0=k;break;}}
  if(!hit){window.__keys['KeyW']=false;out.push({noHit:true,dist:+Math.hypot(a.x-it.x,a.z-it.z).toFixed(1)});continue;}
  const vHit=a.v; const x0=a.x,z0=a.z; for(let k=0;k<120;k++)stp(1); window.__keys['KeyW']=false;
  const prog=((a.x-x0)*fx+(a.z-z0)*fz);
  const pt=it.parts[0].inst; const m=new (it.parts[0].base.constructor)(); pt.getMatrixAt(it.parts[0].idx,m);
  out.push({state:it.state,theta:+it.th.toFixed(2),fallDirDotRoad:+(it.fx*fx+it.fz*fz).toFixed(2),fallLateralToRoad:+(it.fx*fz-it.fz*fx).toFixed(2),vAtHit:+vHit.toFixed(1),playerProgress4s:+prog.toFixed(1),solidAtBase:g.props.solid(it.x,it.z)});
 }
 return {n:its.length,out};},N,which);
console.log(JSON.stringify(r));await b.close();process.exit(0);
