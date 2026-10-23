import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?traffic=150',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__noRender=true;
  let t0=90000; const step=()=>{t0+=33;window.__step(0.033,t0);};
  for(let k=0;k<400;k++) step();
  const T=window.__traffic(), U=T.units, segs=T.__validSegs||T.__segs;
  const fmt=(u,i)=>({i,x:+u.x.toFixed(1),z:+u.z.toFixed(1),seg:((u.seg&&u.seg.i!==undefined)?u.seg.i:u.seg),t:+u.t.toFixed(3),dir:u.dir,speed:+u.speed.toFixed(2),braking:u.braking});
  const targets=[32,54].map(i=>({idx:i,...(U[i]?fmt(U[i],i):{missing:true})}));
  const near=U.map((u,i)=>({u,i})).filter(({u})=>Math.hypot(u.x-430.5,u.z+718.8)<15).map(({u,i})=>fmt(u,i));
  const segInfo=s=>s?{i:s.i??segs.indexOf(s),x1:+s.x1.toFixed(1),z1:+s.z1.toFixed(1),x2:+s.x2.toFixed(1),z2:+s.z2.toFixed(1),w:s.w,len:+Math.hypot(s.x2-s.x1,s.z2-s.z1).toFixed(1)}:null;
  const involvedSegs=[...new Set(near.map(u=>u.seg))].map(si=>{const s=segs[si]||null;return segInfo(s);});
  // leaders ahead of units 32 and 54 on their (seg,dir)
  const leaders=[32,54].map(i=>{const u=U[i]; if(!u) return null;
    let best=null,bd=1e9;
    for(let j=0;j<U.length;j++){const v=U[j]; if(j===i||v.seg!==u.seg||v.dir!==u.dir) continue;
      const d=u.dir>0?(v.t-u.t):(u.t-v.t); if(d>0&&d<bd){bd=d;best={j,t:+v.t.toFixed(3),speed:+v.speed.toFixed(2),braking:v.braking};}}
    return {i,leaderAhead:best,gapT:best?+bd.toFixed(4):null};});
  return {targets,near,involvedSegs,leaders};
});
console.log(JSON.stringify(out,null,1));
await b.close(); process.exit(0);
