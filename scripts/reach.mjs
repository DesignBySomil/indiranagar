import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
const out=await p.evaluate(async()=>{
  const g=window.__game,S=g.roadSegs();
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const s of S){x0=Math.min(x0,s.x1,s.x2);x1=Math.max(x1,s.x1,s.x2);z0=Math.min(z0,s.z1,s.z2);z1=Math.max(z1,s.z1,s.z2)}
  x0=Math.floor(x0)-40;x1=Math.ceil(x1)+40;z0=Math.floor(z0)-40;z1=Math.ceil(z1)+40;
  const W=x1-x0,H=z1-z0,N=W*H;
  const solidG=new Uint8Array(N);
  for(let j=0;j<H;j++)for(let i=0;i<W;i++)solidG[j*W+i]=g.solid(x0+i,z0+j)?1:0;
  // BFS from (513.5,-503.5)
  const start=[Math.round(513.5-x0),Math.round(-503.5-z0)];
  const reach=new Uint8Array(N);const q=new Int32Array(N);let qh=0,qt=0;
  const si=start[1]*W+start[0];
  if(!solidG[si]){reach[si]=1;q[qt++]=si}
  while(qh<qt){const c=q[qh++];const cx=c%W,cz=(c/W)|0;
    if(cx>0&&!solidG[c-1]&&!reach[c-1]){reach[c-1]=1;q[qt++]=c-1}
    if(cx<W-1&&!solidG[c+1]&&!reach[c+1]){reach[c+1]=1;q[qt++]=c+1}
    if(cz>0&&!solidG[c-W]&&!reach[c-W]){reach[c-W]=1;q[qt++]=c-W}
    if(cz<H-1&&!solidG[c+W]&&!reach[c+W]){reach[c+W]=1;q[qt++]=c+W}}
  let freeN=0,reachN=0;for(let i=0;i<N;i++){if(!solidG[i])freeN++;if(reach[i])reachN++}
  // per-road reachability from world.json polylines (runtime roads = post-fix; fetch raw then note)
  const w=await (await fetch('data/world.json')).json();
  const roads=w.roads;
  const perRoad=[];
  for(let ri=0;ri<roads.length;ri++){const pts=roads[ri].p;if(!pts||pts.length<2)continue;
    let tot=0,fr=0,rc=0;const badRuns=[];let run=null;
    for(let k=0;k<pts.length-1;k++){const ax=pts[k][0],az=pts[k][1],bx=pts[k+1][0],bz=pts[k+1][1];
      const L=Math.hypot(bx-ax,bz-az);const n=Math.max(1,Math.round(L));
      for(let t=0;t<n;t++){const x=ax+(bx-ax)*t/n,z=az+(bz-az)*t/n;tot++;
        const gx=Math.round(x-x0),gz=Math.round(z-z0);
        if(gx<0||gz<0||gx>=W||gz>=H)continue;
        const c=gz*W+gx;const isFree=!solidG[c],isR=!!reach[c];
        if(isFree)fr++;if(isR)rc++;
        if(isFree&&!isR){if(!run)run=[x,z];}
        else if(run){badRuns.push([run,[x,z]]);run=null}
      }}
    if(run)badRuns.push([run,[pts[pts.length-1][0],pts[pts.length-1][1]]]);
    perRoad.push({ri,tot,fr,rc,badRuns:badRuns.slice(0,3).map(r=>r.map(q=>q.map(v=>+v.toFixed(0))))});
  }
  const worst=perRoad.filter(r=>r.tot>=8&&r.fr>0).sort((a,b)=>(a.rc/a.fr)-(b.rc/b.fr)).slice(0,15);
  const named=[216,448,290].map(ri=>perRoad.find(r=>r.ri===ri)).filter(Boolean);
  // sweep carSolid points
  const pts=[[86.4,747.0],[-622.0,-777.0],[312.3,747.0],[-622.0,-701.2],[-622.0,118.7]];
  const sweep=pts.map(([x,z])=>{const gx=Math.round(x-x0),gz=Math.round(z-z0);const c=gz*W+gx;
    let nearR=null;outer:for(let r=1;r<=12;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const xx=gx+dx,zz=gz+dz;if(xx<0||zz<0||xx>=W||zz>=H)continue;if(reach[zz*W+xx]){nearR=[x+dx,z+dz,r];break outer}}
    return {pt:[x,z],solid:!!solidG[c],reached:!!reach[c],nearestReached:nearR}});
  return {bounds:[x0,z0,x1,z1],freeN,reachN,reachFrac:+(reachN/freeN).toFixed(3),named,sweep,worst:worst.map(r=>({ri:r.ri,tot:r.tot,fr:r.fr,rc:r.rc,badRuns:r.badRuns}))};
});
console.log(JSON.stringify(out,null,1));
await b.close();
