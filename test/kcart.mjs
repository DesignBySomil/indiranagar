import puppeteer from 'puppeteer-core';
const port=process.argv[2];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
 const g=window.__game,P=g.props,segs=g.roadSegs();const out=[];
 const carts=P.items.filter(i=>i.mass===1.5),vend=P.items.filter(i=>i.mass===0.8);
 carts.forEach((c,ix)=>{ if(ix>5)return;
  let bd=1e9,ax=0,az=0;for(const s of segs){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((c.x-s.x1)*dx+(c.z-s.z1)*dz)/L2)),qx=c.x-(s.x1+dx*t),qz=c.z-(s.z1+dz*t),d=qx*qx+qz*qz;if(d<bd){bd=d;ax=qx;az=qz;}}
  const l=Math.hypot(ax,az);ax/=l;az/=l;
  const v=vend[ix]; const ok=P.kickAt(c.x-ax*0.9,c.z-az*0.9,ax,az,4.5);
  for(let k=0;k<120;k++)P.update(0.033);
  out.push({roadDist:+Math.sqrt(bd).toFixed(1),kicked:ok,cartState:c.state,cartTh:+c.th.toFixed(2),cartFallDotAway:ok?+(c.fx*ax+c.fz*az).toFixed(2):null,vendorUntouched:v.state===0,solidAfterAtBase:P.solid(c.x,c.z)});
 });
 return {carts:carts.length,vend:vend.length,out};});
console.log(JSON.stringify(r));await b.close();process.exit(0);
