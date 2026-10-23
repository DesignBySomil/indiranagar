import puppeteer from 'puppeteer-core';
const port=process.argv[2],N=+process.argv[3]||6;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate((N)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,U=g.traffic.units,out=[];
 const HWm={sedan:1.05,suv:1.1,scooter:.55,auto:.9,tempo:1.2};
 for(const u of U.filter(u=>u.seg&&u.seg.len>40&&!u.wreck)){ if(out.length>=N)break;
  const s=u.seg,fx=s.ux*u.dir,fz=s.uz*u.dir;a.x=u.x-fx*10;a.z=u.z-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(5);
  window.__keys['KeyW']=true;let hit=false;for(let k=0;k<200;k++){stp(1);if(u.cool>0||u.kvx||u.kvz){hit=true;break;}}
  window.__keys['KeyW']=false; if(!hit)continue;
  const hx=a.x,hz=a.z; stp(150);
  const nx=-s.uz,nz=s.ux; const lat=(u.x-s.x1)*nx+(u.z-s.z1)*nz; const hw=HWm[u.td&&u.td.key]||1;
  const dy=u.yaw-Math.atan2(s.ux*u.dir,s.uz*u.dir);const ext=Math.abs(Math.sin(dy))*(u.halfLen||2)+Math.abs(Math.cos(dy))*hw;const clear=Math.abs(lat)-ext-s.width*0.5;
  // drive past: hold W 6 s along the road heading, measure progress along road
  a.a=Math.atan2(fx,fz); a.v=0; const sx=a.x,sz=a.z; window.__keys['KeyW']=true; let minD=99; for(let k=0;k<180;k++){stp(1);minD=Math.min(minD,Math.hypot(a.x-u.x,a.z-u.z));} window.__keys['KeyW']=false;
  let nu=null,nd=99;for(const o of U){if(o===u)continue;const d=Math.hypot(o.x-a.x,o.z-a.z);if(d<nd){nd=d;let wd=99;for(const w of U){if(w.wreck){wd=Math.min(wd,Math.hypot(w.x-o.x,w.z-o.z));}} nu={k:o.td&&o.td.key,w:!!o.wreck,sp:+o.speed.toFixed(1),nearestWreckD:+wd.toFixed(1),sameSeg:o.seg===s,brk:!!(o.braking||o.wbrk),t:+o.t.toFixed(3),dir:o.dir,myDir:u.dir,dToUnitHit:+Math.hypot(o.x-u.x,o.z-u.z).toFixed(1)}}} const selfSolid=g.solid?!!g.solid(a.x,a.z):null; const ahead=window.__solid(a.x+fx*2.5,a.z+fz*2.5);
  const prog=(a.x-sx)*fx+(a.z-sz)*fz;
  out.push({key:u.td&&u.td.key,wreck:!!u.wreck,width:s.width,latFinal:+lat.toFixed(2),clearOfCarriageway_m:+clear.toFixed(2),solidAtCentre:!!window.__solid(u.x,u.z),playerProgress6s_m:+prog.toFixed(1),playerMinDistToWreck:+minD.toFixed(2),nearestOther:nu,nearestD:+nd.toFixed(1),solidAhead:!!ahead,selfSolid,pos:[+a.x.toFixed(1),+a.z.toFixed(1)],autoV:+a.v.toFixed(1),speedFinal:+u.speed.toFixed(1)});
 }
 return out;},N);
for(const o of r)console.log(JSON.stringify(o));await b.close();process.exit(0);
