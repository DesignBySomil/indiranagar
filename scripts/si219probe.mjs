import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  g.auto.x=-32; g.auto.z=440; g.auto.a=0; g.auto.v=0;
  // what is solid around the stop point
  const grid=[];
  for(let dx=-6;dx<=6;dx+=2){const row=[];for(let dz=-6;dz<=6;dz+=2){row.push(g.solid(g.auto.x+dx,g.auto.z+dz)?1:0);}grid.push(row.join(''));}
  // which sets block at the exact point and 2m ahead along 9th Main (seg 219 direction)
  const seg=g.roadSegs()[219];
  const probe=(x,z)=>({base:g.solid(x,z),parked:g.parked.solid(x,z),traffic:g.traffic.solid(x,z),crowd:g.crowd?g.crowd.solid(x,z):null});
  return {seg:{ax:seg.ax,az:seg.az,bx:seg.bx,bz:seg.bz},grid,at:probe(-32,440),ahead:probe(-32,434),behind:probe(-32,446)};
});
console.log(JSON.stringify(r));
await b.close();
