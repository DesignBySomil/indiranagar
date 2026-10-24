import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.env.URL || 'http://localhost:4180/';
const dir = process.env.DIR || 'B';   // B: junction->tail, A: tail->junction
const tag = process.env.TAG || 'after';
const {link} = JSON.parse(fs.readFileSync('/tmp/paths.json','utf8'));
const wps = dir==='A' ? [...link].reverse() : link;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=800,450']});
const p=await b.newPage(); await p.setViewport({width:800,height:450});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:180000});
// spawn just before first waypoint, facing the second
const si=+(process.env.STARTWP||0); const s0=process.env.STARTX?[+process.env.STARTX,+process.env.STARTZ]:wps[si], s1=wps[Math.min(si+1,wps.length-1)];
const yaw0=Math.atan2(s1[0]-s0[0], s1[1]-s0[1]);
await p.evaluate((x,z,yaw)=>{ const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=false; window.__noCardUntil=performance.now()+600000; window.__spawnAt(x,z,yaw); let T=90000; for(let i=0;i<30;i++){T+=33;window.__step(0.033,T);} }, s0[0],s0[1],yaw0);
let shot=0;
const res=await p.evaluate((wps)=>{ return {n:wps.length}; }, wps);
for(let f=0; f<40 && shot<8; f++){
  const st=await p.evaluate((wps,si)=>{
    const g=window.__game, a=g.auto, K=window.__keys; window.__noRender=true;
    let T=window.__T||(window.__T=90000);
    const w=window.__wp||{i:si+1}; window.__wp=w;
    if(!window.__drv){ window.__drv={maxStep:0}; }
    for(let s=0;s<45;s++){
      // waypoint chase
      let wp=wps[Math.min(w.i,wps.length-1)];
      const dx=wp[0]-a.x, dz=wp[1]-a.z;
      if(Math.hypot(dx,dz)<2.5 && w.i<wps.length-1) w.i++;
      const target=Math.atan2(dx,dz);
      let err=target-a.a; while(err>Math.PI)err-=2*Math.PI; while(err<-Math.PI)err+=2*Math.PI;
      const slow=Math.abs(err)>0.45; K.KeyW=!slow||a.v<0.3; K.KeyA=err>0.08; K.KeyD=err<-0.08; if(Math.abs(err)<=0.08){K.KeyA=false;K.KeyD=false;}
      T+=33; window.__T=T; window.__step(0.033,T);
    }
    K.KeyW=K.KeyA=K.KeyD=false;
    return {x:+a.x.toFixed(1),z:+a.z.toFixed(1),v:+a.v.toFixed(1),wp:w.i,solid:window.__solid(a.x,a.z)};
  }, wps, si);
  if(f%5===0){ await p.evaluate(()=>{ window.__noRender=false; let T=window.__T||99000; for(let k=0;k<6;k++){T+=33;window.__step(0.033,T);} window.__T=T; }); await new Promise(r=>setTimeout(r,600)); await p.screenshot({path:`/tmp/${tag}_drv${dir}_${shot}.png`}); console.log('shot',shot,JSON.stringify(st)); shot++; }
  if(st.wp>=wps.length-1 && Math.hypot(st.x-wps[wps.length-1][0],st.z-wps[wps.length-1][1])<3) { console.log('REACHED', JSON.stringify(st)); break; }
}
await b.close(); process.exit(0);
