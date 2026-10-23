import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  g.auto.x=-96; g.auto.z=214; g.auto.a=0; g.auto.v=0;
  for(let k=0;k<90;k++){t0+=16;window.__step(0.016,t0);}
  const inBox=(x,z)=>x>-125&&x<-60&&z>195&&z<255;
  const V={x:0,y:0,z:0};
  const wp=(c)=>{const v=new c.position.constructor();c.getWorldPosition(v);return v;};
  const snap=()=>{
    const pk=g.parked.group.children.map(c=>{const v=wp(c);return {x:+v.x.toFixed(1),z:+v.z.toFixed(1)};}).filter(o=>inBox(o.x,o.z));
    const tf=g.traffic.group.children.map(c=>{const v=wp(c);return {x:+v.x.toFixed(1),z:+v.z.toFixed(1)};}).filter(o=>inBox(o.x,o.z));
    return {pk,tf};
  };
  const s1=snap();
  for(let k=0;k<240;k++){t0+=16;window.__step(0.016,t0);} // 4s later
  const s2=snap();
  return {s1,s2, parkedTotal:g.parked.group.children.length, trafficTotal:g.traffic.group.children.length};
});
console.log(JSON.stringify(r));
await b.close();
