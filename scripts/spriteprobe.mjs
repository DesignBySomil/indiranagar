import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true;
  const scene=g.scene||window.__scene;
  const out=[];
  const v=new (scene.position.constructor)();
  scene.traverse(o=>{
    if(!o.isSprite) return;
    o.getWorldPosition(v);
    const m=o.material||{};
    out.push({x:+v.x.toFixed(1),y:+v.y.toFixed(1),z:+v.z.toFixed(1),sx:+o.scale.x.toFixed(2),sy:+o.scale.y.toFixed(2),vis:o.visible,hasMap:!!m.map,color:m.color?m.color.getHexString():null,opacity:m.opacity,rot:+((m.rotation||0).toFixed(2))});
  });
  return out;
});
console.log(JSON.stringify(r.filter(s=>s.vis).slice(0,50),null,0));
console.log('INVISIBLE:',JSON.stringify(r.filter(s=>!s.vis)));
await b.close();
