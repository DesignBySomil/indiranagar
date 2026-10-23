import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
await p.evaluate(()=>{const g=window.__game;g.state.hour=14;g.state.auto=false;g.go();window.__noRender=true;window.__paused=true});
await new Promise(r=>setTimeout(r,2500));
console.log(await p.evaluate(()=>{const g=window.__game,K=window.__keys;const log=[];
 for(let i=0;i<100;i++)window.__step(0.05,performance.now());
 const u=g.traffic.units.find(q=>q.speed>2)||g.traffic.units[0];
 // park the auto level with the unit's rear-left, 2 m lateral, heading same as unit
 const sn=Math.sin(u.yaw),cs=Math.cos(u.yaw);
 g.auto.x=u.x-sn*(u.halfLen+0.5)+cs*2.0;g.auto.z=u.z-cs*(u.halfLen+0.5)-sn*2.0;g.auto.a=u.yaw;g.auto.v=0;
 const hold=()=>{u.speed=0;};
 const run=(n,keys,tag)=>{for(const k of ['KeyW','KeyS','KeyA','KeyD'])K[k]=keys.includes(k);let jumps=0;for(let i=0;i<n;i++){hold();const px=g.auto.x,pz=g.auto.z;window.__step(0.05,performance.now());if(Math.hypot(g.auto.x-px,g.auto.z-pz)>1.5)jumps++}log.push(tag+' pos '+g.auto.x.toFixed(1)+','+g.auto.z.toFixed(1)+' v '+g.auto.v.toFixed(1)+' a '+g.auto.a.toFixed(2)+' jumps '+jumps+' unit '+u.x.toFixed(1)+','+u.z.toFixed(1)+' sp '+u.speed.toFixed(1))};
 log.push('start auto '+g.auto.x.toFixed(1)+','+g.auto.z.toFixed(1)+' unit '+u.x.toFixed(1)+','+u.z.toFixed(1)+' yaw '+u.yaw.toFixed(2));
 run(60,['KeyW'],'W 3s');run(30,['KeyS'],'S 1.5s');run(20,['KeyS','KeyA'],'S+A 1s');run(40,['KeyW','KeyD'],'W+D 2s');run(40,['KeyW'],'W 2s');
 K.KeyW=K.KeyS=K.KeyA=K.KeyD=false;return log.join('\n')}));await b.close();
