import puppeteer from 'puppeteer-core';
const port=process.argv[2],N=+process.argv[3]||4;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate((N)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,scene=window.__scene,out=[];
 const wr=[];scene.traverse(o=>{if(o.isGroup&&o.children.length===2&&o.children[0].isGroup&&o.children[1]&&o.parent&&o.parent!==scene&&Math.abs(o.position.x)+Math.abs(o.position.z)>1)wr.push(o);});
 for(const w of wr){ if(out.length>=N)break;
  const yaw=w.rotation.y,fx=Math.sin(yaw),fz=Math.cos(yaw);a.x=w.position.x-fx*9;a.z=w.position.z-fz*9;a.a=yaw;a.v=0;stp(3);
  const x0=w.position.x,z0=w.position.z;window.__keys['KeyW']=true;let hit=false,ymax=0;for(let k=0;k<150;k++){stp(1);ymax=Math.max(ymax,w.position.y);if(Math.hypot(w.position.x-x0-(0),w.position.z-z0)>0&&w.position.y>0.2){hit=true;break;}}
  window.__keys['KeyW']=false; if(!hit)continue;
  const hx=a.x,hz=a.z,hy=a.a; for(let k=0;k<150;k++){stp(1);ymax=Math.max(ymax,w.position.y);}
  const dx=w.position.x-x0,dz=w.position.z-z0; const along=dx*fx+dz*fz, lat=dx*fz-dz*fx;
  a.x=hx-fx*3;a.z=hz-fz*3;a.a=yaw;a.v=0;const sx=a.x,sz=a.z;window.__keys['KeyW']=true;let minD=99;for(let k=0;k<180;k++){stp(1);minD=Math.min(minD,Math.hypot(a.x-w.position.x,a.z-w.position.z));}window.__keys['KeyW']=false;
  out.push({hopPeak:+ymax.toFixed(2),movedAlong:+along.toFixed(2),movedLateral:+lat.toFixed(2),finalY:+w.position.y.toFixed(2),finalSolidCentre:!!g.solid(w.position.x,w.position.z),playerProgress6s:+((a.x-sx)*fx+(a.z-sz)*fz).toFixed(1),minDistToStruck:+minD.toFixed(2)});
 }
 return {n:wr.length,out};},N);
console.log(JSON.stringify(r));await b.close();process.exit(0);
