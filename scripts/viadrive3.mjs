import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:400000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360']});
const p=await b.newPage(); await p.setViewport({width:640,height:360});
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(async()=>{
  const g=window.__game,K=window.__keys; g.go(0);
  g.state.hour=13; if(g.applyTime)g.applyTime(13);
  const cvs=document.getElementById('c');
  const c2=document.createElement('canvas'); c2.width=640; c2.height=360; const ctx=c2.getContext('2d');
  const cap=async()=>{ await new Promise(r=>requestAnimationFrame(r)); return cvs.toDataURL('image/png'); };
  window.__noRender=true; let t0=90000; const step=(n)=>{for(let k=0;k<n;k++){t0+=33;window.__step(0.033,t0);}};
  const segs=g.roadSegs().filter(s=>(s.name||s[4])==='Chinmaya Mission Hospital Road'&&(s.kind??s[5])>=2);
  const S=segs.map(s=>({x1:s.x1??s[0],z1:s.z1??s[1],x2:s.x2??s[2],z2:s.z2??s[3]}));
  // start: seg nearest (180,-266), heading toward increasing x
  let si=0,bd=1e9;
  S.forEach((s,i)=>{const mx=(s.x1+s.x2)/2,mz=(s.z1+s.z2)/2;const d=Math.hypot(mx-180,mz+266);if(d<bd){bd=d;si=i;}});
  let cur=S[si];
  if(cur.x2<cur.x1){const t=[cur.x1,cur.z1];cur={x1:cur.x2,z1:cur.z2,x2:t[0],z2:t[1]};}
  g.auto.x=cur.x1; g.auto.z=cur.z1; g.auto.a=Math.atan2(cur.x2-cur.x1,cur.z2-cur.z1); g.auto.v=0;
  step(40);
  K.KeyW=true;
  const frames=[],scans=[];
  const follow=()=>{
    // nearest point on current seg; if past end, advance to connecting seg
    let dx=cur.x2-cur.x1,dz=cur.z2-cur.z1,L2=dx*dx+dz*dz||1;
    let t=((g.auto.x-cur.x1)*dx+(g.auto.z-cur.z1)*dz)/L2;
    if(t>0.97){
      let bi=-1,bd2=1e9;
      S.forEach((s,i)=>{for(const[px,pz]of[[s.x1,s.z1],[s.x2,s.z2]]){const d=Math.hypot(px-cur.x2,pz-cur.z2);if(d<bd2){bd2=d;bi=i;}}});
      if(bi>=0&&bd2<3){let n=S[bi]; if(Math.hypot(n.x2-cur.x2,n.z2-cur.z2)<1.5) n={x1:n.x2,z1:n.z2,x2:n.x1,z2:n.z1}; if(!(n.x1===cur.x1&&n.z1===cur.z1)) cur=n;}
      dx=cur.x2-cur.x1;dz=cur.z2-cur.z1;L2=dx*dx+dz*dz||1;
      t=((g.auto.x-cur.x1)*dx+(g.auto.z-cur.z1)*dz)/L2;
    }
    const tt=Math.max(0,Math.min(1,t))+12/Math.sqrt(L2);
    const tx=cur.x1+dx*Math.min(1,tt),tz=cur.z1+dz*Math.min(1,tt);
    const ta=Math.atan2(tx-g.auto.x,tz-g.auto.z);
    let d=ta-g.auto.a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
    g.auto.a+=Math.max(-0.05,Math.min(0.05,d));
  };
  const blackScan=()=>{ ctx.drawImage(cvs,0,0,640,360); const img=ctx.getImageData(0,30,640,280).data; let best=0,bx=0,by=0;
    for(let yy=0;yy<280-20;yy+=10)for(let xx=0;xx<640-20;xx+=10){let dark=0;
      for(let dy=0;dy<20;dy+=5)for(let dx2=0;dx2<20;dx2+=5){const o=((yy+dy)*640+(xx+dx2))*4; if(img[o]<14&&img[o+1]<14&&img[o+2]<14)dark++;}
      if(dark>best){best=dark;bx=xx;by=yy+30;}}
    return {dark:best,at:[bx,by]}; };
  window.__noRender=false; frames.push(await cap()); scans.push(blackScan()); window.__noRender=true;
  for(let k=1;k<9;k++){ for(let s2=0;s2<20;s2++){follow();step(1);} window.__noRender=false; frames.push(await cap()); scans.push(blackScan()); window.__noRender=true; }
  K.KeyW=false;
  return {frames,scans,x:+g.auto.x.toFixed(0),z:+g.auto.z.toFixed(0)};
});
for(let i=0;i<r.frames.length;i++) writeFileSync(`/tmp/vc-${String(i).padStart(2,'0')}.png`, Buffer.from(r.frames[i].split(',')[1],'base64'));
console.log(JSON.stringify({n:r.frames.length,x:r.x,z:r.z,scans:r.scans}));
await b.close();
