import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game,{timeout:120000});
await p.addScriptTag({url:'/gemtest.js'});
const r=await p.evaluate(async()=>{
  const m=window.__gem;
  const out=[];
  for(let v=0;v<6;v++){
    const g=m.buildPedestrian(v);
    let meshes=0, tris=0;
    g.traverse(o=>{ if(o.isMesh){ meshes++; const idx=o.geometry.index; const pos=o.geometry.attributes.position; tris+=Math.round((idx?idx.count:pos.count)/3);} });
    out.push({name:g.name,meshes,tris});
  }
  return out;
});
console.log(JSON.stringify(r));
await b.close();
