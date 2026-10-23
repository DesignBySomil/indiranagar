import puppeteer from 'puppeteer-core';
const URL='https://htmlpreview.github.io/?https://github.com/DesignBySomil/indiranagar/blob/preview/index.html';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=1280,800']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForFunction('!!(window.__game&&window.__game.auto)',{timeout:90000});
// start the game: pick first location and press Start
await p.evaluate(()=>{const b=document.getElementById('go'); if(b) b.click();});
await new Promise(r=>setTimeout(r,4000));
const before=await p.evaluate(()=>{const a=window.__game.auto; const k=Object.keys(a); return {keys:k, pos:a.pos?{x:a.pos.x,z:a.pos.z}:(a.position?{x:a.position.x,z:a.position.z}:null)};});
console.log('AUTO SHAPE', JSON.stringify(before));
// drive forward via stepped physics
const res=await p.evaluate(()=>{
  const g=window.__game; window.__paused=true;
  const P0={x:g.auto.x,z:g.auto.z};
  window.__keys.KeyW=true;
  const cam=[];
  for(let i=0;i<240;i++){ window.__step(1/60, performance.now()+i*16.7); if(i%60===0) cam.push({i,x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1),v:+g.auto.v.toFixed(1)}); }
  window.__keys.KeyW=false;
  const P1={x:g.auto.x,z:g.auto.z};
  return {P0:P0&&{x:+P0.x.toFixed(1),z:+P0.z.toFixed(1)}, P1:P1&&{x:+P1.x.toFixed(1),z:+P1.z.toFixed(1)}, cam, jumps:(window.__jumpLog||[]).length};
});
console.log('DRIVE', JSON.stringify(res));
await p.evaluate(()=>{window.__paused=false;});
await new Promise(r=>setTimeout(r,2500));
await p.screenshot({path:'/tmp/preview-drive.png'});
await b.close();
