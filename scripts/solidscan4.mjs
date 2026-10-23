import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,900)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const scan=(cx,cz,r)=>{let h=[];for(let x=cx-r;x<=cx+r;x+=0.5)for(let z=cz-r;z<=cz+r;z+=0.5){if(window.__solid(x,z))h.push(x.toFixed(1)+','+z.toFixed(1));}return h;};
  for(const [tag,cx,cz] of [['CMHw',-138.8,-256.5],['100Fs',-128,-277],['CMHe',-106.3,-269.7],['100Fn',-117.3,-240]]){
    const h=scan(cx,cz,6);
    console.log(tag+' n='+h.length+' '+(h.length?('first='+h[0]+' last='+h[h.length-1]):''));
  }
});
await b.close(); process.exit(0);
