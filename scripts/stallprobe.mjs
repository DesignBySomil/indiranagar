import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>{const g=window.__game,K=window.__keys;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true;
 const hits={};
 for(const [n,o] of [['crowd',g.crowd],['parked',g.parked],['traffic',g.traffic]]){const h=[];if(o&&o.solid)for(let x=494;x<=500;x+=0.5)for(let z=-506;z<=-501;z+=0.5)if(o.solid(x,z))h.push([x,z]);hits[n]=h.slice(0,8)}
 // drive west from (505,-503.5)
 g.auto.x=505;g.auto.z=-503.5;g.auto.a=-Math.PI/2;g.auto.v=0;g.auto.steer=0;
 const log=[];
 for(let n=0;n<200;n++){K.KeyW=g.auto.v<5;K.KeyA=K.KeyD=false;window.__step(0.05,performance.now());
  if(n%25===0)log.push([+g.auto.x.toFixed(1),+g.auto.z.toFixed(1),+g.auto.v.toFixed(1)])}
 K.KeyW=false;
 return {hits,log}})));
await b.close();
