import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const [port,tag]=[process.argv[2],process.argv[3]];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,U=g.traffic.units,scene=window.__scene,cvs=document.getElementById('c');
 const cap=async()=>{window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;return cvs.toDataURL('image/png');};
 const dark=async(d)=>{const im=new Image();im.src=d;await im.decode();const c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');x.drawImage(im,0,0);const D=x.getImageData(0,0,640,360).data;let n=0;for(let i=0;i<D.length;i+=4){if(D[i]+D[i+1]+D[i+2]<30)n++;}return n;};
 const res=[];
 for(const u of U.filter(u=>u.seg&&u.seg.len>40&&u.td&&u.td.key==='auto')){ if(res.length>=2)break;
  const s=u.seg,fx=s.ux*u.dir,fz=s.uz*u.dir;a.x=u.x-fx*10;a.z=u.z-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(5);
  window.__keys['KeyW']=true;let hit=false;for(let k=0;k<200;k++){stp(1);if(u.cool>0||u.kvx||u.kvz){hit=true;break;}}
  window.__keys['KeyW']=false; if(!hit)continue; window.__paused=true;
  const e={frames:{}};
  for(const [name,n] of [['0',0],['2',2],['6',4],['15',9],['40',25]]){stp(n);const d=await cap();e.frames[name]=d;e['dark_'+name]=await dark(d);
   let bub=0;scene.traverse(o=>{if(o.isSprite&&o.visible&&o.scale.x>1)bub++;});e['bubbles_'+name]=bub;}
  res.push(e); window.__paused=false; stp(100);
 }
 return res;});
let i=0;for(const e of r){i++;for(const [k,v] of Object.entries(e.frames))writeFileSync(`/downloads/blk_${tag}_${i}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));delete e.frames;console.log(tag,i,JSON.stringify(e));}
await b.close();process.exit(0);
