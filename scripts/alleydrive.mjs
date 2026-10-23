import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
const ids=(process.env.IDS||'872,1122,1385,1392,1397,1401,1634').split(',').map(Number);
const out=await p.evaluate((ids)=>{const g=window.__game,K=window.__keys,S=g.roadSegs(),res=[];
 const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
 const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
 for(const i of ids)for(const dir of [1,-1]){const s=S[i];const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);let ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L;let x1=s.x1,z1=s.z1;if(dir<0){ux=-ux;uz=-uz;x1=s.x2;z1=s.z2}
  const nx=-uz,nz=ux,a0=Math.atan2(ux,uz);
  // lateral plan: smallest |o| free of footprints
  const plan=[];for(let t=0;t<=L+8;t+=1){let best=null;for(let o=0;o<=4;o+=0.25){for(const sg of [1,-1]){const oo=o*sg;if(free(x1+ux*t+nx*oo,z1+uz*t+nz*oo,a0)){best=oo;break}}if(best!==null)break}plan.push(best)}
  const miss=plan.filter(v=>v===null).length;const maxoff=Math.max(...plan.filter(v=>v!==null).map(Math.abs));
  // fix nulls by neighbours
  for(let k=0;k<plan.length;k++)if(plan[k]===null)plan[k]=k?plan[k-1]:0;
  const at=(t)=>{const k=Math.max(0,Math.min(plan.length-1,Math.round(t)));return[x1+ux*t+nx*plan[k],z1+uz*t+nz*plan[k]]};
  const sx=at(0);g.auto.x=sx[0];g.auto.z=sz0(sx);function sz0(q){return q[1]}g.auto.a=a0;g.auto.v=0;g.auto.steer=0;
  let jumps=0,prog=0,stall=0;const startFree=free(g.auto.x,g.auto.z,a0);
  for(let n=0;n<400;n++){const dx=g.auto.x-x1,dz=g.auto.z-z1;prog=dx*ux+dz*uz;const tq=at(prog+5);const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
   K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<4;const px=g.auto.x,pz=g.auto.z;window.__step(0.05,performance.now());const mv=Math.hypot(g.auto.x-px,g.auto.z-pz);if(mv>1.5)jumps++;if(prog>=L-1)break}
  K.KeyW=K.KeyA=K.KeyD=false;res.push({i,dir,L:+L.toFixed(0),startFree,planMiss:miss,maxoff,prog:+prog.toFixed(1),jumps})}
 return res},ids);
for(const o of out)console.log(JSON.stringify(o));await b.close();