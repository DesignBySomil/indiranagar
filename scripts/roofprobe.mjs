import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();
await p.goto('http://localhost:4180/?ao=0',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const r=await p.evaluate(()=>{
  const g=window.__game; g.go(0); window.__noRender=true; let t0=90000;
  for(let k=0;k<60;k++){t0+=16;window.__step(0.016,t0);} // camera settles at spawn
  const camBefore={d:+Math.hypot(g.camera.position.x-g.auto.x,g.camera.position.z-g.auto.z).toFixed(2),y:+g.camera.position.y.toFixed(2)};
  // park a traffic unit right where the chase camera wants to be: 6.4m behind the auto
  const bx=g.auto.x-Math.sin(g.auto.a)*6.4, bz=g.auto.z-Math.cos(g.auto.a)*6.4;
  const u=g.traffic.units.find(u=>u.td.key==='suv'&&u.x!==0)||g.traffic.units[0];
  const lane=g.traffic.units.indexOf(u);
  // compute current lane pos vs desired: use kick offsets to hold it there (spring pulls to lane; use strong hold via cool loop)
  // simpler: directly override its seg position each step is not possible; set offsets so render+solid sit at (bx,bz)
  const recompute=()=>{ /* offset = desired - lanePos (lane pos = x-kx) */ const lx=u.x-(u.kx||0), lz=u.z-(u.kz||0); u.kx=bx-lx; u.kz=bz-lz; u.kvx=0;u.kvz=0;u.cool=999; };
  recompute();
  const seq=[];
  for(let k=0;k<40;k++){ recompute(); t0+=16; window.__step(0.016,t0);
    if(k%8===0) seq.push({d:+Math.hypot(g.camera.position.x-g.auto.x,g.camera.position.z-g.auto.z).toFixed(2),y:+g.camera.position.y.toFixed(2)});
  }
  const solidAtCam=g.traffic.solid(bx,bz);
  u.cool=0; u.kx=0;u.kz=0;
  window.__noRender=false;
  return {camBefore,seq,solidAtCam,auto:{x:+g.auto.x.toFixed(1),z:+g.auto.z.toFixed(1)},camBack:{x:+bx.toFixed(1),z:+bz.toFixed(1)}};
});
console.log(JSON.stringify(r));
await b.close();
