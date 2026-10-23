import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true;
  const P=window.__piers||[];
  const segs=g.roadSegs();
  const out=[];
  for(const [x,z,yaw] of P){
    let bd=1e9,bs=null;
    for(const s of segs){
      const x1=s.x1??s[0],z1=s.z1??s[1],x2=s.x2??s[2],z2=s.z2??s[3];
      const dx=x2-x1,dz=z2-z1,L2=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,((x-x1)*dx+(z-z1)*dz)/L2));
      const px=x1+dx*t,pz=z1+dz*t,d=Math.hypot(x-px,z-pz);
      if(d<bd){bd=d;bs=s;}
    }
    const hw=(bs.width??bs[6]??7)/2;
    out.push({x:+x.toFixed(1),z:+z.toFixed(1),dist:+bd.toFixed(2),halfW:hw,name:bs.name||bs[4]||null,kind:bs.kind??bs[5]??null,intrusion:+(hw+1.15-bd).toFixed(2)});
  }
  const bad=out.filter(o=>o.intrusion>0&&o.kind>=2);
  return {total:P.length,bad:bad.length,worst:bad.sort((a,b2)=>b2.intrusion-a.intrusion).slice(0,12)};
});
console.log(JSON.stringify(r,null,1));
await b.close();
