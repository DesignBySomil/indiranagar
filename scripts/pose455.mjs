import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>{
  const g=window.__game; g.state.hour=14; g.state.auto=false; g.go(); window.__noRender=true; window.__paused=true;
  const FP=[[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const free=(x,z,a)=>{const sn=Math.sin(a),cs=Math.cos(a);for(const[lx,lz]of FP){if(g.solid(x+cs*lx+sn*lz,z-sn*lx+cs*lz))return false}return true};
  // raster map of east mouth
  const rows=[];
  for(let z=198;z<=208;z+=1){let r='';for(let x=-376;x<=-360;x+=1){r+= g.solid(x,z)?'#':'.'}rows.push('z='+z+' '+r)}
  // fine pose probe along the whole 455 lane: sample every 1m, headings -40..40 deg around tangent in 4 deg steps
  const PTS=window.__lane455||null;
  return {rows};
})));
await b.close();
