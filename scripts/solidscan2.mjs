import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,600)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  // southbound 100Ft lane near the frozen exit (-113.4,-8.2): scan a grid
  let hits=[];
  for(let x=-120;x<=-106;x+=1) for(let z=-30;z<=10;z+=1){ if(window.__solid(x,z)) hits.push(x+','+z); }
  console.log('SOLID hits n='+hits.length+' :: '+hits.slice(0,40).join(' '));
});
await b.close(); process.exit(0);
