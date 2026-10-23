import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
const res = await p.evaluate(()=>{
  const g=window.__game; g.state.hour=14; g.state.auto=false; g.go(); window.__noRender=true; window.__paused=true;
  const P=window.__piers||[];
  const pier=(x,z)=>{for(let i=0;i<P.length;i++){const dx=x-P[i][0],dz=z-P[i][1];if(dx*dx+dz*dz<1.32)return true}return false};
  const out={};
  for(const ri of [2,8,9]){
    const r=g.world.roads[ri]; const pts=r.p;
    let s=0,dv=0,pi=0,f=0; const badSamples=[];
    for(let i=0;i<pts.length;i++){
      const [x,z]=pts[i];
      const isS=g.solid(x,z), isD=window.__inDivider(x,z), isP=pier(x,z);
      if(isS){s++; if(badSamples.length<6)badSamples.push([i,+x.toFixed(1),+z.toFixed(1)])}
      else if(isD)dv++; else if(isP)pi++; else f++;
    }
    out['road'+ri]={n:pts.length,solid:s,divider:dv,pier:pi,free:f,k:r.k,name:r.n,badSamples};
  }
  return out;
});
console.log(JSON.stringify(res));
await b.close();
