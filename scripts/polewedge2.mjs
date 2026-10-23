import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
const out = await p.evaluate(()=>{
  const g=window.__game,K=window.__keys,S=g.roadSegs();
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const hitFull=(x,z,a)=>{
    const s=Math.sin(a),c=Math.cos(a);
    for(const [lx,lz] of FP){const px=x+c*lx+s*lz,pz=z-s*lx+c*lz;
      if((window.__inDivider&&window.__inDivider(px,pz))||g.solid(px,pz)||(g.parked&&g.parked.solid(px,pz)))return true}
    return false;
  };
  const poles=[];
  for(const s of S){
    const L=Math.hypot(s.x2-s.x1,s.z2-s.z1); if(!(s.kind>=3&&L>20))continue;
    const ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L,off=s.width/2+0.9;
    poles.push({x:s.x1-uz*off,z:s.z1+ux*off,ux,uz,nx:-uz,nz:ux,off,name:s.name});
  }
  const picks=[poles[Math.floor(poles.length*0.25)],poles[Math.floor(poles.length*0.5)],poles[Math.floor(poles.length*0.75)],poles[Math.floor(poles.length*0.9)]].filter(Boolean);
  const res=[];
  for(const pl of picks){
    // start on the road CENTRELINE, 8m along-road from the pole's perpendicular foot
    const cx=pl.x-pl.nx*pl.off, cz=pl.z-pl.nz*pl.off;
    const sx=cx-pl.ux*8, sz=cz-pl.uz*8;
    const a=Math.atan2(pl.x-sx,pl.z-sz);
    if(hitFull(sx,sz,a)){res.push({pole:[+pl.x.toFixed(1),+pl.z.toFixed(1)],name:pl.name,skipped:'start embedded (full-collision)'});continue}
    g.auto.x=sx; g.auto.z=sz; g.auto.a=a; g.auto.v=0; g.auto.steer=0;
    K.KeyW=true; let reloc=0,maxJump=0,minPoleDist=1e9,last={x:g.auto.x,z:g.auto.z},step0jump=0;
    for(let i=0;i<400;i++){
      window.__step(0.05,performance.now());
      const d=Math.hypot(g.auto.x-pl.x,g.auto.z-pl.z); if(d<minPoleDist)minPoleDist=d;
      const j=Math.hypot(g.auto.x-last.x,g.auto.z-last.z); if(j>3){reloc++;maxJump=Math.max(maxJump,j);if(i===0)step0jump=1}
      last={x:g.auto.x,z:g.auto.z};
    }
    K.KeyW=false;
    // escape check: hold reverse 3s, measure movement
    const r0={x:g.auto.x,z:g.auto.z}; K.KeyS=true;
    for(let i=0;i<60;i++)window.__step(0.05,performance.now());
    K.KeyS=false;
    const revMoved=Math.hypot(g.auto.x-r0.x,g.auto.z-r0.z);
    res.push({pole:[+pl.x.toFixed(1),+pl.z.toFixed(1)],name:pl.name,minPoleDist:+minPoleDist.toFixed(2),reloc,maxJump:+maxJump.toFixed(1),step0jump,revMoved:+revMoved.toFixed(1),end:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)]});
  }
  return {poleCount:poles.length,res};
});
console.log(JSON.stringify(out));
await b.close();
