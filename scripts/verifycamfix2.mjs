import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:600000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1280,height:800});
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=0;g.state.auto=false;g.go();window.__paused=true;});
await new Promise(r=>setTimeout(r,2000));
const out=await p.evaluate(()=>{
  const g=window.__game,K=window.__keys,res={};
  const vols=(window.__camBridgeVols||[]);
  res.vols=vols.length;
  // 1. distance constancy on open road
  g.auto.x=-136;g.auto.z=-400;g.auto.a=0;g.auto.v=0;g.auto.steer=0;
  for(let n=0;n<80;n++) window.__step(0.05,performance.now());
  const cam=g.camera;
  const d0=Math.hypot(cam.position.x-g.auto.x,cam.position.z-g.auto.z);
  K.KeyW=true; let vmax=0;
  for(let n=0;n<400;n++){ window.__step(0.05,performance.now()); vmax=Math.max(vmax,g.auto.v); }
  K.KeyW=false;
  const d1=Math.hypot(cam.position.x-g.auto.x,cam.position.z-g.auto.z);
  res.dist={atStop:+d0.toFixed(2),atSpeed:+d1.toFixed(2),vmax:+vmax.toFixed(1)};
  // 2. tree crown cap: pick a tree volume with a road+wall nearby
  const trees=vols.filter(v=>v.clearanceY<6.6&&!v.poly&&!v.rect);
  res.treeVols=trees.length; res.gantryVols=vols.filter(v=>v.rect&&v.clearanceY<6).length;
  let done=null;
  for(const t of trees){
    // find heading where solid is 4-7m behind (crush setup) and road in front
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4;
      const bx=t.x+Math.sin(a)*5.5, bz=t.z+Math.cos(a)*5.5;
      if(!g.solid(bx,bz)) continue;
      const ax=t.x-Math.sin(a)*3, az=t.z-Math.cos(a)*3;
      if(g.solid(ax,az)) continue;
      g.auto.x=ax;g.auto.z=az;g.auto.a=a;g.auto.v=0;g.auto.steer=0;
      for(let n=0;n<120;n++) window.__step(0.05,performance.now());
      const dCam=Math.hypot(cam.position.x-g.auto.x,cam.position.z-g.auto.z);
      done={tree:[+t.x.toFixed(0),+t.z.toFixed(0)],clearance:+t.clearanceY.toFixed(2),camY:+cam.position.y.toFixed(2),dCam:+dCam.toFixed(2),expectedCap:+(t.clearanceY-0.4).toFixed(2)};
      break;
    }
    if(done) break;
  }
  res.crownCap=done;
  return res;
});
console.log('VERIFY2', JSON.stringify(out,null,1));
await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:'/tmp/verify-crown.png'});
await b.close();
