import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  let t0=90000; window.__noRender=true;
  for(let k=0;k<30;k++){t0+=33;window.__step(0.033,t0);}
  const ns=g.npcs&&g.npcs.npcs||[];
  if(!ns.length) return {err:'no npcs'};
  let n=ns.find(q=>q.stationary)||ns[0];
  window.__spawnAt(n.x+2.5,n.z+2.5,0);
  for(let k=0;k<90;k++){ n.x=g.auto.x+2.0; n.z=g.auto.z+2.0; t0+=33; window.__step(0.033,t0); }
  const c=document.getElementById('npc-card');
  const d=Math.hypot(n.x-g.auto.x,n.z-g.auto.z);
  window.__noRender=false;
  await new Promise(r=>requestAnimationFrame(r));
  const shot=document.getElementById('c').toDataURL('image/jpeg',0.8);
  return {err:null,npcDist:+d.toFixed(1),cardOn:c?c.classList.contains('on'):'NO-ELEMENT',cardCls:c?c.className:'',shot};
});
writeFileSync('/tmp/cardcheck.jpg',Buffer.from(r.shot.split(',')[1],'base64'));
console.log(JSON.stringify({err:r.err,npcDist:r.npcDist,cardOn:r.cardOn,cardCls:r.cardCls}));
await b.close(); process.exit(0);
