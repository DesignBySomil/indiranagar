import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2000));
const spot = await p.evaluate(async ()=>{
  const g=window.__game;
  const extras = await (await fetch('/data/extras.json')).json();
  const solid=g.solid.bind(g);
  const fb=extras.footbridges[0]; // fb1 span 64m near station
  const p1=fb.pts[0],p2=fb.pts[fb.pts.length-1];
  const mx=(p1[0]+p2[0])*0.5,mz=(p1[1]+p2[1])*0.5,yaw=Math.atan2(p2[0]-p1[0],p2[1]-p1[1]),sy=Math.sin(yaw),cy=Math.cos(yaw),span=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);
  const underRect=(x,z)=>{const qx=x-mx,qz=z-mz;return Math.abs(qx*sy+qz*cy)<=span*0.5+1&&Math.abs(qx*cy-qz*sy)<=1.5};
  const xs=fb.pts.map(q=>q[0]),zs=fb.pts.map(q=>q[1]);
  for(let ax=Math.min(...xs)-8;ax<=Math.max(...xs)+8;ax+=2)for(let az=Math.min(...zs)-8;az<=Math.max(...zs)+8;az+=2){
    if(solid(ax,az))continue;
    for(let h=0;h<8;h++){
      const a=h*Math.PI/4,dx=Math.sin(a),dz=Math.cos(a);
      let okc=true;for(const [lx,lz] of [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]]){if(solid(ax+Math.cos(a)*lx+Math.sin(a)*lz,az-Math.sin(a)*lx+Math.cos(a)*lz)){okc=false;break}}
      if(!okc)continue;
      let cx=ax-dx*6.4,cz=az-dz*6.4;
      const los=(x,z)=>{for(let t=0.15;t<0.9;t+=0.15)if(solid(x+(ax-x)*t,z+(az-z)*t))return true;return false};
      const bad=(x,z)=>solid(x,z)||solid(x+0.8,z)||solid(x-0.8,z)||solid(x,z+0.8)||solid(x,z-0.8)||los(x,z);
      for(let k=0;k<24&&bad(cx,cz);k++){cx+=(ax-cx)*0.2;cz+=(az-cz)*0.2}
      const dCam=Math.hypot(cx-ax,cz-az);
      if(dCam<3.5&&underRect(cx,cz))return {ax,az,a,dCam:+dCam.toFixed(2)};
    }
  }
  return null;
});
console.log('SPOT', JSON.stringify(spot));
if(spot){
  await p.evaluate((s)=>{const g=window.__game;g.auto.x=s.ax;g.auto.z=s.az;g.auto.a=s.a;g.auto.v=0;g.auto.steer=0;},spot);
  let maxY=0, st=null;
  for(let i=0;i<10;i++){
    await p.evaluate(()=>{for(let k=0;k<30;k++)window.__step(0.05,performance.now())});
    st = await p.evaluate(()=>{const g=window.__game;const c=g.camera.position;return {y:c.y,d:Math.hypot(c.x-g.auto.x,c.z-g.auto.z)}});
    if(st.y>maxY)maxY=st.y;
  }
  console.log('LIVE', JSON.stringify({finalDCam:+st.d.toFixed(2),maxCamY:+maxY.toFixed(2),cap:4.1,pass:maxY<=4.15}));
}
await b.close();
