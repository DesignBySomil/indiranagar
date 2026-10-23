import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:240000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/jpeg',0.8); };
  const A=g.auto;
  // Thippasandra Main Road, same area as user's screenshot
  A.x=536; A.z=318.3; A.a=Math.atan2(8,0); A.v=0;
  window.__noRender=true; let t0=90000;
  for(let k=0;k<40;k++){t0+=33;window.__step(0.033,t0);}
  window.__noRender=false;
  const f1=await cap();
  // road width audit across ALL segments: any seg wider than 2 lanes?
  const segs=g.roadSegs();
  const wide=segs.filter(s=>(s.width??s[6])>7.8).map(s=>[s.name||s[4],+(s.width??s[6]).toFixed(1)]).slice(0,10);
  const kinds={}; segs.forEach(s=>{const w=(s.width??s[6]).toFixed(1);kinds[w]=(kinds[w]||0)+1;});
  return {f1,wide,kinds,n:segs.length};
});
if(r.f1) writeFileSync('/tmp/road-2lane.png',Buffer.from(r.f1.split(',')[1],'base64'));
console.log(JSON.stringify({wide:r.wide,kinds:r.kinds,n:r.n}));
await b.close(); process.exit(0);
