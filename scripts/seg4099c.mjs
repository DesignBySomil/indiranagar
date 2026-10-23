import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
const out=await p.evaluate(()=>{
  const g=window.__game,K=window.__keys,S=g.roadSegs();const i=4099;const s=S[i];
  const L=Math.hypot(s.x2-s.x1,s.z2-s.z1);const ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L;
  // piers near the seg line
  const P=window.__piers||[];
  const nearP=P.filter(([px,pz])=>{const t=Math.max(0,Math.min(L,(px-s.x1)*ux+(pz-s.z1)*uz));const dx=px-(s.x1+ux*t),dz=pz-(s.z1+uz*t);return dx*dx+dz*dz<9});
  const a0=Math.atan2(ux,uz);
  g.auto.x=s.x1;g.auto.z=s.z1;g.auto.a=a0;g.auto.v=0;g.auto.steer=0;
  const log=[];let prog=0,lastA=a0,cum=0;
  for(let n=0;n<900;n++){
    const dx=g.auto.x-s.x1,dz=g.auto.z-s.z1;prog=dx*ux+dz*uz;
    const tq=[s.x1+ux*Math.min(prog+7,L+8),s.z1+uz*Math.min(prog+7,L+8)];
    const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
    const vt=Math.abs(err)>0.6?1.5:Math.abs(err)>0.3?3:Math.abs(err)>0.15?5:7;
    K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;
    window.__step(0.05,performance.now());
    let da=g.auto.a-lastA;lastA=g.auto.a;da=Math.atan2(Math.sin(da),Math.cos(da));cum+=da;
    if(n%10===0){const a=g.auto.a,fx=Math.sin(a),fz=Math.cos(a);
      const noseS=g.solid(g.auto.x+fx*1.95,g.auto.z+fz*1.95)?1:0;
      const pier=window.__piers?0:0;
      log.push([+(n*0.05).toFixed(1),+g.auto.x.toFixed(2),+g.auto.z.toFixed(2),+a.toFixed(2),+g.auto.v.toFixed(2),noseS,+prog.toFixed(1),+err.toFixed(2)]);}
    if(prog>=L-1)break;
  }
  K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;
  return {nearP:nearP.map(q=>q.map(v=>+v.toFixed(1))),final:log[log.length-1],log:log.filter((_,k)=>k%4===0||k>log.length-8)};
});
console.log('PIERS '+JSON.stringify(out.nearP));
console.log('t x z a v noseSolid prog err');
for(const r of out.log)console.log(r.join(' '));
await b.close();
