import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4175/?ao=0';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({width:640,height:360}); await p.goto(url,{waitUntil:'load'});
await p.waitForFunction('window.__game && window.__step && window.__renderer',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=12;g.go();});
await new Promise(r=>setTimeout(r,4000));
const out = await p.evaluate(()=>{
  const r=window.__renderer, s=window.__scene; const info=r.info;
  let meshes=0,inst=0,instCount=0,vis=0,pts=0,lines=0,sprites=0; const mats=new Set(), by={};
  s.traverse(o=>{ if(o.isMesh){meshes++; if(o.visible)vis++; mats.add(o.material.uuid); if(o.isInstancedMesh){inst++;instCount+=o.count;}
    const k=(o.parent&&o.parent.name)||o.parent?.type||'?'; by[k]=(by[k]||0)+1;} if(o.isPoints)pts++; if(o.isLine)lines++; if(o.isSprite)sprites++; });
  const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return {meshes,visibleMeshes:vis,instanced:inst,instanceCount:instCount,uniqueMaterials:mats.size,points:pts,lines,sprites,top,infoCalls:info.render.calls,tris:info.render.triangles,geoms:info.memory.geometries,tex:info.memory.textures,programs:info.programs?.length};
});
console.log(JSON.stringify(out));
await b.close();
