import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+(process.env.PORT||4195)+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}};stp(10);
 const U=g.traffic.units;const out=[];
 const segs=[...new Set(U.map(u=>u.seg))].filter(s=>s.len>120&&!s.oneway);
 const seg=segs[0];
 const a=g.auto; a.x=seg.x1+seg.ux*seg.len*0.5+150; a.z=seg.z1+seg.uz*seg.len*0.5+150; // player far away
 for(const same of [1,-1]){for(const lat of [0,2.5,-2.5,6,-6]){
  const cands=U.filter(u=>!u.wreck);const w=cands[0],f=cands[1],o=cands[2];
  // park every other unit far away by sending them to another segment? just freeze them
  const alt=segs[1]||segs[0];U.forEach(u=>{if(u!==w&&u!==f){if(u.seg===seg&&alt!==seg){u.seg=alt;u.t=0.5;}u.speed=0;}});
  for(const u of [w,f]){u.seg=seg;u.dir=same;u.ox=u.oz=u.oyaw=0;u.kvx=u.kvz=u.ksv=0;u.kx=u.kz=0;u.wreck=false;}
  w.t=0.5;w.dir=1;f.dir=same;f.t=same===1?0.5-14/seg.len:0.5+14/seg.len;f.speed=f.maxSpeed;
  const nx=seg.uz,nz=-seg.ux; w.ox=nx*lat;w.oz=nz*lat;w.oyaw=0;w.wreck=true;w.speed=0;
  let minGap=99,v1=0;for(let k=0;k<180;k++){stp(1);U.forEach(u=>{if(u!==w&&u!==f)u.speed=0;});const d=Math.hypot(f.x-w.x,f.z-w.z);minGap=Math.min(minGap,d);}
  const passed=((w.x-f.x)*seg.ux+(w.z-f.z)*seg.uz)*same<0;
  out.push({followerDir:same,wreckLatOffset:lat,minCentreDist:+minGap.toFixed(1),finalSpeed:+f.speed.toFixed(1),passedWreck:passed,laneW:seg.width});
 }}
 return out;});
console.log('WK',JSON.stringify(r));await b.close();process.exit(0);
