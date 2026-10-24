import puppeteer from 'puppeteer-core';
import fs from 'fs';
const url = process.env.URL || 'http://localhost:4180/';
const {stub, link} = JSON.parse(fs.readFileSync('/tmp/paths_base.json','utf8'));
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage();
await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__solid,{timeout:180000});
const r=await p.evaluate((stub,link)=>{
  const solid=window.__solid;
  // rotated-hull sweep: worst-case tempo (HL 3.0, HW 1.2) and sedan (HL 2.35, HW 1.05), 0.5m pose spacing
  function sweep(pts,HL,HW){
    const blocked=[];
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i],bpt=pts[i+1];
      const dx=bpt[0]-a[0],dz=bpt[1]-a[1];const L=Math.hypot(dx,dz);if(L<1e-6)continue;
      const ux=dx/L,uz=dz/L,px=-uz,pz=ux;
      const n=Math.max(1,Math.round(L/0.5));
      for(let k=0;k<=n;k++){
        const t=k/n, cx=a[0]+dx*t, cz=a[1]+dz*t;
        let bad=false;
        // hull grid: 5 along length x 3 across width
        for(let gi=-2;gi<=2&&!bad;gi++)for(let gj=-1;gj<=1;gj++){
          const x=cx+ux*(gi/2*HL)+px*(gj*HW), z=cz+uz*(gi/2*HL)+pz*(gj*HW);
          if(solid(x,z)){bad=true;break;}
        }
        if(blocked.length&&blocked[blocked.length-1].endI===i&&blocked[blocked.length-1].endK===k-1){blocked[blocked.length-1].endK=k;}
        else if(bad) blocked.push({i,k,x:+cx.toFixed(1),z:+cz.toFixed(1),endI:i,endK:k});
      }
    }
    return blocked.map(q=>({i:q.i,k:q.k,x:q.x,z:q.z,spanEnd:`${q.endI}/${q.endK}`}));
  }
  return {
    stub_tempo: sweep(stub,3.0,1.2), link_tempo: sweep(link,3.0,1.2),
    stub_sedan: sweep(stub,2.35,1.05), link_sedan: sweep(link,2.35,1.05),
  };
}, stub, link);
console.log(JSON.stringify(r,null,1));
await b.close(); process.exit(0);
