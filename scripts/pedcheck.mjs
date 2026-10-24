import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=800,500','--virtual-time-budget=20000','--disable-frame-rate-limit']});
const p = await b.newPage();
await p.setViewport({width:800,height:500});
p.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,300)));
await p.goto('http://localhost:4180',{waitUntil:'load'});
await p.waitForFunction('window.__game !== undefined',{timeout:90000});
await p.evaluate(()=>{ document.getElementById('go').click(); });
await p.waitForFunction('window.__game.started === true',{timeout:30000});
await new Promise(r=>setTimeout(r,1500));
const info = await p.evaluate(()=>{
  const peds = window.__peds || [];
  const list = peds.map((pd,i)=>({i, v: pd.variant||pd.kind||'?', x:+pd.x.toFixed(1), z:+pd.z.toFixed(1)}));
  const k = list.find(pd=>String(pd.v).includes('kurta')) || list[0];
  if (k) { window.__game.auto.x = k.x; window.__game.auto.z = k.z + 5.5; window.__game.auto.heading = Math.PI; if(window.__game.auto.v!==undefined) window.__game.auto.v=0; }
  return JSON.stringify({count:list.length, near:k, sample:list.slice(0,3)});
});
console.log('PEDS', info);
await new Promise(r=>setTimeout(r,1200));
await p.screenshot({path:'/downloads/ped-ingame-a.png'});
await new Promise(r=>setTimeout(r,900));
await p.screenshot({path:'/downloads/ped-ingame-b.png'});
await b.close();
console.log('done');
