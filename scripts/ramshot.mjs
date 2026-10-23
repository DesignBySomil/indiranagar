import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=960,540']});
const p=await b.newPage(); await p.setViewport({width:960,height:540});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  const units=(g.traffic&&g.traffic.units)||[];
  if(!units.length) return {err:'no traffic units'};
  const A=g.auto;
  let t=null,bd=1e9;
  for(const u of units){const d=Math.hypot(u.x-A.x,u.z-A.z); if(d>8&&d<bd){bd=d;t=u;}}
  if(!t) t=units[0];
  // park the target so the ram is square: zero its drift, place auto 20m behind along its heading
  t.kvx=t.kvz=t.kx=t.kz=0; if(t.v!==undefined)t.v=0; if(t.spd!==undefined)t.spd=0;
  const fx=Math.sin(t.yaw), fz=Math.cos(t.yaw);
  A.x=t.x-fx*20; A.z=t.z-fz*20; A.a=t.yaw; A.v=0;
  window.__noRender=true;
  const trace=[]; const frames={};
  let t0=90000; const K=window.__keys;
  K.KeyW=true;
  let peakKy=0, peakK=-1, airFrames=0, shotBefore=null, shotLand=null, landed=false;
  const airCaps=[]; // [k, dataUrl] sampled while airborne, pick peak-near after
  for(let k=0;k<260;k++){
    t0+=33; window.__step(0.033,t0);
    const d=Math.hypot(t.x-A.x,t.z-A.z);
    trace.push([k,+d.toFixed(1),+(t.ky||0).toFixed(2),+A.v.toFixed(1)]);
    if((t.ky||0)>peakKy){ peakKy=t.ky||0; peakK=k; }
    const air=(t.ky||0)>0.05;
    if(air) airFrames++;
    if(air&&airFrames%3===1&&airCaps.length<10){ window.__noRender=false; airCaps.push([k,await cap()]); window.__noRender=true; }
    if(!shotBefore&&d<7){ window.__noRender=false; shotBefore=await cap(); window.__noRender=true; }
    if(peakKy>0.3&&(t.ky||0)===0&&!landed){ landed=true; window.__noRender=false; shotLand=await cap(); window.__noRender=true; break; }
  }
  let shotAir=null; if(airCaps.length){ let best=airCaps[0]; for(const c of airCaps){ if(Math.abs(c[0]-peakK)<Math.abs(best[0]-peakK)) best=c; } shotAir=best[1]; }
  K.KeyW=false;
  window.__noRender=false;
  return {err:null,peakKy:+peakKy.toFixed(2),peakK,airFrames,landed,finalKy:+(t.ky||0).toFixed(2),
    finalD:+Math.hypot(t.x-A.x,t.z-A.z).toFixed(1),autoV:+A.v.toFixed(1),
    shotBefore:!!shotBefore,shotAir:!!shotAir,shotLand:!!shotLand,
    trace:trace.filter((_,i)=>i%6===0||trace[i][2]>0.05).slice(0,40),
    _b:shotBefore,_a:shotAir,_l:shotLand};
});
if(r._b) writeFileSync('/tmp/ram-before.png',Buffer.from(r._b.split(',')[1],'base64'));
if(r._a) writeFileSync('/tmp/ram-air.png',Buffer.from(r._a.split(',')[1],'base64'));
if(r._l) writeFileSync('/tmp/ram-land.png',Buffer.from(r._l.split(',')[1],'base64'));
delete r._b; delete r._a; delete r._l;
console.log(JSON.stringify(r));
await b.close(); process.exit(0);
