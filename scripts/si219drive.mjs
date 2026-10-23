import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  const drive=(sx,sz,ex,ez)=>{
    g.auto.x=sx; g.auto.z=sz; g.auto.a=Math.atan2(ex-sx,ez-sz); g.auto.v=0; g.auto.steer=0;
    let stuck=0, maxStuck=0, lastX=sx, lastZ=sz;
    for(let k=0;k<60*20;k++){ t0+=16; window.__step(0.016,t0);
      // simple centerline follower: steer toward end
      const want=Math.atan2(ex-g.auto.x,ez-g.auto.z);
      let d=want-g.auto.a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
      g.auto.steer=Math.max(-1,Math.min(1,d*2)); g.auto.v=Math.min(g.auto.v+0.15,8);
      const moved=Math.hypot(g.auto.x-lastX,g.auto.z-lastZ); lastX=g.auto.x; lastZ=g.auto.z;
      if(moved<0.02){stuck++;maxStuck=Math.max(maxStuck,stuck);}else stuck=0;
      if(Math.hypot(ex-g.auto.x,ez-g.auto.z)<3) return {done:true,maxStuck,prog:k};
    }
    return {done:false,maxStuck,end:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)]};
  };
  const fwd=drive(-77.6,440.1,-17.9,438.5);
  const bwd=drive(-17.9,438.5,-77.6,440.1);
  return {fwd,bwd};
});
console.log(JSON.stringify(r));
await b.close();
