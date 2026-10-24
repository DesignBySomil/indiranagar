import puppeteer from 'puppeteer-core';import {writeFileSync} from 'fs';
const port=process.argv[2],tag=process.argv[3],COFF=+process.argv[4]||1.3;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.evaluateOnNewDocument(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
await p.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.props&&window.__step,{timeout:120000});
const r=await p.evaluate(async(COFF)=>{
 const g=window.__game; g.go(0); g.state.hour=10; window.__noRender=true; window.__paused=true; window.__noCardUntil=performance.now()+600000; let T=90000; const stp=n=>{for(let k=0;k<n;k++){T+=33;window.__step(0.033,T);}}; stp(10);
 const a=g.auto,cvs=document.getElementById('c'),segs=g.roadSegs(),res=[],frames={},log=[];
 const cap=async(cx,cy,cz,lx,ly,lz)=>{g.camera.position.set(cx,cy,cz);g.camera.lookAt(lx,ly,lz);g.camera.updateMatrixWorld();window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;const u=cvs.toDataURL('image/png');return u;};
 const mean=async(u)=>{const im=new Image();im.src=u;await im.decode();const c=document.createElement('canvas');c.width=64;c.height=36;const x=c.getContext('2d');x.drawImage(im,0,0,64,36);const d=x.getImageData(0,0,64,36).data;let t=0;for(let i=0;i<d.length;i+=4)t+=d[i]+d[i+1]+d[i+2];return +(t/(d.length/4*3)).toFixed(1);};
 const carts=g.props.items.filter(i=>i.mass===1.5&&i.state===0).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z)).slice(0,14);
 for(const cart of carts){
  let bs=null,bd=1e9,bx=0,bz=0; for(const s of segs){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((cart.x-s.x1)*dx+(cart.z-s.z1)*dz)/L2)),qx=cart.x-(s.x1+dx*t),qz=cart.z-(s.z1+dz*t),d=qx*qx+qz*qz;if(d<bd){bd=d;bs=s;bx=qx;bz=qz;}}
  const L=Math.hypot(bs.x2-bs.x1,bs.z2-bs.z1),fx=(bs.x2-bs.x1)/L,fz=(bs.z2-bs.z1)/L,al=Math.hypot(bx,bz),ax=bx/al,az=bz/al;
  for(const dir of [1,-1]){
   const hx=fx*dir,hz=fz*dir;
   a.x=cart.x-ax*COFF-hx*10;a.z=cart.z-az*COFF-hz*10;a.a=Math.atan2(hx,hz);a.v=0;stp(4);
   const clear=[];for(let d=0;d<=10;d+=1){for(const lt of [-1,0,1]){const qx=cart.x-ax*COFF-hx*d+hz*lt,qz=cart.z-az*COFF-hz*d-hx*lt;if(g.parked.solid(qx,qz)||g.solid(qx,qz))clear.push([d,lt]);}}
   const x0=a.x,z0=a.z;window.__keys['KeyW']=true;let hit=false,vh=0,mind=99;for(let k=0;k<220;k++){stp(1);mind=Math.min(mind,Math.hypot(a.x-cart.x,a.z-cart.z));if(cart.state!==0){hit=true;vh=a.v;break;}}
   var rec={dir,lineBlocked:clear.length,hit,vh:+vh.toFixed(1),minDist:+mind.toFixed(1),stoppedAt:+Math.hypot(a.x-x0,a.z-z0).toFixed(1)};
   if(hit){rec.fall=[+cart.fx.toFixed(2),+cart.fz.toFixed(2)];
    const cx=cart.x-ax*11-hx*3,cz=cart.z-az*11-hz*3;const sp=[];
    for(let k2=0;k2<=30;k2++){if(k2>0)stp(1);sp.push(+a.v.toFixed(1));if(k2%6===0){let u=await cap(cx,5.5,cz,cart.x+hx*1.5,1.2,cart.z+hz*1.5);let m=await mean(u);const row=[k2,m];if(m<8){const cb=g.camera.position.toArray().map(v=>+v.toFixed(1));{let nan=0;g.scene.traverse(o=>{if(o.matrixWorld&&o.matrixWorld.elements.some(v=>!isFinite(v)))nan++;});row.push('renderErr',String(window.__renderErr||''),'stepErr',String(window.__stepErr||''),'nanObjs',nan);window.__noRender=true;const R=window.__renderer;R.render(g.scene,g.camera);frames['raw']=cvs.toDataURL('image/png');row.push('directMean',await mean(frames['raw']));
  const P=window.__post,ps=P.composer.passes;row.push('passes',ps.map(q=>q.constructor.name+':'+q.enabled).join(','));
  const tryR=async(label)=>{window.__noRender=false;await new Promise(r=>requestAnimationFrame(r));await new Promise(r=>requestAnimationFrame(r));window.__noRender=true;const u=cvs.toDataURL('image/png');row.push(label,await mean(u));return u;};
  frames['post0']=await tryR('all');
  for(let i=0;i<ps.length;i++){const q=ps[i];if(q.constructor.name==='RenderPass')continue;const was=q.enabled;q.enabled=false;frames['post_off_'+q.constructor.name+i]=await tryR('off_'+q.constructor.name);q.enabled=was;}
  {const R=window.__renderer;const rt=P.composer.renderTarget1.clone();const w=rt.width,h=rt.height;R.setRenderTarget(rt);R.render(g.scene,g.camera);R.setRenderTarget(null);
  const buf=new Uint16Array(w*h*4);R.readRenderTargetPixels(rt,0,0,w,h,buf);let bad=0,mx=0,first=[];for(let i=0;i<w*h;i++){for(let c=0;c<3;c++){const v=buf[i*4+c];const e=(v>>10)&31;if(e===31){bad++;if(first.length<6)first.push([i%w,Math.floor(i/w),c,v.toString(16)]);break;}}}
  row.push('hdr',w,h,'nonfinitePx',bad,JSON.stringify(first),'tt',rt.texture.type);
  const cov=[];{const cam=g.camera;cam.updateMatrixWorld();const px=0.5/w*2-1+0,py=((293+0.5)/h)*2-1;const V=cam.position.clone();
  g.scene.traverse(o=>{if(!o.visible||!(o.isMesh||o.isPoints||o.isLine||o.isSprite))return;let bb=null;if(o.geometry){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();bb=o.geometry.boundingBox;}if(!bb)return;
   if(o.isInstancedMesh)return;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,ok=true;for(const cx of [bb.min.x,bb.max.x])for(const cy of [bb.min.y,bb.max.y])for(const cz of [bb.min.z,bb.max.z]){V.set(cx,cy,cz).applyMatrix4(o.matrixWorld).project(cam);if(V.z>1||V.z<-1){ok=false;}x0=Math.min(x0,V.x);x1=Math.max(x1,V.x);y0=Math.min(y0,V.y);y1=Math.max(y1,V.y);}
   if(ok&&px>=x0&&px<=x1&&py>=y0&&py<=y1)cov.push([o.type,o.name||'',o.geometry.type,o.material&&(o.material.type||''),o.material&&o.material.transparent?1:0,o.parent&&o.parent.name||'']);});
  row.push('covering',cov.length,JSON.stringify(cov.slice(0,15)));
  let inst=0;const ic=[];g.scene.traverse(o=>{if(o.isInstancedMesh&&o.visible)ic.push([o.name||'',o.count,o.material&&o.material.type]);});row.push('instMeshes',ic.length,JSON.stringify(ic.slice(0,25)));}
  const m=new Map();const cam=g.camera;g.scene.updateMatrixWorld();
  if(first.length){const [px,py]=first[0];row.push('firstPx',px,py);}}
  row.push('bloomStrength',P.bloomPass.strength,'night',g.state.hour);}
 row.push('retry',await mean(await cap(cx,5.5,cz,cart.x+hx*1.5,1.2,cart.z+hz*1.5)),'cam',cb.join(','),'T',T);} (rec.mean=rec.mean||[]).push(row);frames['k'+String(k2).padStart(2,'0')]=u;}}
    rec.sp=sp.join(',');{const len=cart.len*Math.sin(cart.th),ex=cart.x+cart.fx*len,ez=cart.z+cart.fz*len;const lat=(x,z)=>+((x-cart.x)*ax+(z-cart.z)*az).toFixed(2);const carLine=-COFF;rec.lie={len:+len.toFixed(2),endLatFromBase:lat(ex,ez),baseLat:0,carLineLat:carLine,carHalfW:1.0,endClearOfCar:Math.abs(lat(ex,ez)-carLine)>1.0,propsSolidEnd:!!g.props.solid(ex,ez),propsSolidMid:!!g.props.solid((cart.x+ex)/2,(cart.z+ez)/2),carFinalLat:+(((a.x-cart.x)*ax+(a.z-cart.z)*az)).toFixed(2)};}rec.th=+cart.th.toFixed(2);window.__keys['KeyW']=false;res.push(rec);return {res,frames};}
   window.__keys['KeyW']=false;res.push(rec);
  }}
 return {res,frames};},COFF);
for(const [k,v] of Object.entries(r.frames)) writeFileSync(`/tmp/f4_${tag}_${k}.png`,Buffer.from(v.split(',')[1],'base64'));
console.log(JSON.stringify(r.res));await b.close();process.exit(0);
