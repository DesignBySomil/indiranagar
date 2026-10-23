import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('/tmp/ramf',{recursive:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/jpeg',0.72); };
  const units=(g.traffic&&g.traffic.units)||[];
  const A=g.auto;
  let t=null,bd=1e9;
  for(const u of units){const d=Math.hypot(u.x-A.x,u.z-A.z); if(d>8&&d<bd){bd=d;t=u;}}
  if(!t) return {err:'no unit'};
  t.kvx=t.kvz=t.kx=t.kz=0; if(t.v!==undefined)t.v=0; if(t.spd!==undefined)t.spd=0;
  const fx=Math.sin(t.yaw), fz=Math.cos(t.yaw);
  A.x=t.x-fx*20; A.z=t.z-fz*20; A.a=t.yaw; A.v=0;
  window.__noRender=true;
  let t0=90000; const K=window.__keys; K.KeyW=true;
  const trace=[]; const burst=[]; let peakKy=0, peakK=-1, landed=false, airStart=-1;
  for(let k=0;k<260;k++){
    t0+=33; window.__step(0.033,t0);
    const d=Math.hypot(t.x-A.x,t.z-A.z);
    const ky=t.ky||0;
    trace.push([k,+d.toFixed(1),+ky.toFixed(2),+A.v.toFixed(1)]);
    if(ky>peakKy){peakKy=ky;peakK=k;}
    if(ky>0.05&&airStart<0) airStart=k;
    // burst capture: from 4 frames before expected contact (d<8) to landing+4, every 2nd frame
    const inWindow=(d<8||airStart>=0)&&!landed;
    if(inWindow&&k%2===0&&burst.length<40){ window.__noRender=false; burst.push([k,await cap()]); window.__noRender=true; }
    if(peakKy>0.3&&ky===0){ landed=true; if(k%2===1){window.__noRender=false; burst.push([k,await cap()]); window.__noRender=true;} break; }
  }
  K.KeyW=false; window.__noRender=false;
  return {err:null,peakKy:+peakKy.toFixed(2),peakK,airStart,landed,nburst:burst.length,
    finalD:+Math.hypot(t.x-A.x,t.z-A.z).toFixed(1),
    trace:trace.filter((_,i)=>i%6===0||trace[i][2]>0.05).slice(0,44),
    _b:burst.map(x=>x[1]),_bk:burst.map(x=>x[0])};
});
if(r._b) r._b.forEach((d,i)=>writeFileSync(`/tmp/ramf/f${String(r._bk[i]).padStart(3,'0')}.jpg`,Buffer.from(d.split(',')[1],'base64')));
console.log(JSON.stringify({err:r.err,peakKy:r.peakKy,peakK:r.peakK,airStart:r.airStart,landed:r.landed,nburst:r.nburst,finalD:r.finalD,trace:r.trace}));
await b.close(); process.exit(0);
