// Full drive of world.roads[2], [8], [9] in-bounds portions, both directions.
// Follows each road's own polyline (graze455e-style adaptive follower, traffic/life/crowd neutralized
// for the static-geometry pass). Reports per road+dir: progress vs in-bounds length, jumps, hull hits, orbits.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__game.auto&&window.__game.world&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go(0);window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
const out = await p.evaluate(()=>{
  const g=window.__game,K=window.__keys;
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
  const res=[];
  for(const ri of [2,8,9]){
    const raw=g.world.roads[ri].p;
    // in-bounds portion: longest contiguous run of points within +-998
    const ib=raw.map(pt=>pt[0]>=-622&&pt[0]<=802&&pt[1]>=-777&&pt[1]<=747); // playable clamp rect: MAP{x0:-650,x1:830,z0:-805,z1:775} +- 28
    let best=[0,0],cur=null;
    for(let i=0;i<raw.length;i++){ if(ib[i]){ if(cur===null)cur=i; if(i-cur>best[1]-best[0])best=[cur,i]; } else cur=null; }
    const PTS=raw.slice(best[0],best[1]+1).map(pt=>[pt[0],pt[1]]);
    const cum=[0];for(let i=1;i<PTS.length;i++)cum.push(cum[i-1]+Math.hypot(PTS[i][0]-PTS[i-1][0],PTS[i][1]-PTS[i-1][1]));
    const L=cum[cum.length-1];
    const at=(t)=>{t=Math.max(0,Math.min(L,t));let i=1;while(i<cum.length-1&&cum[i]<t)i++;const f=(t-cum[i-1])/((cum[i]-cum[i-1])||1);return[PTS[i-1][0]+(PTS[i][0]-PTS[i-1][0])*f,PTS[i-1][1]+(PTS[i][1]-PTS[i-1][1])*f]};
    for(const dir of [1,-1]){
      const s0=dir>0?at(0):at(L),s1=dir>0?at(2):at(L-2);
      g.auto.x=s0[0];g.auto.z=s0[1];g.auto.a=Math.atan2(s1[0]-s0[0],s1[1]-s0[1]);g.auto.v=0;g.auto.steer=0;
      let jumps=0,hullHit=0,orbit=0,cumTurn=0,lastA=g.auto.a,prog=0,lastBi=dir>0?0:PTS.length-1;
      for(let n=0;n<20000;n++){
        let bd=1e9,bi=lastBi;const lo=Math.max(0,lastBi-6),hi=Math.min(PTS.length-1,lastBi+50);for(let i=lo;i<=hi;i++){const d=Math.hypot(PTS[i][0]-g.auto.x,PTS[i][1]-g.auto.z);if(d<bd){bd=d;bi=i}}lastBi=bi;
        prog=dir>0?cum[bi]:L-cum[bi];
        const tq=at(dir>0?cum[bi]+7:cum[bi]-7);
        const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
        const vt=Math.abs(err)>0.6?1.5:Math.abs(err)>0.3?3:Math.abs(err)>0.15?5:7;
        K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;
        const px=g.auto.x,pz=g.auto.z;window.__step(0.05,performance.now());
        let da=g.auto.a-lastA;lastA=g.auto.a;da=Math.atan2(Math.sin(da),Math.cos(da));cumTurn+=da;if(Math.abs(cumTurn)>11){orbit=1;break}
        if(Math.hypot(g.auto.x-px,g.auto.z-pz)>1.5)jumps++;
        if(!free(g.auto.x,g.auto.z,g.auto.a))hullHit++;
        if(prog>=L-2)break;
      }
      K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;
      res.push({road:ri,dir,inBoundsL:+L.toFixed(0),prog:+prog.toFixed(1),completed:prog>=L-2,jumps,hullHit,orbit,end:[+g.auto.x.toFixed(0),+g.auto.z.toFixed(0)]});
    }
  }
  return res;
});
for(const r of out) console.log('DRIVE289', JSON.stringify(r));
await b.close();
