import puppeteer from 'puppeteer-core';
const [X,Z,A]=[+process.env.X,+process.env.Z,+process.env.A];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
console.log(await p.evaluate(([X,Z,A])=>{const g=window.__game,K=window.__keys;const o=[];
 const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95]];
 const pr=(x,z)=>{const r=[];if(window.__inDivider(x,z))r.push('div');if(g.solid(x,z))r.push('solid');if((window.__piers||[]).some(P=>(x-P[0])**2+(z-P[1])**2<1.32))r.push('pier');if(g.parked&&g.parked.solid(x,z))r.push('parked');if(g.life&&g.life.solid(x,z))r.push('life');if(g.traffic&&g.traffic.solid(x,z))r.push('traffic');if(g.crowd&&g.crowd.solid(x,z))r.push('crowd');return r.join('+')};
 g.auto.x=X;g.auto.z=Z;g.auto.a=A;g.auto.v=0;K.KeyW=true;
 for(let i=0;i<60;i++){window.__step(0.05,performance.now());if(i%10==0)o.push([i,g.auto.x.toFixed(1),g.auto.z.toFixed(1),g.auto.v.toFixed(1)].join(' '))}
 const a=g.auto.a,sn=Math.sin(a),cs=Math.cos(a);
 o.push('FP now:'+FP.map(([lx,lz])=>pr(g.auto.x+cs*lx+sn*lz,g.auto.z-sn*lx+cs*lz)||'-').join(','));
 const nx=g.auto.x+sn*1,nz=g.auto.z+cs*1;o.push('FP +1m:'+FP.map(([lx,lz])=>pr(nx+cs*lx+sn*lz,nz-sn*lx+cs*lz)||'-').join(','));
 o.push('hazards '+(g.hazards?Object.keys(g.hazards).join():'none')+' piers near: '+(window.__piers||[]).filter(P=>Math.hypot(P[0]-X,P[1]-Z)<15).map(P=>P.join(',')).join(';'));
 return o.join('\n')},[X,Z,A]));await b.close();
