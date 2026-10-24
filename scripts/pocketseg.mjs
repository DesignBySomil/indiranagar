import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=800,450']});
const p=await b.newPage(); await p.setViewport({width:800,height:450});
await p.goto('http://127.0.0.1:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  let T=90000; for(let i=0;i<40;i++){T+=33;window.__step(0.033,T);}
  const segs=window.__traffic().__validSegs;
  const pk=segs.filter(s=>Math.hypot((s.x1+s.x2)/2+465,(s.z1+s.z2)/2+750)<40).map(s=>({n:s.name,ow:s.oneway?1:0,x1:+s.x1.toFixed(1),z1:+s.z1.toFixed(1),x2:+s.x2.toFixed(1),z2:+s.z2.toFixed(1),len:+s.len.toFixed(1)}));
  return pk;
});
console.log(JSON.stringify(r,null,0));
// visual 1: 100 Feet Road site, player parked mid-approach facing north
await p.evaluate(()=>{ window.__spawnAt(-146,-760,0.05); let T=window.__T||90000; window.__noRender=false; for(let k=0;k<50;k++){T+=33;window.__step(0.033,T);} window.__T=T; });
await new Promise(r2=>setTimeout(r2,700));
await p.screenshot({path:'/tmp/site_100ft.png'});
// visual 2: pocket link, player on southern link section facing north toward corner
await p.evaluate(()=>{ window.__noRender=true; window.__spawnAt(-448,-770,0.6); let T=window.__T||90000; for(let k=0;k<8;k++){T+=33;window.__step(0.033,T);} window.__noRender=false; for(let k=0;k<50;k++){T+=33;window.__step(0.033,T);} window.__T=T; });
await new Promise(r2=>setTimeout(r2,700));
await p.screenshot({path:'/tmp/site_pocket.png'});
await b.close(); console.log('shots done');
