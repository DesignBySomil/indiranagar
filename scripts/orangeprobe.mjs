import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  for(let k=0;k<60;k++){t0+=16;window.__step(0.016,t0);}
  const near=(list)=>list.filter(v=>Math.abs(v.x-(-90))<25&&Math.abs(v.z-222)<25).map(v=>({x:+v.x.toFixed(1),z:+v.z.toFixed(1),a:+((v.a||0)).toFixed(2),w:v.w,l:v.l,type:v.type||v.kind||null}));
  const P=g.parked.list?g.parked.list():(g.parked.vehicles||g.parked.items||[]);
  const T=g.traffic.list?g.traffic.list():(g.traffic.vehicles||g.traffic.items||[]);
  const out={parkedKeys:Object.keys(g.parked),trafficKeys:Object.keys(g.traffic),parked:[],traffic:[]};
  try{out.parked=near(Array.isArray(P)?P:[]);}catch(e){out.perr=String(e);}
  try{out.traffic=near(Array.isArray(T)?T:[]);}catch(e){out.terr=String(e);}
  // movement check: sample traffic positions twice 2s apart
  const t1=(Array.isArray(T)?T:[]).filter(v=>Math.abs(v.x-(-90))<25&&Math.abs(v.z-222)<25).map(v=>({x:+v.x.toFixed(1),z:+v.z.toFixed(1)}));
  for(let k=0;k<120;k++){t0+=16;window.__step(0.016,t0);}
  const t2=(Array.isArray(T)?T:[]).filter(v=>Math.abs(v.x-(-90))<25&&Math.abs(v.z-222)<25).map(v=>({x:+v.x.toFixed(1),z:+v.z.toFixed(1)}));
  out.t1=t1; out.t2=t2;
  return out;
});
console.log(JSON.stringify(r,null,1));
await b.close();
