import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
// args: x z yaw out  x z yaw out (two shots, one boot)
const a=process.argv.slice(2);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
for(let i=0;i<2;i++){
  const px=+a[i*4],pz=+a[i*4+1],pa=+a[i*4+2],out=a[i*4+3];
  const shot=await p.evaluate(async(px,pz,pa)=>{
    const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
    window.__spawnAt(px,pz,pa);
    window.__noRender=true; let t0=90000;
    for(let k=0;k<40;k++){t0+=33;window.__step(0.033,t0);}
    window.__noRender=false;
    await new Promise(r=>requestAnimationFrame(r));
    // probe: what colliders/props are near the car
    const A=g.auto; const near=[];
    const probe=(list,tag)=>{ if(!list)return; for(const o of list){ if(!o)continue; const ox=o.x??o.px,oz=o.z??o.pz; if(ox==null)continue; const d=Math.hypot(ox-A.x,oz-A.z); if(d<12) near.push({tag,d:+d.toFixed(1),x:+ox.toFixed(1),z:+oz.toFixed(1),r:o.r??o.radius??null}); } };
    const tryProbe=(list,tag)=>{ try{ probe(Array.isArray(list)?list:(list&&list.list)||(list&&list.items)||[],tag);}catch(e){ near.push({tag,err:String(e).slice(0,40)}); } };
    tryProbe(g.props,'prop'); tryProbe(g.npcs,'npc'); tryProbe(g.units,'unit'); tryProbe(g.parked,'parked'); tryProbe(g.barricades,'barricade'); tryProbe(g.obstacles,'obstacle');
    return {img:document.getElementById('c').toDataURL('image/jpeg',0.82),car:{x:+A.x.toFixed(1),z:+A.z.toFixed(1)},near:near.slice(0,12),keys:Object.keys(g).filter(k=>Array.isArray(g[k])).slice(0,30)};
  },px,pz,pa);
  writeFileSync(out,Buffer.from(shot.img.split(',')[1],'base64'));
  console.log('SHOT',out,'car',JSON.stringify(shot.car),'near',JSON.stringify(shot.near));
  console.log('array-keys',JSON.stringify(shot.keys));
}
await b.close(); process.exit(0);
