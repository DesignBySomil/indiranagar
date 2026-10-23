import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:400000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  const scene=g.scene||window.__scene;
  const sprites=[];
  const v=new (scene.position.constructor)();
  scene.traverse(o=>{ if(o.isSprite){ o.getWorldPosition(v); sprites.push([+v.x.toFixed(1),+v.y.toFixed(1),+v.z.toFixed(1),o.visible]); } });
  const vis=sprites.filter(s=>s[3]);
  const shots=[];
  for(const [x,y,z] of vis.slice(0,3)){
    g.auto.x=x+7; g.auto.z=z+7; g.auto.a=Math.atan2(x-(x+7),z-(z+7)); g.auto.v=0;
    g.state.hour=18.35; if(g.applyTime)g.applyTime(18.35);
    step(30); window.__noRender=false; shots.push(await cap()); window.__noRender=true;
  }
  return {total:sprites.length,vis:vis.length,first:vis.slice(0,5),shots};
});
for(let i=0;i<r.shots.length;i++) writeFileSync(`/tmp/mk-${i}.png`, Buffer.from(r.shots[i].split(',')[1],'base64'));
console.log(JSON.stringify({total:r.total,vis:r.vis,first:r.first,shots:r.shots.length}));
await b.close();
