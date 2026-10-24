import puppeteer from 'puppeteer-core';
const url = process.env.URL || 'http://localhost:4183/';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  const segs = window.__traffic().__validSegs;
  const solid = window.__solid;
  let solidLanes=0, total=0; const bad=[];
  for (const s of segs){
    const n = Math.max(2, Math.ceil(s.len));
    for (let k=0;k<=n;k++){
      const t=k/n;
      for (const dir of [1,-1]){
        const laneOffset = Math.min(2.05, Math.max(1.35, s.width*0.22));
        const x = s.x1 + s.ux*s.len*t + s.uz*laneOffset*dir;
        const z = s.z1 + s.uz*s.len*t - s.ux*laneOffset*dir;
        total++;
        if (solid(x,z)) { solidLanes++; if (bad.length<20) bad.push({x:+x.toFixed(1),z:+z.toFixed(1),seg:[ +s.x1.toFixed(1),+s.z1.toFixed(1),+s.x2.toFixed(1),+s.z2.toFixed(1)],len:+s.len.toFixed(1)}); }
      }
    }
  }
  return {segs:segs.length, samples:total, solidLanes, bad};
});
console.log('CHORDSOLID',JSON.stringify(r));
await b.close(); process.exit(0);
