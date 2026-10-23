import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2000));
const spots = await p.evaluate(async ()=>{
  const g=window.__game, S=g.roadSegs();
  const extras = await (await fetch('/data/extras.json')).json();
  const inPoly=(P,x,z)=>{let u=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],zi=P[i][1],xj=P[j][0],zj=P[j][1];if((zi>z)!==(zj>z)&&x<((xj-xi)*(z-zi))/(zj-zi)+xi)u=!u}return u};
  const solid=g.solid.bind(g);
  const P=extras.station.pts;
  const xs=P.map(q=>q[0]),zs=P.map(q=>q[1]);
  const found=[];
  // find 2 station poses where pull-in crushes AND final camera is under the station poly
  for(let ax=Math.min(...xs);ax<=Math.max(...xs)&&found.length<2;ax+=2.5)for(let az=Math.min(...zs);az<=Math.max(...zs)&&found.length<2;az+=2.5){
    if(solid(ax,az))continue;
    for(let h=0;h<8&&found.length<2;h++){
      const a=h*Math.PI/4,dx=Math.sin(a),dz=Math.cos(a);
      let okc=true;for(const [lx,lz] of [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]]){if(solid(ax+Math.cos(a)*lx+Math.sin(a)*lz,az-Math.sin(a)*lx+Math.cos(a)*lz)){okc=false;break}}
      if(!okc)continue;
      let cx=ax-dx*6.4,cz=az-dz*6.4;
      const los=(x,z)=>{for(let t=0.15;t<0.9;t+=0.15)if(solid(x+(ax-x)*t,z+(az-z)*t))return true;return false};
      const bad=(x,z)=>solid(x,z)||solid(x+0.8,z)||solid(x-0.8,z)||solid(x,z+0.8)||solid(x,z-0.8)||los(x,z);
      for(let k=0;k<24&&bad(cx,cz);k++){cx+=(ax-cx)*0.2;cz+=(az-cz)*0.2}
      const dCam=Math.hypot(cx-ax,cz-az);
      if(dCam<3.0&&inPoly(P,cx,cz))found.push({ax,az,a});
    }
  }
  return found;
});
console.log('SPOTS', JSON.stringify(spots));
const res=[];
for(const s of spots){
  await p.evaluate((s)=>{const g=window.__game;g.auto.x=s.ax;g.auto.z=s.az;g.auto.a=s.a;g.auto.v=0;g.auto.steer=0;},s);
  let maxY=0, st=null;
  for(let i=0;i<10;i++){
    await p.evaluate(()=>{for(let k=0;k<30;k++)window.__step(0.05,performance.now())});
    st = await p.evaluate(()=>{const g=window.__game;const c=g.camera.position;return {y:c.y,d:Math.hypot(c.x-g.auto.x,c.z-g.auto.z),x:c.x,z:c.z}});
    if(st.y>maxY)maxY=st.y;
  }
  res.push({pose:[+s.ax.toFixed(1),+s.az.toFixed(1)],finalDCam:+st.d.toFixed(2),maxCamY:+maxY.toFixed(2),cap:7.0,pass:maxY<=7.05});
}
console.log('LIVE', JSON.stringify(res));
await b.close();
