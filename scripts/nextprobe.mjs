import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,900)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-108,-85,0); window.__noRender=true;
  const K=window.__keys; K.KeyW=true; let t0=90000;
  for(let k=0;k<900;k++){ t0+=33; window.__step(0.033,t0); }
  K.KeyW=false;
  for(let k=0;k<600;k++){t0+=33;window.__step(0.033,t0);}
  const t=window.__traffic();
  const frozen=t.units.filter(u=>u.speed===0&&u.t>0.9&&u.seg);
  console.log('FROZEN',frozen.length);
  for(const u of frozen.slice(0,4)){
    const s=u.seg, ex=s.x2, ez=s.z2;
    const nx=t.__findNext(s,ex,ez,s.ux,s.uz);
    let line='seg '+s.name+' exit('+ex.toFixed(1)+','+ez.toFixed(1)+') oneway='+(s.oneway?1:0)+' NEXT='+(nx?nx.seg.name+' d'+nx.dir:'NULL');
    // candidates within 25m of exit
    const cands=t.__segs.filter(q=>q!==s&&(Math.hypot(q.x1-ex,q.z1-ez)<25||Math.hypot(q.x2-ex,q.z2-ez)<25))
      .map(q=>{const d1=Math.hypot(q.x1-ex,q.z1-ez),d2=Math.hypot(q.x2-ex,q.z2-ez);
        const use1=d1<d2; const al=use1?(q.ux*s.ux+q.uz*s.uz):(-q.ux*s.ux-q.uz*s.uz);
        return q.name+'@'+Math.min(d1,d2).toFixed(1)+'m al='+al.toFixed(2)+(q.oneway?' ow':'');});
    console.log(line+' | cands: '+cands.slice(0,5).join(' ; '));
  }
});
await b.close(); process.exit(0);
