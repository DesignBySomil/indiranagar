import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:600000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;});
await new Promise(r=>setTimeout(r,2000));
const out=await p.evaluate(()=>{
  const g=window.__game,K=window.__keys;const res={};
  // A: boundary wall profile at x=-516.4, z from 744..758
  res.wallZ=[]; for(let z=744;z<=758;z+=1) res.wallZ.push([z, g.solid(-516.4,z)?1:0]);
  // also wall at the clamp corner region for x -509 (road8 dir-1 end)
  res.wallZ2=[]; for(let z=744;z<=758;z+=1) res.wallZ2.push([z, g.solid(-509,z)?1:0]);
  // B: v=0 spot (-611,-710): place auto, hold W 100 steps, log game-state flags
  g.auto.x=-611;g.auto.z=-710;g.auto.a=Math.PI/2;g.auto.v=0;g.auto.steer=0;
  const dom={card:getComputedStyle(document.getElementById('card')).display, start:getComputedStyle(document.getElementById('start')).display};
  const st0={hour:g.state.hour, auto:g.state.auto, keys:Object.keys(g.state)};
  K.KeyW=true; const vs=[];
  for(let n=1;n<=100;n++){ window.__step(0.05,performance.now()); if(n%20===0)vs.push([n,+g.auto.v.toFixed(2),+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)]); }
  K.KeyW=false;
  // solid ring around that spot
  const ring=[]; for(let k=0;k<8;k++){const an=k*Math.PI/4; ring.push([k*45, g.solid(-611+Math.cos(an)*2,-710+Math.sin(an)*2)?1:0, g.solid(-611+Math.cos(an)*4,-710+Math.sin(an)*4)?1:0]);}
  res.B={dom,st0,vs,ring, stopsNear:(g.stops||[]).filter(s=>Math.hypot((s.x??s[0]??0)+611,(s.z??s[1]??0)+710)<30).length, stopsGameState: g.stopsGame? Object.keys(g.stopsGame.state||{}):null};
  return res;
});
console.log('PROBE289C', JSON.stringify(out));
await b.close();
