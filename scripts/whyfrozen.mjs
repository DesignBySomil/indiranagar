import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,900)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-117.9,-260,0); window.__noRender=true;
  const K=window.__keys; K.KeyW=true; let t0=90000;
  for(let k=0;k<500;k++){ t0+=33; window.__step(0.033,t0); }
  K.KeyW=false;
  for(let k=0;k<500;k++){t0+=33;window.__step(0.033,t0);}
  const t=window.__traffic();
  const A=g.auto;
  const frozen=t.units.filter(u=>u.speed===0&&Math.hypot(u.x-A.x,u.z-A.z)<60);
  console.log('player@'+A.x.toFixed(1)+','+A.z.toFixed(1)+' frozenNear='+frozen.length);
  for(const u of frozen.slice(0,8)){
    // leader: same seg, same dir, next higher progress
    const prog=u=>u.dir===1?u.t:1-u.t;
    const mates=t.units.filter(q=>q!==u&&q.seg===u.seg&&q.dir===u.dir&&prog(q)>prog(u)).sort((a,b2)=>prog(a)-prog(b2));
    const L=mates[0];
    const gap=L?(prog(L)-prog(u))*u.seg.len:-1;
    // player brake geometry
    const dpX=A.x-u.x, dpZ=A.z-u.z;
    const fdx=u.seg.ux*u.dir, fdz=u.seg.uz*u.dir;
    const fwd=dpX*fdx+dpZ*fdz, lat=Math.abs(-dpX*fdz+dpZ*fdx);
    console.log((u.seg.name||'?')+' t='+u.t.toFixed(3)+' braking='+(u.braking?1:0)+' max='+u.maxSpeed.toFixed(1)+' leader='+(L?('gap'+gap.toFixed(1)+' v'+L.speed.toFixed(1)):'NONE')+' playerFwd='+fwd.toFixed(1)+' lat='+lat.toFixed(1)+' held='+(u.__held||0)+(u.__why?'/'+u.__why:''));
  }
});
await b.close(); process.exit(0);
