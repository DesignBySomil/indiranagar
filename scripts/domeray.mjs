import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-102,79,0);
  let t0=90000; window.__noRender=true; for(let k=0;k<60;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false; await new Promise(r=>requestAnimationFrame(r));
  const rays={};
  for(const nx of [0.3,0.4,0.5,0.6,0.7]) for(const ny of [-0.15,-0.05,0.05,0.15]){
    rays[nx+','+ny]=window.__pick(nx,ny).filter(h=>h.inst!==null||h.type==='Sprite');
  }
  const frame=document.getElementById('c').toDataURL('image/jpeg',0.85);
  return {rays,frame};
});
writeFileSync('/downloads/domeray-frame.jpg',Buffer.from(out.frame.split(',')[1],'base64'));
console.log(JSON.stringify(out.rays,null,1));
await b.close(); process.exit(0);
