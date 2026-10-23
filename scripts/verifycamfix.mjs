import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:600000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step&&window.__game.camRig',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=0;g.state.auto=false;g.go();window.__paused=true;});
await new Promise(r=>setTimeout(r,2000));
const out=await p.evaluate(()=>{
  const g=window.__game,K=window.__keys,res={};
  const occ=g.world.camDressOcc||[]; res.occCount=occ.length;
  // pick a signboard occluder near a road (auto must stand on road nearby)
  let pick=null,pickRoad=null;
  for(const o of occ){ if(o.y0!==3.0) continue;
    for(const r of g.world.roads){ const pts=r.p;
      for(let i=0;i<pts.length-1;i++){ const mx=(pts[i][0]+pts[i+1][0])/2,mz=(pts[i][1]+pts[i+1][1])/2;
        if(Math.hypot(mx-o.x,mz-o.z)<14){ pick=o; pickRoad=[mx,mz,Math.atan2(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1])]; break; }
      } if(pick)break; } if(pick)break; }
  res.pick=pick;
  if(pick){
    // place auto on road, heading so the chase cam (behind auto) lands on the sign
    const [mx,mz,ra]=pickRoad;
    // camera sits behind auto: auto heading should point AWAY from the sign
    const away=Math.atan2(mx-pick.x,mz-pick.z);
    g.auto.x=mx; g.auto.z=mz; g.auto.a=away; g.auto.v=0; g.auto.steer=0;
    // let the rig settle
    for(let n=0;n<60;n++) window.__step(0.05,performance.now());
    const camera=g.camera||(g.camRig&&g.camRig.camera);
    const cp=camera? camera.position : {x:0,y:0,z:0};
    const inOBB=(x,z,y)=>{const o=pick; if(y<o.y0||y>o.y1)return false; const dx=x-o.x,dz=z-o.z; const lx=dx*o.sy+dz*o.cy,lz=dx*o.cy-dz*o.sy; return Math.abs(lx)<=o.hl+0.5&&Math.abs(lz)<=o.ht+0.5;};
    res.signTest={cam:[+cp.x.toFixed(2),+cp.y.toFixed(2),+cp.z.toFixed(2)], camInSign:inOBB(cp.x,cp.z,cp.y), sign:[+pick.x.toFixed(1),+pick.z.toFixed(1)], auto:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)], dCam:+Math.hypot(cp.x-g.auto.x,cp.z-g.auto.z).toFixed(2)};
  }
  // distance constancy: stop vs speed
  g.auto.v=0; for(let n=0;n<40;n++) window.__step(0.05,performance.now());
  const cam2=g.camera||(g.camRig&&g.camRig.camera);
  const d0=Math.hypot(cam2.position.x-g.auto.x,cam2.position.z-g.auto.z);
  K.KeyW=true; for(let n=0;n<300;n++){ window.__step(0.05,performance.now()); }
  const vNow=g.auto.v;
  const d1=Math.hypot(cam2.position.x-g.auto.x,cam2.position.z-g.auto.z);
  K.KeyW=false;
  res.dist={atStop:+d0.toFixed(2), atSpeed:+d1.toFixed(2), v:+vNow.toFixed(1)};
  return res;
});
console.log('VERIFYCAM', JSON.stringify(out,null,1));
await new Promise(r=>setTimeout(r,300));
await p.screenshot({path:'/tmp/verify-sign.png'});
await b.close();
