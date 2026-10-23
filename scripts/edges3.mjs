import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
await p.evaluate((t)=>{window.T0=t},+(process.env.T0||-550));
const out=await p.evaluate(()=>{const g=window.__game,K=window.__keys,S=g.roadSegs();const lim={W:-622,E:802,N:-777,S:747};const res=[];
 for(const [e,ax,sgn] of [['N','z',-1]]){
  const a=ax=='x'?(sgn>0?Math.PI/2:-Math.PI/2):(sgn>0?0:Math.PI);
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const free=(x,z)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP)if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false;return true};
  let sx=null,sz=null;const rng=ax=='x'?[-700,700]:[+(window.T0||-550),700];
  for(let t=rng[0];t<=rng[1]&&sx===null;t+=3){let ok=true;for(let d=0;d<=14;d+=2){const x=ax=='x'?lim[e]-sgn*(1+d):t,z=ax=='x'?t:lim[e]-sgn*(1+d);if(!free(x,z)){ok=false;break}}if(ok){sx=ax=='x'?lim[e]-sgn*15:t;sz=ax=='x'?t:lim[e]-sgn*15}}
  if(sx===null){res.push({e,none:1});continue}
  g.auto.x=sx;g.auto.z=sz;g.auto.a=a;g.auto.v=0;g.auto.steer=0;K.KeyW=true;let jumps=0,minv=99;
  for(let i=0;i<260;i++){const px=g.auto.x,pz=g.auto.z;window.__step(0.05,performance.now());if(Math.hypot(g.auto.x-px,g.auto.z-pz)>1.5)jumps++}
  K.KeyW=false;const v=ax=='x'?g.auto.x:g.auto.z;
  res.push({e,start:[+sx.toFixed(0),+sz.toFixed(0)],end:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)],clamp:lim[e],beyondClamp:+(sgn*(v-lim[e])).toFixed(2),jumps})}
 return res});
for(const o of out)console.log(JSON.stringify(o));await b.close();
