import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,900)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const scan=(cx,cz,r)=>{let h=[];for(let x=cx-r;x<=cx+r;x+=0.75)for(let z=cz-r;z<=cz+r;z+=0.75){if(window.__solid(x,z))h.push(x.toFixed(1)+','+z.toFixed(1));}return h;};
  const a=scan(-98,216,10); console.log('A 100Ft@215 n='+a.length+' '+a.slice(0,25).join(' '));
  const c=scan(-272,239,8);  console.log('B 3rdCross@239 n='+c.length+' '+c.slice(0,25).join(' '));
  const d=scan(-235,290,8);  console.log('C 6thMain@290 n='+d.length+' '+d.slice(0,25).join(' '));
});
await b.close(); process.exit(0);
