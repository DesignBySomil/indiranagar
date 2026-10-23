import puppeteer from 'puppeteer-core';
const port=process.argv[2];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:300000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto;
 const pts=(u)=>{const c=Math.cos(u.yaw),s=Math.sin(u.yaw);const hl=u.halfLen||2,hw=1;const r=[[u.x,u.z]];for(const [lx,lz] of [[hw,hl],[-hw,hl],[hw,-hl],[-hw,-hl]])r.push([u.x+c*lx+s*lz,u.z-s*lx+c*lz]);return r;};
 const cls=(u)=>{let st=0,dv=0,mn=99;const sg=u.seg;for(const q of pts(u)){if(g.solid(q[0],q[1]))st=1;if(window.__inDivider(q[0],q[1]))dv=1;const lat=Math.abs(-(q[0]-sg.x1)*sg.uz+(q[1]-sg.z1)*sg.ux);mn=Math.min(mn,sg.width/2-lat);}return {st,dv,mn};};
 const out=[]; const us=g.traffic.units.filter(u=>u.seg&&u.seg.len>40).slice(0,30);
 const idxs=us.map(u=>g.traffic.units.indexOf(u));
 for(const u of us){ const s=u.seg;const fx=s.ux*u.dir,fz=s.uz*u.dir;a.x=u.x-fx*10;a.z=u.z-fz*10;a.a=Math.atan2(fx,fz);a.v=0;stp(5);
  window.__keys['KeyW']=true;let hit=-1;
  for(let k=0;k<160;k++){stp(1);if(hit<0&&Math.hypot(u.ox||0,u.oz||0)>0.05){hit=k;window.__keys['KeyW']=false;}if(hit>=0&&k>hit+4)break;}
  window.__keys['KeyW']=false;if(hit<0)continue;
  let sf=0,df=0,mn=99,mo=0;for(let k=0;k<400;k++){stp(1);const c=cls(u);sf+=c.st;df+=c.dv;mn=Math.min(mn,c.mn);mo=Math.max(mo,Math.hypot(u.ox||0,u.oz||0));}
  out.push({i:g.traffic.units.indexOf(u),sf,df,mn:+mn.toFixed(2),mo:+mo.toFixed(1),fo:+Math.hypot(u.ox||0,u.oz||0).toFixed(1),v:+u.speed.toFixed(1)});}
 return out;});
console.log('DET',port,JSON.stringify(r)); await b.close();process.exit(0);
