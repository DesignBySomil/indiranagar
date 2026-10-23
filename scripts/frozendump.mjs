import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,900)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-108,-85,0); window.__noRender=true;
  const K=window.__keys; K.KeyW=true; let t0=90000;
  for(let k=0;k<600;k++){ t0+=33; window.__step(0.033,t0); }
  K.KeyW=false;
  for(let k=0;k<900;k++){t0+=33;window.__step(0.033,t0);}
  const t=window.__traffic();
  const fr=t.units.filter(u=>u.speed===0&&u.t>0.85);
  for(const u of fr.slice(0,6)){
    const s=u.seg, ex=u.dir===1?s.x2:s.x1, ez=u.dir===1?s.z2:s.z1;
    const nx=t.__findNext(s,ex,ez,s.ux*u.dir,s.uz*u.dir);
    let why='';
    if(!nx) why='findNext NULL';
    else {
      const owBlock=nx.seg.oneway&&nx.dir!==1;
      why=owBlock?'oneway-block':'next='+nx.seg.name+' d'+nx.dir;
    }
    console.log('F '+(s.name||'?')+' exit('+ex.toFixed(1)+','+ez.toFixed(1)+') ow='+(s.oneway?1:0)+' -> '+why);
    if(nx){
      const vs=t.__validSegs;
      const cands=vs.filter(q=>q!==s&&(Math.hypot(q.x1-ex,q.z1-ez)<22||Math.hypot(q.x2-ex,q.z2-ez)<22))
        .map(q=>q.name+'@'+Math.min(Math.hypot(q.x1-ex,q.z1-ez),Math.hypot(q.x2-ex,q.z2-ez)).toFixed(1)+(q.oneway?'/ow':''));
      console.log('   cands: '+cands.slice(0,6).join(' ; '));
    }
  }
  console.log('NFROZEN '+fr.length);
});
await b.close(); process.exit(0);
