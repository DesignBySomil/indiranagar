import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=1280,800']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0);
  const u=g.traffic.units.find(u=>u.x!==0&&u.seg&&u.seg.len>60);
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  g.auto.x=u.x-fx*5.2; g.auto.z=u.z-fz*5.2; g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<10;k++){t0+=16;window.__step(0.016,t0);}
  const ok=g.traffic.kickAt(u.x,u.z,fx,fz,5.5);
  for(let k=0;k<14;k++){t0+=16;window.__step(0.016,t0);} // freeze near peak
  window.__noRender=false;
  return {ok,off:+Math.hypot(u.kx,u.kz).toFixed(2),ky:+u.ky.toFixed(2),ks:+u.ks.toFixed(2)};
});
await new Promise(r=>setTimeout(r,900));
await p.screenshot({path:'/tmp/impact-visual.png'});
console.log(JSON.stringify(r));
await b.close();
