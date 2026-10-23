import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('console',m=>console.log('[pg]',m.text().slice(0,1200)));
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
await p.evaluate(async()=>{
  const t=window.__traffic();
  // Junction of interest: exit (-113.4,-8.2) on 100 Feet Road northbound
  const ex=-113.4, ez=-8.2;
  const raw=t.__segs.filter(q=>Math.hypot(q.x1-ex,q.z1-ez)<26||Math.hypot(q.x2-ex,q.z2-ez)<26);
  const val=t.__validSegs.filter(q=>Math.hypot(q.x1-ex,q.z1-ez)<26||Math.hypot(q.x2-ex,q.z2-ez)<26);
  const fmt=q=>'('+(+q.x1.toFixed(1))+','+(+q.z1.toFixed(1))+')->('+(+q.x2.toFixed(1))+','+(+q.z2.toFixed(1))+') len='+Math.hypot(q.x2-q.x1,q.z2-q.z1).toFixed(1)+' '+(q.name||'?')+(q.oneway?' ow':'')+' midSolid='+window.__solid((q.x1+q.x2)/2,(q.z1+q.z2)/2);
  console.log('RAW('+raw.length+'):'); raw.slice(0,12).forEach(q=>console.log('  '+fmt(q)));
  console.log('VALID('+val.length+'):'); val.slice(0,12).forEach(q=>console.log('  '+fmt(q)));
  // what does findNext pick from the frozen head's exit?
  const head=raw.find(q=>q.name==='100 Feet Road'&&Math.hypot(q.x2-ex,q.z2-ez)<1);
  if(head){const n=t.__findNext(head,head.x2,head.z2,(head.x2-head.x1)/Math.hypot(head.x2-head.x1,head.z2-head.z1),(head.z2-head.z1)/Math.hypot(head.x2-head.x1,head.z2-head.z1));
    console.log('FINDNEXT from head exit: '+(n?n.seg.name+' dir'+n.dir+' start('+n.seg.x1.toFixed(1)+','+n.seg.z1.toFixed(1)+')':'NULL'));}
});
await b.close(); process.exit(0);
