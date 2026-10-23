import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:600000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
const out=await p.evaluate(()=>{
  const g=window.__game,K=window.__keys;
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
  const inDiv=window.__inDivider?()=>window.__inDivider(g.auto.x,g.auto.z):()=>'nofn';
  const res=[];
  for(const [ri,dir] of [[2,-1],[8,-1],[9,-1],[2,1],[9,1]]){
    const raw=g.world.roads[ri].p;
    const ib=raw.map(pt=>Math.abs(pt[0])<998&&Math.abs(pt[1])<998);
    let best=[0,0],cur=null;
    for(let i=0;i<raw.length;i++){ if(ib[i]){ if(cur===null)cur=i; if(i-cur>best[1]-best[0])best=[cur,i]; } else cur=null; }
    const PTS=raw.slice(best[0],best[1]+1).map(pt=>[pt[0],pt[1]]);
    const cum=[0];for(let i=1;i<PTS.length;i++)cum.push(cum[i-1]+Math.hypot(PTS[i][0]-PTS[i-1][0],PTS[i][1]-PTS[i-1][1]));
    const L=cum[cum.length-1];
    const at=(t)=>{t=Math.max(0,Math.min(L,t));let i=1;while(i<cum.length-1&&cum[i]<t)i++;const f=(t-cum[i-1])/((cum[i]-cum[i-1])||1);return[PTS[i-1][0]+(PTS[i][0]-PTS[i-1][0])*f,PTS[i-1][1]+(PTS[i][1]-PTS[i-1][1])*f]};
    const s0=dir>0?at(0):at(L),s1=dir>0?at(2):at(L-2);
    g.auto.x=s0[0];g.auto.z=s0[1];g.auto.a=Math.atan2(s1[0]-s0[0],s1[1]-s0[1]);g.auto.v=0;g.auto.steer=0;
    const log=[{step:0,x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1),free:free(g.auto.x,g.auto.z,g.auto.a),div:inDiv()}];
    // solid probe around spawn: 8 directions at 2m and 4m
    const ring=[];for(let k=0;k<8;k++){const an=k*Math.PI/4;ring.push([k*45, g.solid(s0[0]+Math.cos(an)*2,s0[1]+Math.sin(an)*2)?1:0, g.solid(s0[0]+Math.cos(an)*4,s0[1]+Math.sin(an)*4)?1:0]);}
    // hold W for 300 steps
    K.KeyW=true;K.KeyA=K.KeyD=K.KeyS=false;
    let maxv=0;
    for(let n=1;n<=300;n++){ window.__step(0.05,performance.now()); maxv=Math.max(maxv,g.auto.v);
      if(n%50===0) log.push({step:n,x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1),v:+g.auto.v.toFixed(1),free:free(g.auto.x,g.auto.z,g.auto.a),div:inDiv()}); }
    K.KeyW=false;
    res.push({road:ri,dir,L:+L.toFixed(0),spawn:[+s0[0].toFixed(1),+s0[1].toFixed(1)],spawnFree:log[0].free,ring,maxv:+maxv.toFixed(1),log});
  }
  return res;
});
for(const r of out) console.log('PROBE289', JSON.stringify(r));
await b.close();
