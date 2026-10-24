import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const port=process.argv[2],tag=process.argv[3],COFF=+process.argv[4]||1.3;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate(async(COFF)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__paused=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,cvs=document.getElementById('c'),segs=g.roadSegs(),res=[],frames={},log=[];
 const cap=async(cx,cy,cz,lx,ly,lz)=>{g.camera.position.set(cx,cy,cz);g.camera.lookAt(lx,ly,lz);g.camera.updateMatrixWorld();window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;return cvs.toDataURL('image/png');};
 const carts=g.props.items.filter(i=>i.mass===1.5&&i.state===0).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z)).slice(0,14);
 for(const cart of carts){
  let bs=null,bd=1e9,bx=0,bz=0; for(const s of segs){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((cart.x-s.x1)*dx+(cart.z-s.z1)*dz)/L2)),qx=cart.x-(s.x1+dx*t),qz=cart.z-(s.z1+dz*t),d=qx*qx+qz*qz;if(d<bd){bd=d;bs=s;bx=qx;bz=qz;}}
  const L=Math.hypot(bs.x2-bs.x1,bs.z2-bs.z1),fx=(bs.x2-bs.x1)/L,fz=(bs.z2-bs.z1)/L,al=Math.hypot(bx,bz),ax=bx/al,az=bz/al;
  for(const dir of [1,-1]){
   const hx=fx*dir,hz=fz*dir;
   a.x=cart.x-ax*COFF-hx*10;a.z=cart.z-az*COFF-hz*10;a.a=Math.atan2(hx,hz);a.v=0;stp(4);
   const clear=[];for(let d=0;d<=10;d+=1){for(const lt of [-1,0,1]){const qx=cart.x-ax*COFF-hx*d+hz*lt,qz=cart.z-az*COFF-hz*d-hx*lt;if(g.parked.solid(qx,qz)||g.solid(qx,qz))clear.push([d,lt]);}}
   const x0=a.x,z0=a.z;window.__keys['KeyW']=true;let hit=false,vh=0,mind=99;for(let k=0;k<220;k++){stp(1);mind=Math.min(mind,Math.hypot(a.x-cart.x,a.z-cart.z));if(cart.state!==0){hit=true;vh=a.v;break;}}
   const rec={dir,lineBlocked:clear.length,hit,vh:+vh.toFixed(1),minDist:+mind.toFixed(1),stoppedAt:+Math.hypot(a.x-x0,a.z-z0).toFixed(1)};
   if(hit){rec.fall=[+cart.fx.toFixed(2),+cart.fz.toFixed(2)];
    const cx=cart.x-ax*11-hx*3,cz=cart.z-az*11-hz*3;const sp=[];
    for(let k2=0;k2<=30;k2++){if(k2>0)stp(1);sp.push(+a.v.toFixed(1));if(k2%6===0)frames['k'+String(k2).padStart(2,'0')]=await cap(cx,5.5,cz,cart.x+hx*1.5,1.2,cart.z+hz*1.5);}
    rec.sp=sp.join(',');rec.th=+cart.th.toFixed(2);window.__keys['KeyW']=false;res.push(rec);return {res,frames};}
   window.__keys['KeyW']=false;res.push(rec);
  }}
 return {res,frames};},COFF);
for(const [k,v] of Object.entries(r.frames)) writeFileSync(`/tmp/f4_${tag}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));
console.log(JSON.stringify(r.res));await b.close();process.exit(0);
