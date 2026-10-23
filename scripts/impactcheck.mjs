import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=1280,800']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
const errs=[]; p.on('pageerror',e=>errs.push(''+e).slice(0,300));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto,{timeout:120000});
await p.evaluate(()=>{ const g=window.__game; g.go(0); });
await new Promise(r=>setTimeout(r,800));

// find a traffic unit and place the auto right behind it, same heading
const setup=await p.evaluate(()=>{
  const g=window.__game; const u=g.traffic.units.find(u=>u.x!==0&&u.seg&&u.seg.len>60);
  if(!u) return {err:'no unit'};
  const s=u.seg; const fx=s.ux*u.dir, fz=s.uz*u.dir;
  g.auto.x=u.x-fx*9; g.auto.z=u.z-fz*9; g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  return {ux:u.x,uz:u.z,ax:g.auto.x,az:g.auto.z,i:g.traffic.units.indexOf(u)};
});
if(setup.err){console.log(JSON.stringify({setup,errs}));process.exit(1);}
console.log('SETUP',JSON.stringify(setup));

// drive forward into it
await p.evaluate(()=>{window.__keys['KeyW']=true;});
const track=[];
let shotDone=false;
for(let k=0;k<240;k++){
  await new Promise(r=>setTimeout(r,50));
  const s=await p.evaluate((i)=>{
    const g=window.__game; const u=g.traffic.units[i];
    return {v:+g.auto.v.toFixed(2),kx:+(u.kx||0).toFixed(3),kz:+(u.kz||0).toFixed(3),ky:+(u.ky||0).toFixed(3),ks:+(u.ks||0).toFixed(3),
      d:+Math.hypot(u.x-g.auto.x,u.z-g.auto.z).toFixed(2)};
  },setup.i);
  track.push(s);
  if(!shotDone && (Math.abs(s.kx)+Math.abs(s.kz))>0.15){ await p.screenshot({path:'/tmp/impact-moment.png'}); shotDone=true; }
}
await p.evaluate(()=>{window.__keys['KeyW']=false;});
await new Promise(r=>setTimeout(r,1200));
const settled=await p.evaluate((i)=>{const u=window.__game.traffic.units[i];return {kx:u.kx,kz:u.kz,ks:u.ks,ky:u.ky};},setup.i);
const peak=track.reduce((m,s)=>Math.max(m,Math.hypot(s.kx,s.kz)),0);
console.log('PEAK_OFFSET',peak.toFixed(3),'SETTLED',JSON.stringify(settled));
console.log('SAMPLE',JSON.stringify(track.filter((_,i)=>i%20===0)));

// parked kick direct-call check
const pk=await p.evaluate(()=>{
  const g=window.__game; const a=g.auto;
  // find nearest parked solid point near the auto: scan a small ring
  const r=g.parked.kickAt(a.x+2,a.z,1,0,3.0);
  return {kicked:r};
});
await new Promise(r=>setTimeout(r,300));
await p.screenshot({path:'/tmp/impact-parked.png'});
console.log('PARKED',JSON.stringify(pk));
console.log('ERRS',JSON.stringify(errs.slice(0,4)));
await b.close();
