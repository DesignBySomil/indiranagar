import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const [port,tag,HOUR]=[process.argv[2],process.argv[3],+process.argv[4]||10];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async(HOUR)=>{
 const g=window.__game; g.go(0); g.state.hour=HOUR; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,U=g.traffic.units,scene=window.__scene,cvs=document.getElementById('c');
 const cap=async()=>{window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;return cvs.toDataURL('image/png');};
 const dark=async(d)=>{const im=new Image();im.src=d;await im.decode();const c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');x.drawImage(im,0,0);const D=x.getImageData(0,0,640,360).data;let n=0;for(let i=0;i<D.length;i+=4){if(D[i]+D[i+1]+D[i+2]<30)n++;}return n;};
 const res=[];
 const wr=[];scene.traverse(o=>{if(o.isGroup&&o.children.length===2&&o.children[0].isGroup&&o.children[1]&&o.parent&&o.parent!==scene&&Math.abs(o.position.x)+Math.abs(o.position.z)>1)wr.push(o);});
 const SP=[];scene.traverse(o=>{if(o.isSprite&&o.material&&o.material.map&&o.material.map.image&&o.material.map.image.width>=256)SP.push(o);});const spr=()=>{let n=0;for(const o of SP)if(o.visible)n++;return n;};
 res.push({npcWrappers:wr.length,pool:SP.length});
 for(const w of wr){ if(res.length>=2)break;
  const fx=Math.sin(w.rotation.y),fz=Math.cos(w.rotation.y);a.x=w.position.x-fx*9;a.z=w.position.z-fz*9;a.a=w.rotation.y;a.v=0;stp(3);
  const s0=spr();window.__keys['KeyW']=true;let hit=false;for(let k=0;k<150;k++){stp(1);if(spr()>s0){hit=true;break;}}
  window.__keys['KeyW']=false; if(!hit)continue; window.__paused=true;
  const e={frames:{},bubbleAtHit:spr()};
  for(const [name,n] of [['8',8],['30',22],['end',-1]]){if(n<0){let q=0;while(spr()>=s0&&q<500){stp(1);q++;}e.endSteps=q;}else stp(n);let d=await cap(),dk=await dark(d);for(let t=0;t<3&&dk>=230000;t++){d=await cap();dk=await dark(d);}e.frames[name]=d;e['dark_'+name]=dk;e['bub_'+name]=spr();}
  res.push(e); window.__paused=false; stp(100);
 }
 return res;},HOUR);
let i=0;for(const e of r){i++;if(e.frames)for(const [k,v] of Object.entries(e.frames))writeFileSync(`/downloads/blk_${tag}_${i}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));delete e.frames;console.log(tag,i,JSON.stringify(e));}
await b.close();process.exit(0);
