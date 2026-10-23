import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
const out=await p.evaluate(()=>{const g=window.__game,S=g.roadSegs();const res=[];for(const i of [872,1122,1385,1392,1397,1401,1634]){const s=S[i];const L=Math.hypot(s.x2-s.x1,s.z2-s.z1),ux=(s.x2-s.x1)/L,uz=(s.z2-s.z1)/L,nx=-uz,nz=ux;const rows=[];let blockedCols=0;
 for(let t=0;t<=L;t+=2){let r='';for(let o=-4;o<=4;o+=0.5){r+=g.solid(s.x1+ux*t+nx*o,s.z1+uz*t+nz*o)?'#':'.'}rows.push(r)}
 // clear width at each t: contiguous clear run containing nearest-to-centre clear cell
 const widths=rows.map(r=>{let best=0,cur=0;for(const ch of r){if(ch=='.'){cur++;best=Math.max(best,cur)}else cur=0}return best*0.5});
 res.push({i,w:s.width,L:+L.toFixed(0),minClear:Math.min(...widths),rows:rows.filter((_,k)=>k%2==0).join('|')})}
return res});
for(const o of out)console.log(o.i,'w',o.w,'L',o.L,'minClearRun(m)',o.minClear,'\n'+o.rows.split('|').join('\n'));await b.close();
