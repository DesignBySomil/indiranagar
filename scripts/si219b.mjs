import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  g.auto.x=-32; g.auto.z=439; g.auto.a=Math.PI/2; g.auto.v=0;
  for(let k=0;k<40;k++){t0+=16;window.__step(0.016,t0);}
  // probe along centerline toward seg end (-17.9,438.5), 1m steps
  const out=[];
  for(let x=-36;x>=-18? false:true;x+=1){ if(x>-17)break;
    const z=440.1+(438.5-440.1)*(x-(-77.6))/((-17.9)-(-77.6));
    out.push([+x.toFixed(0),+z.toFixed(1),g.solid(x,z)?1:0,g.parked.solid(x,z)?1:0,g.traffic.solid(x,z)?1:0]);
  }
  return out;
});
console.log(JSON.stringify(r));
await b.close();
