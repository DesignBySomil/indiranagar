import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/jpeg',0.82); };
  const A=g.auto; let t0=90000;
  const settle=(n)=>{window.__noRender=true;for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}window.__noRender=false;};
  // shot 1: Thippasandra Main Road mid-stretch, looking down the road
  const yaw1=Math.atan2(1607.2-1514.1, 491.3-477.1);
  A.x=1520; A.z=478.5; A.a=yaw1; A.v=0; settle(45);
  const f1=await cap();
  // shot 2: CMH corridor under the viaduct: median strip + piers + 1-lane carriageways
  const segs=g.roadSegs().filter(s=>(s.name||s[4]||'').includes('Chinmaya'));
  let s0=segs[0]; for(const s of segs){ if((s.x2??s[2])-(s.x1??s[0])>100){s0=s;break;} }
  const x1=s0.x1??s0[0],z1=s0.z1??s0[1],x2=s0.x2??s0[2],z2=s0.z2??s0[3];
  const yaw2=Math.atan2(x2-x1,z2-z1);
  A.x=(x1+x2)/2; A.z=(z1+z2)/2; A.a=yaw2; A.v=0; settle(45);
  const f2=await cap();
  return {f1,f2,cmhSeg:[s0.name||s0[4],s0.width??s0[6]]};
});
if(r.f1) writeFileSync('/tmp/road-thippasandra.jpg',Buffer.from(r.f1.split(',')[1],'base64'));
if(r.f2) writeFileSync('/tmp/road-cmh.jpg',Buffer.from(r.f2.split(',')[1],'base64'));
console.log(JSON.stringify({cmhSeg:r.cmhSeg,ok:!!r.f1&&!!r.f2}));
await b.close(); process.exit(0);
