import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('error',e=>console.log('CRASH',e.message));
await p.setViewport({width:320,height:180});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step&&window.__peds,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  window.__spawnAt(-260,-140,1.57);
  const V=new (g.camera.position.constructor)();
  const run=(steps,turnCam)=>{
    const prev=new Map(); const jumps=[]; let t0=90000+Math.random()*1000;
    for(let k=0;k<steps;k++){t0+=33;
      if(turnCam){ // camera parked ahead of the player, looking BACK at them (turned-camera case)
        g.state.viewMode='free';
        const a=g.auto; g.camera.position.set(a.x+Math.sin(a.a)*30,12,a.z+Math.cos(a.a)*30);
        g.camera.lookAt(a.x,1,a.z);
      }
      window.__step(0.033,t0);
      g.camera.getWorldDirection(V);
      const hx=V.x,hz=V.z,hl=Math.hypot(hx,hz)||1;
      const a=g.auto;
      for(const pd of window.__peds){
        const pr=prev.get(pd.id);
        if(pr){const d=Math.hypot(pd.x-pr.x,pd.z-pr.z);
          if(d>30){const dx=pd.x-a.x,dz=pd.z-a.z;const dist=Math.hypot(dx,dz);const dot=dist>1?(dx*hx+dz*hz)/dist/hl:0;
            jumps.push({id:pd.id,dist:+dist.toFixed(1),dot:+dot.toFixed(2),inView:dist<80&&dot>0.5});}}
        prev.set(pd.id,{x:pd.x,z:pd.z});
      }}
    return jumps;
  };
  const j1=run(600,false);
  const j2=run(400,true);
  const near=window.__peds.filter(pd=>Math.hypot(pd.x-g.auto.x,pd.z-g.auto.z)<100).length;
  const summ=j=>({jumps:j.length,inView:j.filter(x=>x.inView).length,sample:j.slice(0,4)});
  return {chaseCam:summ(j1),turnedCam:summ(j2),nearPeds100m:near};
});
console.log('RESULT '+JSON.stringify(r));
await b.close(); process.exit(0);
