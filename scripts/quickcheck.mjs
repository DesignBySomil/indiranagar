import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:600000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
const r=await p.evaluate(()=>{
  const g=window.__game; let boards=0,awnings=0;
  g.scene.traverse(o=>{ if(o.isMesh&&o.geometry&&o.geometry.parameters){ const pr=o.geometry.parameters; if(pr.width===4.8&&pr.height===1.15)boards++; if(pr.width===5.0&&pr.height===0.18)awnings++; } });
  return {boards,awnings, camDressOcc:(g.world.camDressOcc||[]).length, worldKeys:Object.keys(g.world).filter(k=>/occ|dress|sign|bridge/i.test(k))};
});
console.log(JSON.stringify(r));
await b.close();
