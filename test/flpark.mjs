import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const [port,tag,idx]=[process.argv[2],process.argv[3],+process.argv[4]||0];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async(idx)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,cvs=document.getElementById('c');
 const cap=async(cx,cy,cz,lx,ly,lz)=>{g.camera.position.set(cx,cy,cz);g.camera.lookAt(lx,ly,lz);g.camera.updateMatrixWorld();window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;return cvs.toDataURL('image/png');};
 const sps=g.parked.spotsNear(a.x,a.z,60); let n=0;
 for(const sp of sps){ const yaw=sp.yaw,fx=Math.sin(yaw),fz=Math.cos(yaw);a.x=sp.x-fx*9;a.z=sp.z-fz*9;a.a=Math.atan2(fx,fz);a.v=0;stp(3);
  const x0=sp.x,z0=sp.z;window.__keys['KeyW']=true;let hit=false;for(let k=0;k<150;k++){stp(1);if(Math.hypot(sp.x-x0,sp.z-z0)>0.05||(sp.ky||0)>0.05){hit=true;break;}}
  window.__keys['KeyW']=false; if(!hit)continue; if(n++<idx)continue;
  const frames={},traj=[];const nx=-fz,nz=fx; const cx=x0+nx*9, cz=z0+nz*9;
  for(let k2=0;k2<=42;k2++){ if(k2>0)stp(1); traj.push([k2,+sp.x.toFixed(2),+sp.z.toFixed(2),+(sp.ky||0).toFixed(2)]);
   if(k2%6===0){frames[String(k2).padStart(3,'0')]=await cap(cx,5,cz,sp.x,0.8,sp.z);} }
  return {type:sp.type,frames,traj};}
 return null;},idx);
if(!r){console.log('NOHIT');process.exit(1)}
for(const [k,v] of Object.entries(r.frames)) writeFileSync(`/tmp/fl_${tag}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));
console.log(r.type,JSON.stringify(r.traj.filter(t=>t[0]%6===0)));
await b.close();process.exit(0);
