import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__game.world&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game;
  const roads=[2,8,9].map(ri=>{
    const rd=g.world.roads[ri];
    if(!rd||!rd.p) return {ri, missing:true, keys:rd?Object.keys(rd):null};
    const pt=rd.p[0];
    return {ri, n:rd.p.length, pt0:Array.isArray(pt)?pt:[pt.x,pt.y,pt.z], isArr:Array.isArray(pt),
      inB:rd.p.filter(pt=>{const x=Array.isArray(pt)?pt[0]:pt.x, z=Array.isArray(pt)?pt[1]:pt.z; return x>=-622&&x<=802&&z>=-777&&z<=747;}).length};
  });
  // roof cause: replicate the impactshot placement
  g.go(0); window.__noRender=true; let t0=90000;
  const u=g.traffic.units.find(u=>u.x!==0&&u.seg&&u.seg.len>60);
  const fx=u.seg.ux*u.dir, fz=u.seg.uz*u.dir;
  g.auto.x=u.x-fx*5.2; g.auto.z=u.z-fz*5.2; g.auto.a=Math.atan2(fx,fz); g.auto.v=0;
  for(let k=0;k<30;k++){t0+=16;window.__step(0.016,t0);}
  const cam=g.camera.position;
  const dCam=Math.hypot(cam.x-g.auto.x,cam.z-g.auto.z);
  // nearest traffic unit to the CAMERA (behind the player?)
  let nb=null,nbd=1e9;
  for(const w of g.traffic.units){const d=Math.hypot(w.x-cam.x,w.z-cam.z);if(d<nbd){nbd=d;nb={x:+w.x.toFixed(1),z:+w.z.toFixed(1),type:w.td.key};}}
  const behind=(g.auto.x-cam.x)*Math.sin(g.auto.a)+(g.auto.z-cam.z)*Math.cos(g.auto.a); // negative => camera is behind heading
  window.__noRender=false;
  return {roads, roofProbe:{auto:{x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1)},cam:{x:+cam.x.toFixed(1),y:+cam.y.toFixed(2),z:+cam.z.toFixed(1)},dCam:+dCam.toFixed(2),camBehindDist:+(-behind).toFixed(2),nearestToCam:{d:+nbd.toFixed(2),...nb}}};
});
console.log(JSON.stringify(r,null,1));
await b.close();
