import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
const ids=[];
const out=await p.evaluate((ids)=>{const g=window.__game,K=window.__keys,S=g.roadSegs(),res=[];const W=[[380,37],[301,-578],[601,-553],[498,-503],[591,-564],[535,-566],[522,-548],[610,-564],[602,-564]];S.forEach((s,i)=>{const mx=(s.x1+s.x2)/2,mz=(s.z1+s.z2)/2;if(W.some(w=>Math.hypot(w[0]-mx,w[1]-mz)<16))ids.push(i)});
 const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
 const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
 for(const i of ids)for(const dir of [1,-1]){const s=S[i];const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);let ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L;let x1=s.x1,z1=s.z1;if(dir<0){ux=-ux;uz=-uz;x1=s.x2;z1=s.z2}
  const nx=-uz,nz=ux,a0=Math.atan2(ux,uz);
  // lateral plan: smallest |o| free of footprints
  const plan=[];for(let t=0;t<=L+8;t+=1){let best=null;for(let o=0;o<=0;o+=0.25){for(const sg of [1,-1]){const oo=o*sg;if(free(x1+ux*t+nx*oo,z1+uz*t+nz*oo,a0)){best=oo;break}}if(best!==null)break}plan.push(best)}
  const miss=plan.filter(v=>v===null).length;const maxoff=Math.max(...plan.filter(v=>v!==null).map(Math.abs));
  // fix nulls by neighbours
  for(let k=0;k<plan.length;k++)if(plan[k]===null)plan[k]=k?plan[k-1]:0;
  const at=(t)=>{const k=Math.max(0,Math.min(plan.length-1,Math.round(t)));return[x1+ux*t+nx*plan[k],z1+uz*t+nz*plan[k]]};
  const sx=at(0);g.auto.x=sx[0];g.auto.z=sz0(sx);function sz0(q){return q[1]}g.auto.a=a0;g.auto.v=0;g.auto.steer=0;
  let jumps=0,prog=0,stall=0,hullHit=0,maxdev=0;const startFree=free(g.auto.x,g.auto.z,a0);
  for(let n=0;n<900;n++){const dx=g.auto.x-x1,dz=g.auto.z-z1;prog=dx*ux+dz*uz;const tq=at(prog+7);const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
   const vt=Math.abs(err)>0.6?1.5:Math.abs(err)>0.3?3:Math.abs(err)>0.15?5:7;K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;const px=g.auto.x,pz=g.auto.z;window.__step(0.05,performance.now());const mv=Math.hypot(g.auto.x-px,g.auto.z-pz);if(mv>1.5)jumps++;if(!free(g.auto.x,g.auto.z,g.auto.a))hullHit++;if(prog>=L-1)break}
  K.KeyW=K.KeyA=K.KeyD=false;res.push({i,dir,L:+L.toFixed(0),startFree,planMiss:miss,maxoff,prog:+prog.toFixed(1),jumps,hullHit,steps:0})}
 return res},ids);
for(const o of out)console.log(JSON.stringify(o));await b.close();