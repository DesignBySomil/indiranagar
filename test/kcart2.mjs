import puppeteer from 'puppeteer-core';
const port=process.argv[2];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage();
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
 const g=window.__game,P=g.props,segs=g.roadSegs();const out=[];
 const carts=P.items.filter(i=>i.mass===1.5);
 carts.forEach((c,ix)=>{
  let bd=1e9,ax=0,az=0;for(const s of segs){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((c.x-s.x1)*dx+(c.z-s.z1)*dz)/L2)),qx=it=c.x-(s.x1+dx*t),qz=c.z-(s.z1+dz*t),d=qx*qx+qz*qz;if(d<bd){bd=d;ax=qx;az=qz;}}
  const l=Math.hypot(ax,az);ax/=l;az/=l; const len=c.len*Math.sin(c.max);
  const dirs={away:[ax,az],left:[-az,ax],right:[az,-ax],toRoad:[-ax,-az]};const res={};
  for(const [k,[ux,uz]] of Object.entries(dirs)){const hits=[];for(const f of [0.15,0.3,0.5,0.7,0.85,1]){const x=c.x+ux*len*f,z=c.z+uz*len*f;const w=[g.solid(x,z)?'bldg':'',g.parked.overlaps(x,z,0.1)?'parked':''].filter(Boolean);if(w.length)hits.push(f+':'+w.join('+'));}res[k]=hits.join(',')||'clear';}
  out.push({ix,len:+len.toFixed(2),res});});
 return out.slice(0,8);});
console.log(JSON.stringify(r,null,0));await b.close();process.exit(0);
