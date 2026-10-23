import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const [port,tag,side]=[process.argv[2],process.argv[3],+process.argv[4]||1];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async(side)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto; const scene=window.__scene; const cvs=document.getElementById('c');
 const cap=async(cx,cy,cz,lx,ly,lz)=>{g.camera.position.set(cx,cy,cz);g.camera.lookAt(lx,ly,lz);g.camera.updateMatrixWorld();window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;return cvs.toDataURL('image/png');};
 for(const u of g.traffic.units.filter(u=>u.seg&&u.seg.len>40)){const s=u.seg;const fx=s.ux*u.dir,fz=s.uz*u.dir;a.x=u.x-fx*10;a.z=u.z-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(5);
  window.__keys['KeyW']=true;
  for(let k=0;k<200;k++){stp(1);
   const bs=(u.cool>0||u.kvx||u.kvz||u.ksv)?1:null;
   if(bs){window.__keys['KeyW']=false;window.__paused=true;
    const hx=u.x+(u.ox||0),hz=u.z+(u.oz||0),nx=-fz*side,nz=fx*side;const out={idx:g.traffic.units.indexOf(u),key:u.td&&u.td.key,frames:{},traj:[]};
    const marks={0:0,3:'0.1',12:'0.4',30:'1',61:'2',121:'4'};
    for(let k2=0;k2<=121;k2++){ if(k2>0)stp(1); out.traj.push([+(u.x+(u.ox||0)).toFixed(2),+(u.z+(u.oz||0)).toFixed(2),+u.speed.toFixed(2),!!u.wreck]);
      if(marks[k2]!==undefined){scene.traverse(o=>{if(o.isSprite&&o.scale.x>1)o.visible=false;});out.frames[marks[k2]]=await cap(hx+nx*11,6,hz+nz*11,hx+fx*0,0.8,hz+fz*0);}}
    return out;}
  } window.__keys['KeyW']=false;}
 return null;},side);
if(!r){console.log('NOHIT');process.exit(1)}
for(const [k,v] of Object.entries(r.frames)) writeFileSync(`/downloads/vis_${tag}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));
console.log('IDX',r.idx,r.key,await p.evaluate(()=>[window.__renderErr,window.__stepErr,JSON.stringify(window.__game.camera.position)]));console.log('TRAJ',JSON.stringify(r.traj.filter((_,i)=>[0,3,12,30,61,121].includes(i))));
await b.close();process.exit(0);
