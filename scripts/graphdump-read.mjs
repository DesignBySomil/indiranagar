import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=800,450']});
const p=await b.newPage(); await p.setViewport({width:800,height:450});
await p.goto('http://127.0.0.1:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000;
  let T=90000; for(let i=0;i<40;i++){T+=33;window.__step(0.033,T);}
  const segs=window.__traffic().__validSegs;
  const pk=segs.filter(s=>true).map(s=>({rid:s.rid,n:s.name,ow:s.oneway?1:0,x1:+s.x1.toFixed(1),z1:+s.z1.toFixed(1),x2:+s.x2.toFixed(1),z2:+s.z2.toFixed(1),len:+s.len.toFixed(1)}));
  return pk;
});
console.log(JSON.stringify(r,null,0));
await b.close();
