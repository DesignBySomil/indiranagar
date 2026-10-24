import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const [port,tag,idx]=[process.argv[2],process.argv[3],+process.argv[4]||0];const OFF=1.0;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate(async(idx,OFF)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__paused=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,cvs=document.getElementById('c'),segs=g.roadSegs();
 const cap=async(cx,cy,cz,lx,ly,lz)=>{g.camera.position.set(cx,cy,cz);g.camera.lookAt(lx,ly,lz);g.camera.updateMatrixWorld();window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;return cvs.toDataURL('image/png');};
 const its=g.props.items.filter(it=>it.mass===0.8).filter(it=>Math.hypot(it.x-a.x,it.z-a.z)<250).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z));
 const it=its[idx];
 let bs=null,bd=1e9,bx=0,bz=0; for(const s of segs){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((it.x-s.x1)*dx+(it.z-s.z1)*dz)/L2)),qx=it.x-(s.x1+dx*t),qz=it.z-(s.z1+dz*t),d=qx*qx+qz*qz;if(d<bd){bd=d;bs=s;bx=qx;bz=qz;}}
 const L=Math.hypot(bs.x2-bs.x1,bs.z2-bs.z1),fx=(bs.x2-bs.x1)/L,fz=(bs.z2-bs.z1)/L,al=Math.hypot(bx,bz),ax=bx/al,az=bz/al;
 a.x=it.x-ax*OFF-fx*10;a.z=it.z-az*OFF-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(3);
 window.__keys['KeyW']=true;let hit=false;for(let k=0;k<200;k++){stp(1);if(it.state!==0){hit=true;break;}}
 if(!hit)return null;
 // camera from the road side, looking across at the trunk base
 const cx=it.x-ax*11-fx*3,cz=it.z-az*11-fz*3,frames={},log=[];
 const snap=async(label)=>{frames[label]=await cap(cx,5.5,cz,it.x+fx*1.5,1.2,it.z+fz*1.5);log.push([label,+a.x.toFixed(1),+a.z.toFixed(1),+a.v.toFixed(1),+it.th.toFixed(2)]);};
 for(let k2=0;k2<=24;k2++){ if(k2>0)stp(1); if(k2%6===0)await snap('a'+String(k2).padStart(2,'0'));}
 const sp=[];for(let k3=0;k3<40;k3++){stp(1);} window.__keys['KeyW']=false;
 const cart=g.props.items.filter(c=>c.mass===1.5).sort((p,q)=>Math.hypot(p.x-it.x,p.z-it.z)-Math.hypot(q.x-it.x,q.z-it.z))[0];
 log.push(['cart',cart.state,+Math.hypot(cart.x-it.x,cart.z-it.z).toFixed(2),'vendor',it.state]);
 const COFF=1.3;
 a.x=cart.x-ax*COFF-fx*10;a.z=cart.z-az*COFF-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(3);
 window.__keys['KeyW']=true;let h2=false;const tr=[];for(let k=0;k<200;k++){stp(1);if(k%10==0)tr.push([+a.v.toFixed(1),+Math.hypot(a.x-cart.x,a.z-cart.z).toFixed(1),+(((a.x-cart.x)*ax+(a.z-cart.z)*az)).toFixed(2)]);if(cart.state!==0){h2=true;break;}} log.push(['tr',JSON.stringify(tr)]);
 log.push(['cart_hit',h2,+a.v.toFixed(1),cart.state]);
 if(h2){ const cx2=cart.x-ax*11-fx*3,cz2=cart.z-az*11-fz*3; for(let k2=0;k2<=24;k2++){ if(k2>0)stp(1); if(k2%6===0){frames['k'+String(k2).padStart(2,'0')]=await cap(cx2,5.5,cz2,cart.x+fx*1.5,1.2,cart.z+fz*1.5);log.push(['k'+k2,+a.v.toFixed(1),+cart.th.toFixed(2)]);} }
  const sp2=[];for(let k3=0;k3<50;k3++){stp(1);sp2.push(+a.v.toFixed(1));} log.push(['sp',sp2.join(',')]); }
 window.__keys['KeyW']=false; log.push(['cartfall',+(cart.fx||0).toFixed(2),+(cart.fz||0).toFixed(2)]);
 return {frames,log,fall:[+it.fx.toFixed(2),+it.fz.toFixed(2)]};},idx,OFF);
if(!r){console.log('NOHIT');process.exit(1)}
for(const [k,v] of Object.entries(r.frames)) writeFileSync(`/tmp/f3_${tag}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));
console.log(JSON.stringify(r.log),r.fall);await b.close();process.exit(0);
