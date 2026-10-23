import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  const cvs=document.getElementById('c');
  const c2=document.createElement('canvas'); c2.width=640; c2.height=360; const ctx=c2.getContext('2d');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); ctx.drawImage(cvs,0,0,640,360); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  const scene=g.scene||window.__scene;
  const v=new (scene.position.constructor)();
  let mk=null;
  scene.traverse(o=>{ if(o.isSprite&&o.visible&&o.scale.x>0.8&&o.scale.x<1&&!mk){o.getWorldPosition(v);mk={x:v.x,y:v.y,z:v.z};} });
  if(!mk) return {err:'no marker'};
  const out=[];
  for(const [dist,hour] of [[8,18.3],[22,18.3],[22,13]]){
    const ang=0.6;
    g.auto.x=mk.x+Math.sin(ang)*dist; g.auto.z=mk.z+Math.cos(ang)*dist;
    g.auto.a=Math.atan2(mk.x-g.auto.x,mk.z-g.auto.z); g.auto.v=0;
    g.state.hour=hour; if(g.applyTime)g.applyTime(hour);
    step(35);
    window.__noRender=false; const url=await cap(); window.__noRender=true;
    // find sprite screen pos: project marker world pos
    const cam=g.camera||window.__camera;
    let px=-1,py=-1;
    if(cam){ const vv=new (scene.position.constructor)(mk.x,mk.y+0.4,mk.z); vv.project(cam); px=Math.round((vv.x*0.5+0.5)*640); py=Math.round((-vv.y*0.5+0.5)*360); }
    let samples=[];
    if(px>=0&&px<640&&py>=0&&py<360){
      const img=ctx.getImageData(Math.max(0,px-6),Math.max(0,py-6),13,13).data;
      for(let i=0;i<169;i+=4){const o=(Math.floor(i/13)*13+(i%13))*4; samples.push([img[o],img[o+1],img[o+2]]);}
    }
    out.push({dist,hour,px,py,center:samples[84]||null,url});
  }
  return {mk,out};
});
r.out.forEach((o,i)=>{ if(o.url) writeFileSync(`/tmp/mt-${i}.png`, Buffer.from(o.url.split(',')[1],'base64')); });
console.log(JSON.stringify({mk:r.mk,res:r.out.map(o=>({dist:o.dist,hour:o.hour,px:o.px,py:o.py,center:o.center}))}));
await b.close();
