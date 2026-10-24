import fs from 'fs';
import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=800,450']});
const p=await b.newPage();
await p.goto(process.env.URL||'http://127.0.0.1:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step&&window.__traffic,{timeout:180000});
const out=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noCardUntil=performance.now()+600000;
  window.__noRender=true; window.__spawnAt(-317,-709,0);
  let T=90000; for(let i=0;i<30;i++){T+=33;window.__step(0.033,T);}
  const tracks=new Map(); // unit -> {segs:Set, samples:[[segKey,t,dir]...]}
  const segOf=u=>u.seg?[u.seg.x1.toFixed(0),u.seg.z1.toFixed(0),u.seg.x2.toFixed(0),u.seg.z2.toFixed(0)].join(','):'none';
  const interesting=(u,x,z)=>{
    const k=segOf(u);
    if(k.startsWith('-143,-708')||k.startsWith('-148,-808')) return true;      // 100Feet approach+continuation
    if(Math.hypot(x-(-460),z-(-745))<45) return true;                            // pocket area
    return false;
  };
  for(let s=0;s<2400;s++){
    T+=33; window.__step(0.033,T);
    if(s%10===0){
      for(const u of window.__traffic().units){
        if(!u.seg) continue;
        const pos=u; // units carry x/z
        if(interesting(u,pos.x,pos.z)){
          if(!tracks.has(u)) tracks.set(u,[]);
          tracks.get(u).push([segOf(u),+u.t.toFixed(3),u.dir,+u.speed.toFixed(1)]);
        }
      }
    }
  }
  const summ=[];
  for(const [u,tr] of tracks){
    const bySeg={};
    for(const [k,t,dir,sp] of tr){ (bySeg[k]=bySeg[k]||[]).push([t,dir,sp]); }
    const o={samples:tr.length,segs:{}};
    for(const k in bySeg){ const ts=bySeg[k].map(e=>e[0]);
      o.segs[k]={n:ts.length,t0:ts[0],tMax:Math.max(...ts),tEnd:ts[ts.length-1],dir:bySeg[k][0][1],maxSpeed:Math.max(...bySeg[k].map(e=>e[2]))};
    }
    summ.push(o);
  }
  return {units:tracks.size,summ,trc:window.__trc&&{trans:window.__trc.trans,failNext:window.__trc.failNext,failJump:window.__trc.failJump,held:window.__trc.held,recycled:window.__trc.recycled}};
});
fs.writeFileSync('/tmp/flowprobe.json',JSON.stringify(out));
console.log('units tracked:',out.units,'trc:',JSON.stringify(out.trc));
// print compact per-unit summary for 100Feet continuation chord
const cont='-143,-708,-130,-483', appr='-148,-808,-143,-708';
for(const s of out.summ){
  const c=s.segs[cont], a=Object.keys(s.segs).find(k=>k.startsWith('-14')&&k.includes('-808'));
  if(c) console.log('CONT', JSON.stringify(c), 'other:', Object.keys(s.segs).filter(k=>k!==cont).join(' | ').slice(0,90));
}
await b.close();
