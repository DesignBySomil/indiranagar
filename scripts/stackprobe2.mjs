import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:280000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?traffic=150',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async()=>{
  const g=window.__game; g.go(0); g.state.hour=10; if(g.applyTime)g.applyTime(10);
  window.__noRender=true;
  window.__spawnAt(430,-700,Math.PI); // player near the reported pocket
  let t0=90000; const step=()=>{t0+=33;window.__step(0.033,t0);};
  for(let k=0;k<400;k++) step();
  const T=window.__traffic(), U=T.units, segs=T.__validSegs||T.__segs;
  const segOf=(u)=>typeof u.seg==='number'?segs[u.seg]:u.seg;
  const nearPt=(x,z,r)=>U.map((u,i)=>({u,i})).filter(({u})=>Math.hypot(u.x-x,u.z-z)<r)
    .map(({u,i})=>{const s=segOf(u);return {i,x:+u.x.toFixed(2),z:+u.z.toFixed(2),segName:s&&s.name,segLen:s&&+s.len.toFixed(1),t:+u.t.toFixed(3),dir:u.dir,speed:+u.speed.toFixed(2),braking:u.braking};});
  const near=nearPt(430.5,-718.8,20);
  // pairs closer than 1.0m anywhere near the pocket
  const pairs=[];
  for(let a=0;a<near.length;a++)for(let c=a+1;c<near.length;c++){
    const d=Math.hypot(near[a].x-near[c].x,near[a].z-near[c].z);
    if(d<1.5)pairs.push({a:near[a],b:near[c],d:+d.toFixed(2)});}
  const stopped=near.filter(u=>u.speed<0.5);
  return {player:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)],nearCount:near.length,near,stopped,pairs};
});
console.log(JSON.stringify(out,null,1));
await b.close(); process.exit(0);
