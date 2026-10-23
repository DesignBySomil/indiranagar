import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage();
await p.goto('https://htmlpreview.github.io/?https://github.com/DesignBySomil/indiranagar/blob/preview/index.html',{waitUntil:'domcontentloaded',timeout:120000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
const out=await p.evaluate(async()=>{
  const bundle=[...document.scripts].map(s=>s.src).find(s=>s.includes('assets/index-'))||'';
  const g=window.__game; g.go(0);
  const placed=window.__placeOnRoad(130.6,377.1);
  window.__spawnAt(130.6,377.1,1.61);
  window.__noRender=true;
  const A=g.auto,K=window.__keys; K.KeyW=true;
  let t0=90000; const samples=[];
  for(let k=0;k<120;k++){t0+=33;window.__step(0.033,t0); if(k%30===0)samples.push(+A.v.toFixed(1));}
  K.KeyW=false;
  return {bundle:bundle.split('/').pop(),placed:{x:+placed.x.toFixed(1),z:+placed.z.toFixed(1)},samples};
});
console.log('LIVE',JSON.stringify(out));
await b.close(); process.exit(0);
