import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true;
  const segs=g.roadSegs();
  const info=[51,62,63].map(si=>{
    const s=segs[si];
    return {si,x1:+(s.x1??s[0]).toFixed(1),z1:+(s.z1??s[1]).toFixed(1),x2:+(s.x2??s[2]).toFixed(1),z2:+(s.z2??s[3]).toFixed(1),w:s.width??s[6]??null,oneway:!!s.oneway,name:s.name||null};
  });
  // solid profile grids around the two wedge points
  const grid=(cx,cz)=>{
    const rows=[];
    for(let dz=-4;dz<=8;dz+=2){ let row=''; for(let dx=-4;dx<=4;dx+=2) row+=g.solid(cx+dx,cz+dz)?'#':'.'; rows.push(row); }
    return rows;
  };
  return {info, w1:grid(-150,-711), w2:grid(-96,228)};
});
console.log(JSON.stringify(r,null,1));
await b.close();
