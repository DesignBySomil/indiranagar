import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const [,,cx,cz,tag]=process.argv;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async(cx,cz)=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(cx,cz-18,0);
  let t0=90000; for(let k=0;k<60;k++){t0+=33;window.__step(0.033,t0);}
  // solid grid: 1m steps over 24x24m around (cx,cz)
  const rows=[];
  for(let dz=-12;dz<=12;dz+=1){let row='';
    for(let dx=-12;dx<=12;dx+=1){ row+=window.__solid(cx+dx,cz+dz)?'#':'.'; }
    rows.push((cz+dz).toFixed(0).padStart(6)+' '+row);
  }
  // road segs within 25m
  const segs=g.roadSegs().map((s,i)=>({i,name:s.name,x1:s.x1??s[0],z1:s.z1??s[1],x2:s.x2??s[2],z2:s.z2??s[3],w:s.width??s[6]}))
    .filter(s=>Math.min(Math.hypot(s.x1-cx,s.z1-cz),Math.hypot(s.x2-cx,s.z2-cz))<25);
  return {rows,segs};
},+cx,+cz);
console.log('SEGS',JSON.stringify(out.segs));
console.log('SOLIDMAP (x left-to-right '+(+cx-12)+'..'+(+cx+12)+', z labeled, #=solid):');
out.rows.forEach(r=>console.log(r));
await b.close(); process.exit(0);
