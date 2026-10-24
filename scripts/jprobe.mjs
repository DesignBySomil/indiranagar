import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:900000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://127.0.0.1:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__traffic,{timeout:180000});
const r=await p.evaluate(()=>{
  const segs=window.__traffic().__validSegs, fn=window.__traffic().__findNext;
  const J=[-473.2,-754.2];
  const touch=segs.filter(s=>Math.hypot(s.x1-J[0],s.z1-J[1])<1.2||Math.hypot(s.x2-J[0],s.z2-J[1])<1.2);
  const id=s=>[s.name||'-',s.oneway?'ow':'',s.x1.toFixed(0)+','+s.z1.toFixed(0),'->',s.x2.toFixed(0)+','+s.z2.toFixed(0),'L'+s.len.toFixed(0)].join(' ');
  const out=[];
  for(const s of touch){
    // arrive at junction along +u (dir=1 travel ending at x2) and along -u (dir=-1 ending at x1)
    const f1=fn(s,s.x2,s.z2,s.ux,s.uz), f2=fn(s,s.x1,s.z1,-s.ux,-s.uz);
    out.push({seg:id(s), fromX2_fwd:f1?id(f1.seg)+' dir'+f1.dir:null, fromX1_rev:f2?id(f2.seg)+' dir'+f2.dir:null});
  }
  // also: link chord mid-chain continuation
  const link1=segs.find(s=>Math.hypot(s.x1-J[0],s.z1-J[1])<1.2&&Math.hypot(s.x2+460,s.z2+749.5)<1.5);
  let chain=[];
  if(link1){ let cur=link1; for(let i=0;i<6;i++){ const nx=fn(cur,cur.x2,cur.z2,cur.ux,cur.uz); if(!nx){chain.push('END@'+cur.x2.toFixed(0)+','+cur.z2.toFixed(0));break;} chain.push(id(nx.seg)+' dir'+nx.dir); cur=nx.seg; if(cur.x1===link1.x1&&cur.x2===link1.x2)break; } }
  return {touching:out, linkChainFromJunction:chain};
});
console.log(JSON.stringify(r,null,1));
await b.close(); process.exit(0);
