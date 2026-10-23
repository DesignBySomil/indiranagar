import puppeteer from 'puppeteer-core';
const PTS=[[-457.3, 208.5], [-456.8, 208.44], [-456.3, 208.38], [-455.8, 208.33], [-455.3, 208.27], [-454.8, 208.21], [-454.3, 208.15], [-453.8, 208.1], [-453.3, 208.04], [-452.8, 207.98], [-452.3, 207.92], [-451.8, 207.87], [-451.3, 207.81], [-450.8, 207.75], [-450.3, 207.69], [-449.8, 207.64], [-449.3, 207.58], [-448.8, 207.52], [-448.3, 207.46], [-447.8, 207.41], [-447.3, 207.35], [-446.8, 207.29], [-446.3, 207.23], [-445.8, 207.18], [-445.3, 207.12], [-444.8, 207.06], [-444.3, 207.0], [-443.8, 206.95], [-443.3, 206.89], [-442.8, 206.83], [-442.5, 207.0], [-442.0, 207.0], [-441.5, 207.0], [-441.0, 207.0], [-440.5, 207.0], [-440.0, 206.5], [-439.31, 206.3], [-438.81, 206.2], [-438.31, 206.1], [-437.82, 206.0], [-437.5, 206.0], [-437.12, 205.62], [-436.75, 205.25], [-436.38, 204.88], [-436.0, 204.5], [-435.5, 204.5], [-435.0, 204.5], [-434.5, 204.5], [-434.0, 205.0], [-433.34, 205.1], [-432.84, 205.0], [-432.34, 204.9], [-431.85, 204.8], [-431.35, 204.7], [-430.85, 204.6], [-430.35, 204.5], [-429.86, 204.4], [-429.36, 204.3], [-428.86, 204.2], [-428.36, 204.1], [-427.87, 204.0], [-427.37, 203.9], [-426.87, 203.8], [-426.37, 203.7], [-425.88, 203.6], [-425.38, 203.5], [-424.88, 203.4], [-424.38, 203.3], [-423.89, 203.2], [-423.39, 203.1], [-422.89, 203.0], [-422.5, 203.0], [-422.0, 202.5], [-421.5, 202.5], [-421.0, 202.5], [-420.5, 202.5], [-420.0, 202.5], [-419.5, 202.5], [-419.0, 202.5], [-418.5, 202.5], [-418.0, 202.5], [-417.5, 202.5], [-417.0, 202.5], [-416.5, 202.5], [-416.0, 203.0], [-415.36, 203.26], [-414.86, 203.31], [-414.36, 203.36], [-413.86, 203.41], [-413.35, 203.45], [-412.85, 203.5], [-412.35, 203.55], [-411.84, 203.59], [-411.34, 203.64], [-410.84, 203.69], [-410.34, 203.74], [-409.83, 203.78], [-409.33, 203.83], [-408.83, 203.88], [-408.32, 203.92], [-407.82, 203.97], [-407.32, 204.02], [-406.81, 204.06], [-406.31, 204.11], [-405.81, 204.16], [-405.31, 204.21], [-404.8, 204.25], [-404.3, 204.3], [-403.79, 204.27], [-403.29, 204.24], [-402.78, 204.22], [-402.27, 204.19], [-401.77, 204.16], [-401.26, 204.13], [-400.76, 204.11], [-400.25, 204.08], [-399.74, 204.05], [-399.24, 204.02], [-398.73, 204.0], [-398.22, 203.97], [-397.72, 203.94], [-397.21, 203.91], [-396.7, 203.89], [-396.2, 203.86], [-395.69, 203.83], [-395.19, 203.8], [-394.68, 203.77], [-394.17, 203.75], [-393.67, 203.72], [-393.16, 203.69], [-392.65, 203.66], [-392.15, 203.64], [-391.64, 203.61], [-391.13, 203.58], [-390.63, 203.55], [-390.12, 203.53], [-389.61, 203.5], [-389.11, 203.47], [-388.6, 203.44], [-388.1, 203.41], [-387.59, 203.39], [-387.08, 203.36], [-386.58, 203.33], [-386.07, 203.3], [-385.56, 203.28], [-385.06, 203.25], [-384.55, 203.22], [-384.04, 203.19], [-383.54, 203.17], [-383.03, 203.14], [-382.53, 203.11], [-382.02, 203.08], [-381.51, 203.06], [-381.01, 203.03], [-380.5, 203.0], [-379.0, 203.0], [-377.5, 203.02], [-376.0, 203.02], [-374.5, 203.02], [-373.0, 203.02], [-371.5, 203.0], [-370.0, 202.98], [-368.5, 202.95], [-367.0, 202.9], [-365.5, 202.7], [-364.2, 202.4], [-363.0, 202.1]];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false});
await new Promise(r=>setTimeout(r,2500));
const out=await p.evaluate((PTS)=>{
  const g=window.__game,K=window.__keys;
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
  // arclength table
  const cum=[0];for(let i=1;i<PTS.length;i++)cum.push(cum[i-1]+Math.hypot(PTS[i][0]-PTS[i-1][0],PTS[i][1]-PTS[i-1][1]));
  const L=cum[cum.length-1];
  const at=(t)=>{t=Math.max(0,Math.min(L,t));let i=1;while(i<cum.length-1&&cum[i]<t)i++;const f=(t-cum[i-1])/((cum[i]-cum[i-1])||1);return[PTS[i-1][0]+(PTS[i][0]-PTS[i-1][0])*f,PTS[i-1][1]+(PTS[i][1]-PTS[i-1][1])*f]};
  const res=[];
  for(const dir of [1,-1]){
    const s0=dir>0?at(0):at(L),s1=dir>0?at(2):at(L-2);
    g.auto.x=s0[0];g.auto.z=s0[1];g.auto.a=Math.atan2(s1[0]-s0[0],s1[1]-s0[1]);g.auto.v=0;g.auto.steer=0;
    let jumps=0,hullHit=0,minx=1e9,maxv=0,cumTurn=0,orbit=0,lastA=g.auto.a,prog=0;
    let lastBi=dir>0?0:PTS.length-1;
    for(let n=0;n<4000;n++){
      // progress: nearest arclength (coarse scan around last)
      let best=1e9,bi=lastBi;const lo=Math.max(0,lastBi-6),hi=Math.min(PTS.length-1,lastBi+50);for(let i=lo;i<=hi;i++){const d=Math.hypot(PTS[i][0]-g.auto.x,PTS[i][1]-g.auto.z);if(d<best){best=d;bi=i}}lastBi=bi;
      prog=dir>0?cum[bi]:L-cum[bi];
      const tq=at(dir>0?cum[bi]+7:cum[bi]-7);
      const ta=Math.atan2(tq[0]-g.auto.x,tq[1]-g.auto.z);const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
      const vt=Math.abs(err)>0.6?1.5:Math.abs(err)>0.3?3:Math.abs(err)>0.15?5:7;
      K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;
      const px=g.auto.x,pz=g.auto.z;window.__step(0.05,performance.now());
      let da=g.auto.a-lastA;lastA=g.auto.a;da=Math.atan2(Math.sin(da),Math.cos(da));cumTurn+=da;if(Math.abs(cumTurn)>11){orbit=1;break}
      const mv=Math.hypot(g.auto.x-px,g.auto.z-pz);if(mv>1.5)jumps++;
      if(!free(g.auto.x,g.auto.z,g.auto.a))hullHit++;
      if(prog>=L-2)break;
    }
    K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;
    // stall forensics: probe 8 directions at 0.5/1/2m + nose + reverse
      const a=g.auto.a,fx=Math.sin(a),fz=Math.cos(a);
      const probe=[];for(let k=0;k<8;k++){const an=k*Math.PI/4;probe.push([k,+(0.5).toFixed(1),g.solid(g.auto.x+Math.sin(an)*0.5,g.auto.z+Math.cos(an)*0.5)?1:0,g.solid(g.auto.x+Math.sin(an)*2,g.auto.z+Math.cos(an)*2)?1:0])}
      res.push({dir,L:+L.toFixed(0),prog:+prog.toFixed(1),jumps,hullHit,orbit,endFree:free(g.auto.x,g.auto.z,g.auto.a),pos:[+g.auto.x.toFixed(1),+g.auto.z.toFixed(1)],a:+a.toFixed(2),v:+g.auto.v.toFixed(2),nose2:g.solid(g.auto.x+fx*2,g.auto.z+fz*2)?1:0,rev09:g.solid(g.auto.x-fx*0.9,g.auto.z-fz*0.9)?1:0,probe});
  }
  return res;
},PTS);
for(const o of out)console.log(JSON.stringify(o));await b.close();
