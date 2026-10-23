import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  const crowd=g.crowd||window.__crowd;
  const peds=crowd?crowd.peds:null;
  if(!peds) return {err:'no crowd handle',keys:Object.keys(g)};
  // stand still, let sim settle, then track ONE ped as the auto steps away
  g.auto.x=200; g.auto.z=-266; g.auto.a=0.3; g.auto.v=0;
  step(60);
  const out=[],states=[];
  // find a ped with a gem slot near 55m
  let target=null;
  for(const q of peds){const d=Math.hypot(q.x-g.auto.x,q.z-g.auto.z); if(d>45&&d<62&&q._gemVariant!==undefined){target=q;break;}}
  if(!target) for(const q of peds){const d=Math.hypot(q.x-g.auto.x,q.z-g.auto.z); if(d>30&&d<62){target=q;break;}}
  if(!target) return {err:'no ped in band'};
  const c2=document.createElement('canvas'); c2.width=160; c2.height=160; const cx2=c2.getContext('2d');
  if(g.auto.goldAuto&&g.auto.goldAuto.visible!==undefined) g.auto.goldAuto.visible=false;
  const cam=g.camera||window.__camera;
  for(const dist of [55,72]){
    const dx=target.x-g.auto.x,dz=target.z-g.auto.z,d=Math.hypot(dx,dz)||1;
    g.auto.x=target.x-dx/d*dist+(-dz/d)*14; g.auto.z=target.z-dz/d*dist+(dx/d)*14;
    g.auto.a=Math.atan2(target.x-g.auto.x,target.z-g.auto.z); g.auto.v=0;
    step(8);
    states.push({dist:+Math.hypot(target.x-g.auto.x,target.z-g.auto.z).toFixed(1),gem:target._gemVariant,tkey:target.tkey});
    window.__noRender=false; await new Promise(r=>requestAnimationFrame(r));
    const scene=g.scene||window.__scene;
    const vv=new (scene.position.constructor)(target.x,1.0,target.z); vv.project(cam);
    const px=Math.round((vv.x*0.5+0.5)*640), py=Math.round((-vv.y*0.5+0.5)*360);
    cx2.imageSmoothingEnabled=false;
    cx2.drawImage(cvs,Math.max(0,Math.min(480,px-80)),Math.max(0,Math.min(200,py-80)),160,160,0,0,160,160);
    out.push(c2.toDataURL('image/png'));
    window.__noRender=true;
  }
  return {frames:out,states};
});
for(let i=0;i<(r.frames||[]).length;i++) writeFileSync(`/tmp/lod-${i}.png`, Buffer.from(r.frames[i].split(',')[1],'base64'));
console.log(JSON.stringify({n:(r.frames||[]).length,gem:r.gemVariant,tkey:r.tkey,err:r.err,keys:r.keys}));
await b.close();
