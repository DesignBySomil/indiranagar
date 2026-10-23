import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=12; if(g.applyTime)g.applyTime(12);
  // find a road seg whose endpoint is near the z1=747 boundary
  const segs=g.roadSegs(); let best=null,bd=1e9;
  for(const s of segs){
    for(const [ex,ez] of [[s.x1,s.z1],[s.x2,s.z2]]){
      const d=Math.abs(ez-747)+Math.abs(ex)<1e9?Math.abs(ez-747):1e9;
      if(Math.abs(ez-747)<bd){bd=Math.abs(ez-747);best={x:ex,z:ez,ox:(s.x1+s.x2)/2-ex? null:null,sx:s.x1,sz:s.z1,tx:s.x2,tz:s.z2,ex,ez};}
    }
  }
  // direction from seg center toward the boundary endpoint
  const cx=(best.sx+best.tx)/2, cz=(best.sz+best.tz)/2;
  const a=Math.atan2(best.ex-cx,best.ez-cz);
  g.auto.x=best.ex-Math.sin(a)*22; g.auto.z=best.ez-Math.cos(a)*22; g.auto.a=a; g.auto.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<20;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false;
  await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r));
  return {img:document.getElementById('c').toDataURL('image/png'),at:[+g.auto.x.toFixed(0),+g.auto.z.toFixed(0)]};
});
writeFileSync('/tmp/wall-day.png', Buffer.from(r.img.split(',')[1],'base64'));
console.log('at',r.at);
await b.close();
