import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/?traffic=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__spawnAt(-102,79,0);
  let t0=90000; for(let k=0;k<60;k++){t0+=33;window.__step(0.033,t0);}
  const T=window.__THREE||null;
  const hits=[];
  const m4=new (window.__scene.children[0].matrixWorld.constructor)();
  const pos={x:0,y:0,z:0};
  window.__scene.traverse(o=>{
    if(o.isInstancedMesh){
      const cnt=o.count||0;
      for(let i=0;i<cnt;i++){
        o.getMatrixAt(i,m4);
        const e=m4.elements; const x=e[12],y=e[13],z=e[14];
        if(Math.hypot(x-(-102),z-79)<22) hits.push({kind:'inst',name:o.name||o.type,geo:(o.geometry&&o.geometry.type)||'',i,x:+x.toFixed(1),y:+y.toFixed(1),z:+z.toFixed(1),vis:o.visible,cnt:o.count});
      }
    } else if(o.isMesh||o.isSprite){
      const wp=o.getWorldPosition(o.position.clone());
      if(Math.hypot(wp.x-(-102),wp.z-79)<18&&wp.y>0.25&&wp.y<3) hits.push({kind:o.isSprite?'sprite':'mesh',name:o.name||o.type,geo:(o.geometry&&o.geometry.type)||'',x:+wp.x.toFixed(1),y:+wp.y.toFixed(1),z:+wp.z.toFixed(1),vis:o.visible,mat:(o.material&&(o.material.color&&o.material.color.getHexString?o.material.color.getHexString():o.material.type))||''});
    }
  });
  return hits;
});
console.log(JSON.stringify(out,null,1));
await b.close(); process.exit(0);
