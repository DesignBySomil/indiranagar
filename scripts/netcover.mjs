// Whole drivable-network coverage, batched. Static-geometry pass (traffic/crowd/life solids off).
import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:1200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__game.world&&window.__step,{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.go(0);window.__noRender=true;window.__paused=true;const T=g.traffic,C=g.crowd,L=g.life;if(T)T.solid=()=>false;if(C)C.solid=()=>false;if(L)L.solid=()=>false;});
const NSEGS=await p.evaluate(()=>window.__game.roadSegs().length);
console.log('SEGS',NSEGS);
for(let start=0;start<NSEGS;start+=40){
  const out=await p.evaluate((start,end)=>{
    const g=window.__game,K=window.__keys;
    const X0=-622,X1=802,Z0=-777,Z1=747;
    const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
    const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
    const clip=(x1,z1,x2,z2)=>{
      let t0=0,t1=1;const dx=x2-x1,dz=z2-z1;
      for(const [pp,qq] of [[-dx,x1-X0],[dx,X1-x1],[-dz,z1-Z0],[dz,Z1-z1]]){
        if(pp===0){ if(qq<0) return null; continue; }
        const r=qq/pp;
        if(pp<0){ if(r>t1)return null; if(r>t0)t0=r; } else { if(r<t0)return null; if(r<t1)t1=r; }
      }
      return [t0,t1];
    };
    const res={total:0,outWorld:0,tooShort:0,drives:0,completed:0,partial:0,blockedStart:0,wedges:0,orbits:0,totalLen:0,drivenLen:0,problems:[]};
    const segs=g.roadSegs().slice(start,end);
    for(let si0=0;si0<segs.length;si0++){
      const si=start+si0, s=segs[si0];
      const x1=s.x1??s[0],z1=s.z1??s[1],x2=s.x2??s[2],z2=s.z2??s[3];
      res.total++;
      const cl=clip(x1,z1,x2,z2);
      if(!cl){res.outWorld++;continue;}
      const ax=x1+(x2-x1)*cl[0],az=z1+(z2-z1)*cl[0],bx=x1+(x2-x1)*cl[1],bz=z1+(z2-z1)*cl[1];
      const L=Math.hypot(bx-ax,bz-az);
      if(L<8){res.tooShort++;continue;}
      res.totalLen+=L;
      const dirs=s.oneway?[1]:[1,-1];
      for(const dir of dirs){
        res.drives++;
        const fx=(bx-ax)/L*dir,fz=(bz-az)/L*dir;
        const sx=dir>0?ax:bx, sz=dir>0?az:bz;
        const ox=-fz*1.7, oz=fx*1.7;
        g.auto.x=sx+ox; g.auto.z=sz+oz; g.auto.a=Math.atan2(fx,fz); g.auto.v=0; g.auto.steer=0;
        if(!free(g.auto.x,g.auto.z,g.auto.a)){
          let ok=false;
          for(const n of [1,2,3,4]){ if(free(g.auto.x+fx*n,g.auto.z+fz*n,g.auto.a)){g.auto.x+=fx*n;g.auto.z+=fz*n;ok=true;break;} }
          if(!ok){res.blockedStart++;res.problems.push({si,dir,kind:'blockedStart',at:[+g.auto.x.toFixed(0),+g.auto.z.toFixed(0)],name:s.name||null});continue;}
        }
        let prog=0,lastA=g.auto.a,cumTurn=0,orbit=0,hull=0,wedge=0,stillT=0;
        const maxSteps=Math.ceil(L/0.5)+220;
        for(let n=0;n<maxSteps;n++){
          prog=(g.auto.x-(sx+ox))*fx+(g.auto.z-(sz+oz))*fz;
          const tx=sx+ox+fx*Math.min(prog+7,L), tz=sz+oz+fz*Math.min(prog+7,L);
          const ta=Math.atan2(tx-g.auto.x,tz-g.auto.z);
          const err=Math.atan2(Math.sin(ta-g.auto.a),Math.cos(ta-g.auto.a));
          const vt=Math.abs(err)>0.6?3:Math.abs(err)>0.3?6:Math.abs(err)>0.15?10:14;
          K.KeyA=err>0.05;K.KeyD=err<-0.05;K.KeyW=g.auto.v<vt;K.KeyS=g.auto.v>vt+1.2;
          window.__step(0.06,performance.now());
          let da=g.auto.a-lastA;lastA=g.auto.a;da=Math.atan2(Math.sin(da),Math.cos(da));cumTurn+=da;
          if(Math.abs(cumTurn)>11){orbit=1;break;}
          if(!free(g.auto.x,g.auto.z,g.auto.a))hull++;
          if(Math.abs(g.auto.v)<0.25&&K.KeyW){stillT+=0.06;if(stillT>1.8){wedge=1;break;}}else stillT=0;
          if(prog>=L-2)break;
        }
        K.KeyW=K.KeyA=K.KeyD=K.KeyS=false;
        const done=prog>=L-2;
        res.drivenLen+=Math.max(0,Math.min(prog,L));
        if(orbit)res.orbits++,res.problems.push({si,dir,kind:'orbit',at:[+g.auto.x.toFixed(0),+g.auto.z.toFixed(0)],prog:+prog.toFixed(0),L:+L.toFixed(0),name:s.name||null});
        else if(wedge)res.wedges++,res.problems.push({si,dir,kind:'wedge',at:[+g.auto.x.toFixed(0),+g.auto.z.toFixed(0)],prog:+prog.toFixed(0),L:+L.toFixed(0),hull,name:s.name||null});
        else if(done)res.completed++;
        else res.partial++,res.problems.push({si,dir,kind:'partial',at:[+g.auto.x.toFixed(0),+g.auto.z.toFixed(0)],prog:+prog.toFixed(0),L:+L.toFixed(0),hull,name:s.name||null});
      }
    }
    res.totalLen=+res.totalLen.toFixed(0); res.drivenLen=+res.drivenLen.toFixed(0);
    return res;
  }, start, Math.min(start+40,NSEGS));
  console.log('BATCH',start,'-',Math.min(start+40,NSEGS)-1,JSON.stringify({drives:out.drives,completed:out.completed,wedges:out.wedges,orbits:out.orbits,partial:out.partial,blockedStart:out.blockedStart,outWorld:out.outWorld}));
  if(out.problems.length)console.log('PROBLEMS',JSON.stringify(out.problems));
}
console.log('ALLDONE');
await b.close();
