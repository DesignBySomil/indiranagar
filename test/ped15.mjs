import puppeteer from 'puppeteer-core';
const port=process.argv[2],N=+process.argv[3]||3;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate((N)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,P=g.crowd.peds,out=[];
 const cands=P.filter(q=>!q.kn&&Math.hypot(q.x-a.x,q.z-a.z)<120).sort((x,y)=>Math.hypot(x.x-a.x,x.z-a.z)-Math.hypot(y.x-a.x,y.z-a.z));
 for(const q of cands){ if(out.length>=N)break;
  const yaw=Math.atan2(q.x-a.x,q.z-a.z),fx=Math.sin(yaw),fz=Math.cos(yaw);
  // approach from the road side: stand 8 m away toward the ped's nearest road... just face it
  a.x=q.x-fx*8;a.z=q.z-fz*8;a.a=yaw;a.v=0;stp(2);
  window.__keys['KeyW']=true;let hit=false;for(let k=0;k<120;k++){stp(1);if(q.kn){hit=true;break;}}
  window.__keys['KeyW']=false; if(!hit)continue;
  let px=q.x,pz=q.z,maxJ=0,jumpAt=-1,k0=0;const tr=[];
  for(let k=0;k<240;k++){stp(1);const j=Math.hypot(q.x-px,q.z-pz);if(j>maxJ){maxJ=j;jumpAt=k;}px=q.x;pz=q.z;if(k%40===39)tr.push([+q.x.toFixed(1),+q.z.toFixed(1),+(q.ky||0).toFixed(2),!!q.kn]);}
  out.push({maxStepJump_m:+maxJ.toFixed(2),atStep:jumpAt,trace:tr});
 }
 return out;},N);
console.log(JSON.stringify(r));await b.close();process.exit(0);
