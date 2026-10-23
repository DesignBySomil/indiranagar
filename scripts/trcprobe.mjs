import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,1500)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-108,-85,0); window.__noRender=true;
  const K=window.__keys; K.KeyW=true; let t0=90000;
  for(let k=0;k<600;k++){ t0+=33; window.__step(0.033,t0); }
  K.KeyW=false;
  for(let k=0;k<900;k++){t0+=33;window.__step(0.033,t0);}
  const W=window.__trc||{};
  console.log('TRC trans='+W.trans+' failNext='+W.failNext+' failJump='+W.failJump+' held='+W.held+' recycled='+W.recycled);
  console.log('LOG '+JSON.stringify(W.log||[]));
  const fr=window.__traffic().units.filter(u=>u.speed===0&&u.t>0.9);
  console.log('STILL FROZEN t>0.9: '+fr.length+' '+JSON.stringify(fr.slice(0,4).map(u=>({seg:u.seg.name,t:+u.t.toFixed(3),z:+u.z.toFixed(1)}))));
});
await b.close(); process.exit(0);
