import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=18.3; if(g.applyTime)g.applyTime(18.3);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  const scene=g.scene||window.__scene;
  // force-show every hidden large sprite in a fan in front of the camera
  const big=[];
  scene.traverse(o=>{ if(o.isSprite&&!o.visible&&o.scale.x>3) big.push(o); });
  const px=200,pz=-266,yaw=Math.PI/2; // east CMH, facing east
  big.forEach((s,i)=>{ s.visible=true; s.position.set(px+8+(i%4)*7, 2.6+Math.floor(i/4)*3, pz+((i%2)?4:-4)); });
  g.auto.x=px; g.auto.z=pz; g.auto.a=yaw; g.auto.v=0;
  step(35);
  window.__noRender=false; const f1=await cap(); window.__noRender=true;
  g.state.hour=13; if(g.applyTime)g.applyTime(13); step(10);
  window.__noRender=false; const f2=await cap(); window.__noRender=true;
  big.forEach(s=>s.visible=false);
  return {n:big.length,f1,f2};
});
writeFileSync('/tmp/bub-dusk.png', Buffer.from(r.f1.split(',')[1],'base64'));
writeFileSync('/tmp/bub-noon.png', Buffer.from(r.f2.split(',')[1],'base64'));
console.log(JSON.stringify({n:r.n}));
await b.close();
