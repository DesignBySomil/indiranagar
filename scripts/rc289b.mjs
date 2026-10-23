import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>{const g=window.__game; g.go(); window.__paused=true;
  const out={};
  for(const ri of [2,8,9]){
    const pts=g.world.roads[ri].p; let sIn=0,fIn=0,oob=0; const badIn=[];
    for(let i=0;i<pts.length-1;i++){
      const [ax,az]=pts[i],[bx,bz]=pts[i+1]; const L=Math.hypot(bx-ax,bz-az); const n=Math.max(1,Math.ceil(L/2));
      for(let k=0;k<=n;k++){ const x=ax+(bx-ax)*k/n, z=az+(bz-az)*k/n;
        if(Math.abs(x)>=999||Math.abs(z)>=999){oob++;continue}
        if(g.solid(x,z)){sIn++; if(badIn.length<6)badIn.push([+x.toFixed(1),+z.toFixed(1)])} else fIn++;
      }}
    out['road'+ri]={inBoundsSolid:sIn,inBoundsFree:fIn,outOfBounds:oob,badIn};
  }
  return out})));
await b.close();
