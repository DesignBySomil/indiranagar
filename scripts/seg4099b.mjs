import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
// coverage: total segs, window-selected segs, per-fixed-road seg coverage
const cov = await p.evaluate(()=>{
  const g=window.__game,S=g.roadSegs();
  const W=[[-460,-740],[410,-527],[-420,205],[-453,215],[-490,130],[-430,275],[-425,108],[-490,280],[-430,225],[-400,220],[-460,155],[288,-570],[-395,135],[-580,235]];
  const sel=S.filter(s=>W.some(w=>Math.hypot(w[0]-(s.x1+s.x2)/2,w[1]-(s.z1+s.z2)/2)<16));
  return {totalSegs:S.length, selected:sel.length};
});
console.log('COVERAGE '+JSON.stringify(cov));
// 4099 repro with tracing
const trace = await p.evaluate(()=>{
  const g=window.__game,K=window.__keys,S=g.roadSegs();const s=S[4099];
  const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);const ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L;
  // follow the full road-320 repaired polyline via roadSegs chain: use segs 4099..4101 if they continue
  const chain=[4099,4100,4101].filter(i=>S[i]);
  g.auto.x=s.x1;g.auto.z=s.z1;g.auto.a=Math.atan2(ux,uz);g.auto.v=0;g.auto.steer=0;
  const log=[];let prog=0;
  for(let n=0;n<1400;n++){
    // target: lookahead along seg then next segs
    let tx,tz;{let rem=prog+7,ci=0;let ax=s.x1,az=s.z1;
      while(true){const c=S[chain[ci]]||s;const cl=Math.hypot(c.x2-c.x1,c.z2-c.z1);
        if(ci===0){const rl=cl-rem>0?rem:cl;tx=ax+ (c.x2-c.x1)/cl*rl; tz=az+(c.z2-c.z1)/cl*rl; if(rem<cl)break; rem-=cl; ci++; ax=c.x2;az=c.z2; if(ci>=chain.length)break;}
        else{const c2=S[chain[ci]]; if(!c2)break; const cl2=Math.hypot(c2.x2-c2.x1,c2.z2-c2.z1); const rl=Math.min(rem,cl2); tx=ax+(c2.x2-c2.x1)/cl2*rl; tz=az+(c2.z2-c2.z1)/cl2*rl; if(rem<cl2)break; rem-=cl2; ax=c2.x2; az=c2.z2; ci++; if(ci>=chain.length)break;}}}
    const ta=Math.atan2(tx-g.auto.x,tz-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
    K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<7;
    window.__step(0.05,performance.now());
    const dx=g.auto.x-s.x1,dz=g.auto.z-s.z1;prog=dx*ux+dz*uz;
    if(n%10===0){const a=g.auto.a;const fx=Math.sin(a),fz=Math.cos(a);
      log.push([n*0.05,+g.auto.x.toFixed(1),+g.auto.z.toFixed(1),+a.toFixed(2),+g.auto.v.toFixed(2),g.solid(g.auto.x+fx*2,g.auto.z+fz*2)?1:0,g.solid(g.auto.x-fx*0.9,g.auto.z-fz*0.9)?1:0,+prog.toFixed(1)]);}
    if(prog>=L+30)break;
  }
  K.KeyW=K.KeyA=K.KeyD=false;
  return {seg:{x1:s.x1,z1:s.z1,x2:s.x2,z2:s.z2},L:+L.toFixed(1),final:log[log.length-1],log};
});
console.log('SEG '+JSON.stringify(trace.seg)+' L='+trace.L);
for(const r of trace.log)console.log(r.join(' '));
await b.close();
