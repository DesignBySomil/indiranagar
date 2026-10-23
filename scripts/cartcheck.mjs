import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-102,79,0);
  let t0=90000; window.__noRender=true; for(let k=0;k<60;k++){t0+=33;window.__step(0.033,t0);}
  const carts=[];
  window.__scene.traverse(o=>{
    if(o.isMesh&&o.geometry&&o.geometry.type==='ConeGeometry'&&o.material&&o.material.color){
      const hex=o.material.color.getHexString();
      if(['f59e0b','dc2626','2563eb','16a34a'].includes(hex)){
        const wp=o.getWorldPosition(o.position.clone());
        if(Math.hypot(wp.x-(-104),wp.z-85)<400) carts.push({hex,x:+wp.x.toFixed(1),y:+wp.y.toFixed(1),z:+wp.z.toFixed(1)});
      }
    }
  });
  const segs=g.roadSegs().map((s,i)=>({i,name:s.name,x1:s.x1??s[0],z1:s.z1??s[1],x2:s.x2??s[2],z2:s.z2??s[3]})).filter(s=>/100 Feet/.test(s.name||''));
  const latD=(x,z,s)=>{const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1e-9;let t=((x-s.x1)*dx+(z-s.z1)*dz)/L2;t=Math.max(0,Math.min(1,t));return Math.hypot(x-(s.x1+t*dx),z-(s.z1+t*dz));};
  for(const c of carts){
    const ds=segs.map(s=>({i:s.i,d:latD(c.x,c.z,s)})).sort((a,b)=>a.d-b.d);
    c.near100=ds.slice(0,2);
    c.medianFlag=ds.length>1&&ds[1].d<8;
  }
  window.__noRender=false; await new Promise(r=>requestAnimationFrame(r));
  const frame=document.getElementById('c').toDataURL('image/jpeg',0.85);
  return {carts,frame};
});
writeFileSync('/downloads/cartfix-after.jpg',Buffer.from(out.frame.split(',')[1],'base64'));
console.log(JSON.stringify(out.carts));
await b.close(); process.exit(0);
