import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
const out = await p.evaluate(()=>{
  const g=window.__game,K=window.__keys;
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const kindAt=(x,z,a)=>{
    const s=Math.sin(a),c=Math.cos(a);let dyn=0;
    for(const [lx,lz] of FP){
      const px=x+c*lx+s*lz, pz=z-s*lx+c*lz;
      if(window.__inDivider&&window.__inDivider(px,pz))return 1;
      if(g.solid(px,pz)||(g.parked&&g.parked.solid(px,pz)))return 1;
      if((g.life&&g.life.solid(px,pz))||(g.traffic&&g.traffic.solid(px,pz))||(g.crowd&&g.crowd.solid(px,pz)))dyn=2;
    }
    return dyn;
  };
  // recreate pole-1 start: pole (-447,-786.9) Swamy Vivekananda Road
  const pl={x:-447,z:-786.9};
  const S=g.roadSegs(); let seg=null;
  for(const s of S){const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);if(s.kind>=3&&L>20){const ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L,off=s.width/2+0.9;const px=s.x1-uz*off,pz=s.z1+ux*off;if(Math.hypot(px-pl.x,pz-pl.z)<0.6)seg={ux,uz}}}
  const ax=pl.x-seg.ux*8, az=pl.z-seg.uz*8;
  const a=Math.atan2(pl.x-ax,pl.z-az);
  g.auto.x=ax; g.auto.z=az; g.auto.a=a; g.auto.v=0; g.auto.steer=0;
  const log=[]; K.KeyW=true; let last={x:g.auto.x,z:g.auto.z};
  for(let i=0;i<400;i++){
    window.__step(0.05,performance.now());
    const j=Math.hypot(g.auto.x-last.x,g.auto.z-last.z);
    if(j>3){
      // state BEFORE the jump was at 'last': classify front/back there (heading unchanged pre-jump)
      log.push({step:i,jump:+j.toFixed(1),preFront:kindAt(last.x+Math.sin(g.auto.a)*1.5,last.z+Math.cos(g.auto.a)*1.5,g.auto.a),preBack:kindAt(last.x-Math.sin(g.auto.a)*1.5,last.z-Math.cos(g.auto.a)*1.5,g.auto.a),prePos:[+last.x.toFixed(1),+last.z.toFixed(1)],postPos:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)]});
    }
    if(i%80===0) log.push({step:i,pos:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)],v:+g.auto.v.toFixed(1)});
    last={x:g.auto.x,z:g.auto.z};
  }
  K.KeyW=false;
  return log;
});
console.log(JSON.stringify(out));
await b.close();
