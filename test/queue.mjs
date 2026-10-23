import puppeteer from 'puppeteer-core';
const [port,mode]=[process.argv[2],process.argv[3]]; // mode hit|ctl
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate((mode)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto; const U=g.traffic.units; const hit=[];
 const vx=u=>u.x+(u.ox||0), vz=u=>u.z+(u.oz||0);
 if(mode==='hit'){
  for(const u of U.filter(u=>u.seg&&u.seg.len>40)){ if(hit.length>=3)break; if(hit.includes(u))continue; const s=u.seg,fx=s.ux*u.dir,fz=s.uz*u.dir;a.x=u.x-fx*10;a.z=u.z-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(5);
   window.__keys['KeyW']=true; for(let k=0;k<200;k++){stp(1); if(u.cool>0||u.kvx||u.kvz||u.ksv){hit.push(u);break;}} window.__keys['KeyW']=false; stp(40);}
 } else { stp(0); }
 window.__keys['KeyW']=false; a.v=0;
 const res={hits:hit.length,samples:[],minToHit:99,hitPos:hit.map(u=>[+vx(u).toFixed(1),+vz(u).toFixed(1)])};
 const refs=hit;
 for(let k=0;k<450;k++){stp(1);
  if(refs.length){for(const u of U){if(refs.includes(u))continue;for(const h of refs){const d=Math.hypot(vx(u)-vx(h),vz(u)-vz(h));if(d<res.minToHit&&u.seg)res.minToHit=d;}}}
  if(k%150===149){let st=0,n=0;for(const u of U){if(Math.hypot(u.x-a.x,u.z-a.z)<60){n++;if(u.speed<0.3&&!refs.includes(u))st++;}} res.samples.push({t:+(k*0.033).toFixed(0),nearUnits:n,stoppedNear:st});}
 }
 res.hitFinal=refs.map(u=>[+vx(u).toFixed(1),+vz(u).toFixed(1),!!u.wreck,+u.speed.toFixed(1)]);
 res.minToHit=+res.minToHit.toFixed(2);return res;},mode);
console.log(mode,JSON.stringify(r));await b.close();process.exit(0);
