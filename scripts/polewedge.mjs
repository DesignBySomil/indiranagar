import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
const out = await p.evaluate(()=>{
  const g=window.__game,K=window.__keys,S=g.roadSegs();
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
  // pole positions: k>=3, L>20 -> one pole per seg at (x1 - uz*off, z1 + ux*off), off = w/2+0.9
  const poles=[];
  for(const s of S){
    const L=Math.hypot(s.x2-s.x1,s.z2-s.z1); if(!(s.kind>=3&&L>20))continue;
    const ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L,off=s.width/2+0.9;
    poles.push({x:s.x1-uz*off,z:s.z1+ux*off,ux,uz,name:s.name});
  }
  const picks=[poles[Math.floor(poles.length*0.25)],poles[Math.floor(poles.length*0.5)],poles[Math.floor(poles.length*0.75)]].filter(Boolean);
  const res=[];
  for(const pl of picks){
    // aim from road centre 8m "before" the pole along road dir, dead-on at pole
    const sx=pl.x-pl.ux*8+pl.uz*(0.9+0), sz=pl.z-pl.uz*8-pl.ux*(0.9+0); // start on road edge line toward pole
    const ax=pl.x-pl.ux*8, az=pl.z-pl.uz*8; // projection point at pole's perpendicular
    const a=Math.atan2(pl.x-ax,pl.z-az);
    g.auto.x=ax; g.auto.z=az; g.auto.a=a; g.auto.v=0; g.auto.steer=0;
    if(!free(g.auto.x,g.auto.z,a)){res.push({pole:[+pl.x.toFixed(1),+pl.z.toFixed(1)],name:pl.name,skipped:'start not free'});continue}
    K.KeyW=true; let maxJump=0,reloc=0,minPoleDist=1e9,last={x:g.auto.x,z:g.auto.z};
    for(let i=0;i<400;i++){
      window.__step(0.05,performance.now());
      const d=Math.hypot(g.auto.x-pl.x,g.auto.z-pl.z); if(d<minPoleDist)minPoleDist=d;
      const j=Math.hypot(g.auto.x-last.x,g.auto.z-last.z); if(j>3){reloc++;maxJump=Math.max(maxJump,j)} last={x:g.auto.x,z:g.auto.z};
    }
    K.KeyW=false;
    res.push({pole:[+pl.x.toFixed(1),+pl.z.toFixed(1)],name:pl.name,minPoleDist:+minPoleDist.toFixed(2),reloc,maxJump:+maxJump.toFixed(1),end:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)],endFree:free(g.auto.x,g.auto.z,g.auto.a)});
  }
  return {poleCount:poles.length,res};
});
console.log(JSON.stringify(out));
await b.close();
