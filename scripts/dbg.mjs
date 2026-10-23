import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game && window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=19;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>{const g=window.__game,K=window.__keys;const o=[];g.auto.x=-35.7;g.auto.z=725;g.auto.a=0;g.auto.v=0;g.auto.steer=0;K.KeyW=true;for(let i=0;i<30;i++){window.__step(0.05,performance.now());if(i%6==0)o.push([g.auto.z.toFixed(1),g.auto.v.toFixed(1)])}const S=g.roadSegs().filter(s=>(s.name||"").includes("100")&&Math.max(s.z1,s.z2)>600).map(s=>[s.x1,s.z1,s.x2,s.z2].map(v=>+v.toFixed(0)).join(","));return [S.slice(0,12),g.solid(-35.7,725)]})));
await b.close();
