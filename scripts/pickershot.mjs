import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const [,,tx,tz,out]=process.argv;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async(tx,tz)=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  const stops=g.stops||[];
  let bi=0,bd=1e9;
  stops.forEach((s,i)=>{const d=Math.hypot(s.p.x-tx,s.p.z-tz); if(d<bd){bd=d;bi=i;}});
  const pick=document.querySelector('select');
  const stopInfo=stops[bi]?{i:bi,name:stops[bi].n||stops[bi].name||'',x:+stops[bi].p.x.toFixed(0),z:+stops[bi].p.z.toFixed(0),dist:+bd.toFixed(0)}:null;
  if(pick&&stops.length){ pick.value=String(bi); pick.dispatchEvent(new Event('change')); }
  window.__noRender=true; let t0=90000;
  for(let k=0;k<50;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false;
  await new Promise(r=>requestAnimationFrame(r));
  const A=g.auto;
  // drive forward 3s to prove not pinned
  const K=window.__keys; K.KeyW=true;
  const samples=[];
  for(let k=0;k<90;k++){t0+=33;window.__step(0.033,t0); if(k%30===0)samples.push({v:+A.v.toFixed(1),x:+A.x.toFixed(0),z:+A.z.toFixed(0)});}
  K.KeyW=false;
  const img=document.getElementById('c').toDataURL('image/jpeg',0.82);
  return {stopInfo,spawn:{x:+A.x.toFixed(1),z:+A.z.toFixed(1)},samples,img};
},+tx,+tz);
writeFileSync(out,Buffer.from(r.img.split(',')[1],'base64'));
console.log('STOP',JSON.stringify(r.stopInfo),'drive',JSON.stringify(r.samples));
await b.close(); process.exit(0);
