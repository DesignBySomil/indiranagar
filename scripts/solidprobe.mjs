import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  const S=window.__solid; if(!S) return {err:'no solid hook'};
  const hits=[];
  // lane line of the frozen northbound carriageway near x~-107, z -80..-20
  for(let z=-85;z<=-15;z+=1){
    for(const x of [-109,-107.5,-106,-104.5,-103]){
      if(S(x,z)) hits.push([x,z]);
    }
  }
  return {hits:hits.slice(0,60),n:hits.length};
});
console.log(JSON.stringify(out));
await b.close(); process.exit(0);
