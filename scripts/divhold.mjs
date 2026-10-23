import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game && window.__step',{timeout:180000});
const res = await p.evaluate(async ()=>{
  const g=window.__game,K=window.__keys; g.state.hour=12; g.state.auto=false; g.go(); window.__noRender=true; window.__paused=true;
  const out=[];
  const hits=[]; for(let z=-700;z<760;z+=4) for(let x=-640;x<810;x+=4){ if(window.__inDivider(x,z)) hits.push([x,z]); }
  out.push({dividerSamples:hits.length});
  const pick=[hits[Math.floor(hits.length*0.2)],hits[Math.floor(hits.length*0.5)],hits[Math.floor(hits.length*0.8)]].filter(Boolean);
  for (const [hx,hz] of pick) for (const ang of [0,Math.PI/2,Math.PI,-Math.PI/2]) {
    const fx=Math.sin(ang), fz=Math.cos(ang);
    g.auto.x=hx-fx*5; g.auto.z=hz-fz*5; g.auto.a=ang; g.auto.v=0; g.auto.steer=0;
    const start={x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1),a:+ang.toFixed(2)};
    K.KeyW=true; let last={x:g.auto.x,z:g.auto.z},reloc=0,maxJump=0;
    for(let i=0;i<300;i++){ window.__step(0.05,performance.now()+i*50); const j=Math.hypot(g.auto.x-last.x,g.auto.z-last.z); if(j>3){reloc++;maxJump=Math.max(maxJump,j);} last={x:g.auto.x,z:g.auto.z}; }
    K.KeyW=false;
    out.push({div:[hx,hz],start,end:{x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1),a:+g.auto.a.toFixed(2)},reloc,maxJump:+maxJump.toFixed(1)});
  }
  return out;
});
console.log(JSON.stringify(res,null,0));
await b.close();
