import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const [port,tag]=[process.argv[2],process.argv[3]];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,cvs=document.getElementById('c');
 const cap=async(cx,cy,cz,lx,ly,lz)=>{g.camera.position.set(cx,cy,cz);g.camera.lookAt(lx,ly,lz);g.camera.updateMatrixWorld();window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;return cvs.toDataURL('image/png');};
 const its=g.props.items.filter(it=>it.mass>1).filter(it=>Math.hypot(it.x-a.x,it.z-a.z)<250).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z));
 const it=its[2]; const segs=g.roadSegs(); let bs=null,bd=1e9; for(const s of segs){const d=Math.hypot((s.x1+s.x2)/2-it.x,(s.z1+s.z2)/2-it.z); if(d<bd){bd=d;bs=s;}}
 const L=Math.hypot(bs.x2-bs.x1,bs.z2-bs.z1),fx=(bs.x2-bs.x1)/L,fz=(bs.z2-bs.z1)/L;
 a.x=it.x-fx*10;a.z=it.z-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(3);
 window.__keys['KeyW']=true;let hit=false;for(let k=0;k<200;k++){stp(1);if(it.state!==0){hit=true;break;}} window.__keys['KeyW']=false;
 if(!hit)return null;
 const frames={},traj=[]; const px=-it.fz,pz=it.fx; // perpendicular to fall dir: side-on view of the topple
 for(let k2=0;k2<=30;k2++){ if(k2>0)stp(1); traj.push([k2,+it.th.toFixed(2),it.state]);
  if(k2%3===0)frames[String(k2).padStart(3,'0')]=await cap(it.x+px*16,4,it.z+pz*16,it.x,3,it.z);}
 return {frames,traj};});
if(!r){console.log('NOHIT');process.exit(1)}
for(const [k,v] of Object.entries(r.frames)) writeFileSync(`/tmp/ft_${tag}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));
console.log(JSON.stringify(r.traj.filter(t=>t[0]%3===0)));await b.close();process.exit(0);
