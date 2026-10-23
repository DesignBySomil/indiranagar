import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2000));
const out = await p.evaluate(async ()=>{
  const g=window.__game, S=g.roadSegs();
  const extras = await (await fetch('/data/extras.json')).json();
  const vols=[];
  const inPoly=(P,x,z)=>{let u=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],zi=P[i][1],xj=P[j][0],zj=P[j][1];if((zi>z)!==(zj>z)&&x<((xj-xi)*(z-zi))/(zj-zi)+xi)u=!u}return u};
  if(extras.station&&extras.station.pts){
    const P=extras.station.pts;let scx=0,scz=0;P.forEach(pt=>{scx+=pt[0];scz+=pt[1]});scx/=P.length;scz/=P.length;
    vols.push({name:'station',clearanceY:7.4,under:(x,z)=>inPoly(P,x,z)});
  }
  const spansAnyRoad=(pts)=>{const mx=(pts[0][0]+pts[pts.length-1][0])*0.5,mz=(pts[0][1]+pts[pts.length-1][1])*0.5;
    for(const s of S){const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1;const t=Math.max(0,Math.min(1,((mx-s.x1)*dx+(mz-s.z1)*dz)/L2));if(Math.hypot(mx-(s.x1+dx*t),mz-(s.z1+dz*t))<s.width+6)return true}return false};
  for(const fb of (extras.footbridges||[])){
    if(!fb.pts||fb.pts.length<2||!spansAnyRoad(fb.pts))continue;
    const p1=fb.pts[0],p2=fb.pts[fb.pts.length-1];
    const dx=p2[0]-p1[0],dz=p2[1]-p1[1],span=Math.hypot(dx,dz);
    if(span<5||span>65)continue;
    const mx=(p1[0]+p2[0])*0.5,mz=(p1[1]+p2[1])*0.5,yaw=Math.atan2(dx,dz),sy=Math.sin(yaw),cy=Math.cos(yaw);
    vols.push({name:'fb@'+mx.toFixed(0)+','+mz.toFixed(0),clearanceY:4.5,under:(x,z)=>{const qx=x-mx,qz=z-mz;return Math.abs(qx*sy+qz*cy)<=span*0.5+1&&Math.abs(qx*cy-qz*sy)<=1.5}});
  }
  // whole-map scan region around each volume: use its bounding box from under() sampling over the map is too big;
  // instead scan the bounding box of each deck's influence: station poly bbox; fb rect bbox. Pad 12m (camera can trail behind auto).
  const boxes=[];
  if(extras.station&&extras.station.pts){const P=extras.station.pts;const xs=P.map(q=>q[0]),zs=P.map(q=>q[1]);boxes.push({name:'station',x0:Math.min(...xs)-12,x1:Math.max(...xs)+12,z0:Math.min(...zs)-12,z1:Math.max(...zs)+12})}
  for(const fb of (extras.footbridges||[])){
    if(!fb.pts||fb.pts.length<2)continue;
    const p1=fb.pts[0],p2=fb.pts[fb.pts.length-1];const span=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);if(span<5||span>65)continue;
    const xs=fb.pts.map(q=>q[0]),zs=fb.pts.map(q=>q[1]);boxes.push({name:'fb@'+((p1[0]+p2[0])/2).toFixed(0)+','+((p1[1]+p2[1])/2).toFixed(0),x0:Math.min(...xs)-12,x1:Math.max(...xs)+12,z0:Math.min(...zs)-12,z1:Math.max(...zs)+12});
  }
  const m=0.8, solid=g.solid.bind(g), parkedS=g.parked?g.parked.solid.bind(g.parked):()=>false;
  const res=[];
  for(const bx of boxes){
    const v=vols.find(v=>v.name===bx.name); if(!v){continue}
    let tested=0,lift=0,underLift=0,miss=0,overCap=0;
    for(let ax=bx.x0;ax<=bx.x1;ax+=3)for(let az=bx.z0;az<=bx.z1;az+=3){
      if(solid(ax,az))continue;
      for(let h=0;h<8;h++){
        const a=h*Math.PI/4,dx=Math.sin(a),dz=Math.cos(a);
        let ok=true;for(const [lx,lz] of [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]]){if(solid(ax+Math.cos(a)*lx+Math.sin(a)*lz,az-Math.sin(a)*lx+Math.cos(a)*lz)){ok=false;break}}
        if(!ok)continue;
        tested++;
        let cx=ax-dx*6.4,cz=az-dz*6.4;
        const los=(x,z)=>{if(solid(ax,az))return false;for(let t=0.15;t<0.9;t+=0.15)if(solid(x+(ax-x)*t,z+(az-z)*t))return true;return false};
        const bad=(x,z)=>solid(x,z)||solid(x+m,z)||solid(x-m,z)||solid(x,z+m)||solid(x,z-m)||los(x,z)||parkedS(x,z);
        for(let k=0;k<24&&bad(cx,cz);k++){cx+=(ax-cx)*0.2;cz+=(az-cz)*0.2}
        const dCam=Math.hypot(cx-ax,cz-az);
        if(dCam>=4.2)continue;
        lift++;
        const under=v.under(cx,cz);
        const uncapped=Math.min(8.0,3.0+(4.2-dCam)*1.8);
        if(under){underLift++;if(uncapped>v.clearanceY-0.4+1e-9){/* cap must bind */} if(false)miss++;}
        else if(uncapped>v.clearanceY-0.4){overCap++}
      }
    }
    res.push({name:bx.name,tested,lift,underLift,overCapNearby:overCap});
  }
  return res;
});
for(const r of out) console.log('DECK2', JSON.stringify(r));
await b.close();
