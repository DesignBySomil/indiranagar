import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,500)));
const p2=p;
// page created above
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-108,-85,0);
  window.__noRender=true;
  const A=g.auto,K=window.__keys; K.KeyW=true;
  let t0=90000;
  const snap=(tag)=>{
    const t=window.__traffic();
    const near=t.units.filter(u=>Math.hypot(u.x-A.x,u.z-A.z)<55&&u.seg&&u.seg.name==='100 Feet Road');
    console.log(tag,JSON.stringify(near.slice(0,8).map(u=>({z:+u.z.toFixed(1),t:+u.t.toFixed(3),v:+u.speed.toFixed(2),max:u.maxSpeed,type:u.type||u.key||'',segL:+(u.seg.len||0).toFixed(0)}))));
    return near.map(u=>({t:+u.t.toFixed(3),v:+u.speed.toFixed(2)}));
  };
  // drive until wedged
  let wedged=false;
  for(let k=0;k<1500&&!wedged;k++){ t0+=33; window.__step(0.033,t0);
    if(k>150&&Math.abs(A.v)<0.35){ wedged=true; } }
  K.KeyW=false;
  snap('WEDGE@'+Math.round(A.z));
  const s0=snap('T0');
  for(let k=0;k<300;k++){t0+=33;window.__step(0.033,t0);}
  const s1=snap('T10s');
  for(let k=0;k<600;k++){t0+=33;window.__step(0.033,t0);}
  const s2=snap('T30s');
  return {s0,s1,s2};
});
console.log('DONE',JSON.stringify(out.s0&&out.s0.length));
await b.close(); process.exit(0);
