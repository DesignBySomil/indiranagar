import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360}); p.on('console',m=>console.log('[pg]',m.text().slice(0,700)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const f=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  const ex=-86, ez=404.3;
  const segs=g.roadSegs().map(s=>({x1:s.x1??s[0],z1:s.z1??s[1],x2:s.x2??s[2],z2:s.z2??s[3],w:s.width??s[6],n:s.name||''}));
  const near=segs.map(s=>{const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1e-9;let t=((ex-s.x1)*dx+(ez-s.z1)*dz)/L2;t=Math.max(0,Math.min(1,t));return{d:Math.hypot(ex-(s.x1+t*dx),ez-(s.z1+t*dz)),n:s.n,w:s.w};}).sort((a,b2)=>a.d-b2.d).slice(0,5);
  console.log('NEARSEGS '+JSON.stringify(near));
  let hits=[];for(let x=ex-8;x<=ex+8;x+=1)for(let z=ez-8;z<=ez+8;z+=1){if(window.__solid(x,z))hits.push(x+','+z);}
  console.log('SOLID n='+hits.length+' '+hits.slice(0,10).join(' '));
  window.__spawnAt(ex,ez-25,0);
  window.__noRender=true; let t0=90000;
  for(let k=0;k<40;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false;
  await new Promise(r=>requestAnimationFrame(r));
  return document.getElementById('c').toDataURL('image/jpeg',0.82);
});
writeFileSync('/tmp/edge-404.jpg',Buffer.from(f.split(',')[1],'base64'));
console.log('SHOT /tmp/edge-404.jpg');
await b.close(); process.exit(0);
