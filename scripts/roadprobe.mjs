import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
const ROADS=[48,53,66,141,143,154,216,217,219,223,238,253,254,289,290,299,300,312,313,317,329,333,334,358,361,371,379,412,448,455];
console.log(JSON.stringify(await p.evaluate((ROADS)=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;
 const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
 const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
 const W=g.world.roads,out={};
 for(const ri of ROADS){const r=W[ri];if(!r){out[ri]='missing';continue}
  let n=0,b=0,worst=null;
  for(let i=0;i<r.p.length-1;i++){const a=r.p[i],c=r.p[i+1];const L=Math.hypot(c[0]-a[0],c[1]-a[1]);const ux=(c[0]-a[0])/L,uz=(c[1]-a[1])/L;const hd=Math.atan2(ux,uz);
   for(let t=0;t<=L;t+=0.5){n++;const x=a[0]+ux*t,z=a[1]+uz*t;if(!free(x,z,hd)){b++;if(!worst)worst=[+x.toFixed(0),+z.toFixed(0)]}}}
  out[ri]={pts:n,blocked:b,worst}}
 return out},ROADS)));
await b.close();
