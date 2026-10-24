import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.env.URL || 'http://localhost:4180/';
const {stub, link} = JSON.parse(fs.readFileSync('/tmp/paths.json','utf8'));
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PE',String(e).slice(0,150)));
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate((stub,link)=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  window.__spawnAt(-203,-708,Math.atan2(-9,7));
  let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}};
  stp(40);
  const T0=window.__traffic();
  const segs=T0.__validSegs;
  const nearPts=(x,z,pts,tol)=>pts.some(q=>Math.hypot(q[0]-x,q[1]-z)<tol);
  const stubSegs=new Set(), linkSegs=new Set();
  for(const s of segs){
    if(nearPts(s.x1,s.z1,stub,2)&&nearPts(s.x2,s.z2,stub,2)) stubSegs.add(s);
    if(nearPts(s.x1,s.z1,link,2)&&nearPts(s.x2,s.z2,link,2)) linkSegs.add(s);
  }
  const fn=T0.__findNext;
  const si=s=>s?{x1:+s.x1.toFixed(1),z1:+s.z1.toFixed(1),x2:+s.x2.toFixed(1),z2:+s.z2.toFixed(1)}:null;
  const tips=[];
  // stub tip chord: endpoint at tip
  for(const s of stubSegs){ if(Math.hypot(s.x2-(-463.5),s.z2-(-734))<1.5){ tips.push({from:'stub-tip',dir:1,to:si((fn(s,s.x2,s.z2,s.ux,s.uz)||{}).seg),d:(fn(s,s.x2,s.z2,s.ux,s.uz)||{}).dir}); } }
  // link tail chord: endpoint at tail
  for(const s of linkSegs){ if(Math.hypot(s.x2-(-444.1),s.z2-(-779.3))<1.5){ const nx=fn(s,s.x2,s.z2,s.ux,s.uz); tips.push({from:'link-tail',dir:1,to:si(nx&&nx.seg),d:nx&&nx.dir}); }
    if(Math.hypot(s.x1-(-473.2),s.z1-(-754.2))<1.0){ const nx=fn(s,s.x1,s.z1,-s.ux,-s.uz); tips.push({from:'link-junction-rev',dir:-1,to:si(nx&&nx.seg),d:nx&&nx.dir}); } }
  // stub junction chord reverse
  for(const s of stubSegs){ if(Math.hypot(s.x1-(-473.2),s.z1-(-754.2))<1.0){ const nx=fn(s,s.x1,s.z1,-s.ux,-s.uz); tips.push({from:'stub-junction-rev',dir:-1,to:si(nx&&nx.seg),d:nx&&nx.dir}); } }
  const series=[]; let enteredStub=0, vanishedOnStub=0, enteredLink=0, vanishedOnLink=0, linkTraverse=0, stubTraverse=0;
  const prev=new Map();
  const steps=3600;
  for(let i=0;i<steps;i++){ stp(1);
    if(i%300===299){ const us=window.__traffic().units; const px=window.__game.auto.x, pz=window.__game.auto.z; let far=0; for(const u of us){ const dx=u.x-px, dz=u.z-pz; if(Math.hypot(dx,dz)>200) far++; } series.push({i,n:us.length,far,rec:window.__trc.recycled}); }
    const units=window.__traffic().units; const seen=new Set();
    for(const u of units){ seen.add(u);
      const onS=stubSegs.has(u.seg), onL=linkSegs.has(u.seg);
      const was=prev.get(u);
      if(onS&&!(was&&was.s)) enteredStub++;
      if(onL&&!(was&&was.l)) enteredLink++;
      if(was&&was.l&&!onL) linkTraverse++;
      if(was&&was.s&&!onS) stubTraverse++;
      prev.set(u,{s:onS,l:onL});
    }
    for(const [u,st] of prev){ if(!seen.has(u)){ if(st.s)vanishedOnStub++; if(st.l)vanishedOnLink++; prev.delete(u);} }
  }
  const trc=window.__trc;
  return {series, tips, nStubSegs:stubSegs.size, nLinkSegs:linkSegs.size, enteredStub, stubTraverse, vanishedOnStub, enteredLink, linkTraverse, vanishedOnLink, recycled:trc.recycled, failNext:trc.failNext, realFail:trc.realFail||0, failJump:trc.failJump, trans:trc.trans, log:trc.log.slice(0,24)};
}, stub, link);
console.log('ATTRIB', JSON.stringify(r));
await b.close(); process.exit(0);
