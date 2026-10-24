import puppeteer from 'puppeteer-core';
const url = process.env.URL || 'http://localhost:4180/';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  let T=90000; for(let i=0;i<40;i++){T+=33;window.__step(0.033,T);}
  const segs=window.__traffic().__validSegs;
  const raw=segs.filter(s=>Math.hypot(s.x2-(-143),s.z2-(-708))<6||Math.hypot(s.x1-(-143),s.z1-(-708))<6);
  const near=raw.map(s=>({name:s.name,ow:s.oneway?1:0,x1:+s.x1.toFixed(1),z1:+s.z1.toFixed(1),x2:+s.x2.toFixed(1),z2:+s.z2.toFixed(1),len:+s.len.toFixed(1),w:s.width}));
  const fn=window.__traffic().__findNext;
  const tests=raw.map(s=>{
    const f=fn(s,s.x2,s.z2,s.ux,s.uz); const r2=fn(s,s.x1,s.z1,-s.ux,-s.uz);
    return {from:[+s.x2.toFixed(1),+s.z2.toFixed(1)], fwd:f?{name:f.seg.name,x1:+f.seg.x1.toFixed(1),z1:+f.seg.z1.toFixed(1),x2:+f.seg.x2.toFixed(1),z2:+f.seg.z2.toFixed(1),dir:f.dir}:null,
            rev:r2?{name:r2.seg.name,dir:r2.dir}:null}; });
  return {near, tests};
});
console.log('SEGDUMP', JSON.stringify(r));
await b.close(); process.exit(0);
