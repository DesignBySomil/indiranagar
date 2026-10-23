import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:400000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=18.35; if(g.applyTime)g.applyTime(18.35);
  const cvs=document.getElementById('c');
  const c2=document.createElement('canvas'); c2.width=640; c2.height=360;
  const ctx=c2.getContext('2d');
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  // candidate spots along major roads
  const majors=['Chinmaya Mission Hospital Road','100 Feet Road','80 Feet Road','Indiranagar Double Road','12th Main','13th Cross Road','9th Main'];
  const segs=g.roadSegs();
  const pts=[];
  for(const s of segs){
    const nm=s.name||s[4]; if(!majors.includes(nm)) continue;
    const x1=s.x1??s[0],z1=s.z1??s[1],x2=s.x2??s[2],z2=s.z2??s[3];
    const mx=(x1+x2)/2,mz=(z1+z2)/2;
    if(pts.some(q=>Math.hypot(q[0]-mx,q[1]-mz)<130)) continue;
    pts.push([mx,mz,Math.atan2(x2-x1,z2-z1)]);
    if(pts.length>=6) break;
  }
  const results=[];
  for(let i=0;i<pts.length;i++){
    const [x,z,yaw]=pts[i];
    g.auto.x=x; g.auto.z=z; g.auto.a=yaw; g.auto.v=0;
    step(25);
    window.__noRender=false;
    await new Promise(r=>requestAnimationFrame(r));
    ctx.drawImage(cvs,0,0,640,360);
    window.__noRender=true;
    // scan for near-black blocks (skip sky rows 0-30 and bottom HUD rows 320+)
    const img=ctx.getImageData(0,30,640,290).data;
    const B=16; let best=0,bx=0,by=0;
    for(let yy=0;yy<290-B;yy+=8)for(let xx=0;xx<640-B;xx+=8){
      let dark=0;
      for(let dy=0;dy<B;dy+=4)for(let dx=0;dx<B;dx+=4){
        const o=((yy+dy)*640+(xx+dx))*4;
        if(img[o]<14&&img[o+1]<14&&img[o+2]<14) dark++;
      }
      if(dark>best){best=dark;bx=xx;by=yy+30;}
    }
    results.push({i,x:+x.toFixed(0),z:+z.toFixed(0),dark:best,at:[bx,by]});
  }
  return results;
});
console.log(JSON.stringify(r));
await b.close();
