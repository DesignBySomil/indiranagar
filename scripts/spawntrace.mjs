import puppeteer from 'puppeteer-core';
const [,,PX='321',PZ='563',YAW='0']='x y'.length?process.argv:[];
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',protocolTimeout:200000,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--window-size=320,180']});
const p=await b.newPage();
await p.goto('http://localhost:4180/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.__game&&window.__game.auto&&window.__step,{timeout:120000});
const out=await p.evaluate(async(PX,PZ,YAW)=>{
  const g=window.__game; g.go(0);
  const req={x:+PX,z:+PZ};
  const placed=window.__placeOnRoad(req.x,req.z);
  const placedRaw={x:+placed.x.toFixed(1),z:+placed.z.toFixed(1),a:+placed.a.toFixed(2)};
  window.__spawnAt(req.x,req.z,+YAW);
  window.__noRender=true;
  const A=g.auto,K=window.__keys;
  const trace=[{t:0,x:+A.x.toFixed(1),z:+A.z.toFixed(1),v:0,a:+A.a.toFixed(2)}];
  let t0=90000;
  K.KeyW=true;
  for(let k=1;k<=180;k++){ t0+=33; window.__step(0.033,t0);
    if(k%15===0) trace.push({t:+(k*0.033).toFixed(1),x:+A.x.toFixed(1),z:+A.z.toFixed(1),v:+A.v.toFixed(2),a:+A.a.toFixed(2)}); }
  K.KeyW=false;
  return {req,placedRaw,spawn:{x:+A.x.toFixed(1),z:+A.z.toFixed(1)},trace};
},PX,PZ,YAW);
console.log(JSON.stringify(out,null,1));
await b.close(); process.exit(0);
