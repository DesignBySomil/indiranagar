import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0);
  const pts=[['si51',-150,-711],['si62',-98,221],['si63',-96,228]];
  const out={};
  for(const [k,x,z] of pts){
    out[k]={};
    for(let dz=-3;dz<=6;dz+=1.5){
      for(let dx=-3;dx<=3;dx+=1.5){
        const px=x+dx,pz=z+dz;
        const d=window.__inDivider&&window.__inDivider(px,pz), pk=g.parked.solid(px,pz), s=g.solid(px,pz);
        if(d||pk||s) out[k][[dx,pz].join(',')]={d:!!d,pk,s};
      }
    }
  }
  return out;
});
console.log(JSON.stringify(r));
await b.close();
