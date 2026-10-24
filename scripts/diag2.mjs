import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage();
p.on('response',r=>{ if(r.status()>=400) console.log('HTTP',r.status(),r.url()); });
p.on('pageerror',e=>console.log('PE',String(e).slice(0,200)));
const t0=Date.now();
await p.goto('http://localhost:4180',{waitUntil:'load'});
for (let i=0;i<8;i++) {
  await new Promise(r=>setTimeout(r,7500));
  const st = await p.evaluate(()=>JSON.stringify({t:Math.round(performance.now()/1000),game:!!window.__game,started:window.__game?window.__game.started:null}));
  console.log('STATE',st);
  if (st.includes('"game":true')) break;
}
await b.close();
