import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game; g.go(0);
  g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const cvs=document.getElementById('c');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  g.auto.x=200; g.auto.z=-266; g.auto.a=Math.PI/2; g.auto.v=0;
  step(90);
  const crowd=g.crowd; const peds=crowd.peds;
  // record which peds currently hold gem slots + their distance
  const gems=peds.filter(q=>q._gemVariant!==undefined).map(q=>({id:q.id,d:+Math.hypot(q.x-g.auto.x,q.z-g.auto.z).toFixed(1),v:q._gemVariant,t:q.tkey}));
  window.__noRender=false; const fA=await cap(); window.__noRender=true;
  // force-release all gem slots: hide gem groups, clear ownership; next step re-renders blocky proxies
  const scene=g.scene||window.__scene;
  const hidden=[];
  scene.traverse(o=>{});
  peds.forEach(q=>{ q._gemVariant=undefined; });
  // hide any visible gem groups: find them via crowd's slots if exposed, else by name
  // the gem groups are Group clones added to crowd.group - mark by traversal: groups with >8 children and a head child
  crowd.group.children.forEach(ch=>{ if(ch.userData&&ch.userData.parts&&ch.userData.parts.body){ hidden.push(ch.uuid); ch.visible=false; } });
  step(2);
  window.__noRender=false; const fB=await cap(); window.__noRender=true;
  return {fA,fB,gems,hidden:hidden.length};
});
writeFileSync('/tmp/lodA.png', Buffer.from(r.fA.split(',')[1],'base64'));
writeFileSync('/tmp/lodB.png', Buffer.from(r.fB.split(',')[1],'base64'));
console.log(JSON.stringify({gems:r.gems,hidden:r.hidden}));
await b.close();
