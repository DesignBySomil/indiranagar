import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=150',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  const A=g.auto, K=window.__keys;
  window.__spawnAt(-104,45,0);
  let t0=90000; window.__noRender=true;
  const step=()=>{t0+=33;window.__step(0.033,t0);};
  for(let k=0;k<30;k++) step();
  const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
  const wp=[-100,110];
  const frames=[]; let stallT=0, maxStall=0, crossed78=0, crossed90=0;
  const zHist=[];
  for(let k=0;k<2700;k++){ // 90s sim, user-style inputs only, NO unstick
    const ty=Math.atan2(wp[0]-A.x,wp[1]-A.z);
    const err=norm(ty-A.a);
    K.KeyA=err>0.05; K.KeyD=err<-0.05;
    const wantSlow=Math.abs(err)>0.55;
    K.KeyW=wantSlow?(A.v<3.2):(A.v<8.5);
    K.KeyS=!wantSlow?false:(A.v>4.5);
    step();
    if(Math.abs(A.v)<0.35&&K.KeyW){stallT+=0.033; if(stallT>maxStall)maxStall=stallT;} else stallT=0;
    if(!crossed78&&A.z>78)crossed78=k*0.033;
    if(!crossed90&&A.z>90)crossed90=k*0.033;
    if(k%15===0)zHist.push(+A.z.toFixed(1));
    if(k%450===0||k===2699){
      window.__noRender=false; await new Promise(r=>requestAnimationFrame(r));
      frames.push([Math.round(k*0.033),document.getElementById('c').toDataURL('image/jpeg',0.82)]);
      window.__noRender=true;
    }
  }
  K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;
  return {end:[+A.x.toFixed(1),+A.z.toFixed(1)],crossed78:+crossed78.toFixed(1),crossed90:+crossed90.toFixed(1),maxStall:+maxStall.toFixed(1),zHist,frames};
});
writeFileSync('/tmp/wedge-result.json',JSON.stringify({end:out.end,crossed78:out.crossed78,crossed90:out.crossed90,maxStall:out.maxStall,zHist:out.zHist}));
for(const [t,f] of out.frames) writeFileSync('/downloads/wedge-'+t+'s.jpg',Buffer.from(f.split(',')[1],'base64'));
console.log(JSON.stringify({end:out.end,crossed78:out.crossed78,crossed90:out.crossed90,maxStall:out.maxStall}));
await b.close(); process.exit(0);
