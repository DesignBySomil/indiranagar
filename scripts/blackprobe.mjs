import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true;
  const scene=g.scene||window.__scene; if(!scene) return {err:'no scene handle',keys:Object.keys(g)};
  const out=[];
  const v=new (scene.position.constructor)();
  scene.traverse(o=>{
    if(!o.isMesh&&!o.isSprite) return;
    const m=o.material; if(!m) return;
    const c=m.color;
    // board-like only; any material
    if(!o.geometry||!o.geometry.parameters) return;
    const pr=o.geometry.parameters;
    const w=pr.width||0,h=pr.height||0;
    const dep=pr.depth||0;
    if(w<0.7||w>4.5||h<0.5||h>3.2||dep>0.35) return;
    o.getWorldPosition(v);
    let chain=[],an=o; while(an&&chain.length<4){chain.push(an.name||an.type);an=an.parent;}
    if(v.y<1.4||v.y>4.6) return;
    if(!(v.x>150&&v.x<540&&v.z>-310&&v.z<-230)) return;
    out.push({x:+v.x.toFixed(1),y:+v.y.toFixed(1),z:+v.z.toFixed(1),w,h,mat:m.type,hasMap:!!m.map,emi:m.emissiveIntensity,chain:chain.join('<'),vis:o.visible});
  });
  return {n:out.length,hits:out.slice(0,40)};
});
console.log(JSON.stringify(r,null,1));
await b.close();
