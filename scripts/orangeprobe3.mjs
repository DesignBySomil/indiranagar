import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  g.auto.x=-96; g.auto.z=214; g.auto.a=0; g.auto.v=0;
  for(let k=0;k<90;k++){t0+=16;window.__step(0.016,t0);}
  const hits=[];
  for(let x=-125;x<=-60;x+=2)for(let z=195;z<=255;z+=2){
    if(g.solid(x,z)){
      const pk=g.parked.solid(x,z), tf=g.traffic.solid(x,z);
      if(!pk&&!tf) hits.push([x,z]);
    }
  }
  // cluster hits
  return {worldKeys:Object.keys(g.world||{}), hits: hits.filter((_,i)=>i%6===0), hitCount:hits.length};
});
console.log(JSON.stringify(r));
await b.close();
