import puppeteer from 'puppeteer-core';
const URL='https://htmlpreview.github.io/?https://github.com/DesignBySomil/indiranagar/blob/preview/index.html';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
const fails=[];
p.on('requestfailed',r=>fails.push(r.url().slice(0,110)));
p.on('response',r=>{if(r.status()>=400)fails.push(r.status()+' '+r.url().slice(0,100));});
try{
  await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
  const booted=await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000}).then(()=>true).catch(()=>false);
  const info=await p.evaluate(()=>({hasGame:!!(window.__game&&window.__game.auto), title:document.title}));
  // confirm which JS bundle actually loaded
  const scripts=await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('assets/index-')).map(e=>e.name));
  console.log(JSON.stringify({booted,info,scripts,fails:fails.slice(0,8)}));
}catch(e){console.log(JSON.stringify({error:String(e),fails:fails.slice(0,8)}));}
await b.close();
