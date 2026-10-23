import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.setViewport({width:320,height:180});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step&&window.__peds,{timeout:150000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  window.__spawnAt(-260,-140,1.57);
  const V=new (g.camera.position.constructor)();
  function run(steps,setup){
    const prevP=new Map(), prevT=new Map(); const ev=[]; let t0=90000+Math.random()*999;
    for(let k=0;k<steps;k++){t0+=33; setup&&setup(k); window.__step(0.033,t0);
      g.camera.updateMatrixWorld(true);
      const cam=g.camera;
      const cls=(x,z)=>{
        V.set(x,1,z).project(cam);
        if(V.z>1||V.z<-1) return null;
        if(Math.abs(V.x)>1||Math.abs(V.y)>1) return null;
        const d=Math.hypot(x-g.auto.x,z-g.auto.z);
        return d<80?'lt80':d<150?'80_150':d<300?'150_300':'gt300';
      };
      for(const pd of window.__peds){
        const pr=prevP.get(pd.id);
        if(pr&&Math.hypot(pd.x-pr.x,pd.z-pr.z)>30){const c=cls(pd.x,pd.z); if(c)ev.push({kind:'ped',b:c});}
        prevP.set(pd.id,{x:pd.x,z:pd.z});
      }
      const units=(window.__traffic?window.__traffic().units:[])||[];
      units.forEach((u,i)=>{
        const pr=prevT.get(i);
        if(pr&&Math.hypot(u.x-pr.x,u.z-pr.z)>40){const c=cls(u.x,u.z); if(c)ev.push({kind:'veh',b:c});}
        prevT.set(i,{x:u.x,z:u.z});
      });
    }
    return ev;
  }
  const tally=ev=>{const t={lt80:0,'80_150':0,'150_300':0,gt300:0};ev.forEach(e=>t[e.b]++);return{events:ev.length,inFrustum:t,ped:ev.filter(e=>e.kind==='ped').length,veh:ev.filter(e=>e.kind==='veh').length};};
  const out={};
  out.chase=tally(run(350,null));
  const rig=g.camRig;
  if(rig&&rig.set){rig.set(1); out.driverMode=rig.name; out.driver=tally(run(300,null)); rig.set(2); out.passengerMode=rig.name; out.passenger=tally(run(300,null)); rig.set(0);}
  // drag-look ~74deg right via synthetic pointer path on canvas
  const cv=document.querySelector('canvas');
  const opts={bubbles:true,clientX:160,clientY:90,pointerId:1};
  cv.dispatchEvent(new PointerEvent('pointerdown',opts));
  cv.dispatchEvent(new PointerEvent('pointermove',{...opts,clientX:160+217}));
  out.drag=tally(run(250,null));
  cv.dispatchEvent(new PointerEvent('pointerup',opts));
  return out;
});
console.log('RESULT '+JSON.stringify(r));
await b.close(); process.exit(0);
