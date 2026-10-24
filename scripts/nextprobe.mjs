import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(process.env.URL||'http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  const segs=window.__traffic().__validSegs;
  const seg=segs.find(s=>Math.abs(s.x1+361)<1&&Math.abs(s.z1+699.5)<1&&Math.abs(s.x2+310.1)<1);
  if(!seg) return {err:'seg not found'};
  const out={};
  for (const dir of [1,-1]){
    const exitX=dir===1?seg.x2:seg.x1, exitZ=dir===1?seg.z2:seg.z1;
    const ux=dir===1?seg.ux:-seg.ux, uz=dir===1?seg.uz:-seg.uz;
    const cands=[];
    for (const s of segs){ if(s===seg) continue;
      const d1=Math.hypot(s.x1-exitX,s.z1-exitZ), d2=Math.hypot(s.x2-exitX,s.z2-exitZ);
      if(d1<22) cands.push({sc:+(30-d1+(s.ux*ux+s.uz*uz)*8).toFixed(1),gap:+d1.toFixed(1),dir:1,align:+(s.ux*ux+s.uz*uz).toFixed(2),ends:[[+s.x1.toFixed(1),+s.z1.toFixed(1)],[+s.x2.toFixed(1),+s.z2.toFixed(1)]],name:s.name,len:+s.len.toFixed(1)});
      if(d2<22) cands.push({sc:+(30-d2+((-s.ux)*ux+(-s.uz)*uz)*8).toFixed(1),gap:+d2.toFixed(1),dir:-1,align:+((-s.ux)*ux+(-s.uz)*uz).toFixed(2),ends:[[+s.x1.toFixed(1),+s.z1.toFixed(1)],[+s.x2.toFixed(1),+s.z2.toFixed(1)]],name:s.name,len:+s.len.toFixed(1)});
    }
    cands.sort((a,b)=>b.sc-a.sc);
    out['exit_dir'+dir]=[exitX,exitZ]; out['cands_dir'+dir]=cands.slice(0,4);
  }
  return out;
});
console.log('NEXT',JSON.stringify(r,null,1));
await b.close(); process.exit(0);
