import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout:600000, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4180/?ao=0',{waitUntil:'load'});
await p.waitForFunction('window.__game&&window.__step',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>{
  const g=window.__game; g.state.hour=14; g.state.auto=false; g.go(); window.__noRender=true; window.__paused=true;
  const S=g.solid||window.__solid; // solid may be on game
  const solid=(x,z)=> (g.solid? g.solid(x,z) : window.__solid(x,z));
  const div=(x,z)=> window.__inDivider? window.__inDivider(x,z):null;
  const P=window.__piers||[];
  const pier=(x,z)=>{for(let i=0;i<P.length;i++){const dx=x-P[i][0],dz=z-P[i][1];if(dx*dx+dz*dz<1.32)return true}return false};
  const rows=[];
  for(let z=198;z<=213;z+=1){let r='';for(let x=-444;x<=-432;x+=1){const s=solid(x,z),d=div(x,z),pi=pier(x,z);r+= s?'#':(d?'D':(pi?'P':'.'))}rows.push('z='+z.toFixed(0).padStart(3)+' '+r)}
  const piersNear=P.filter(q=>q[0]>-450&&q[0]<-425&&q[1]>195&&q[1]<215);
  return {xrange:'-444..-432',rows,piersNear,hasSolid:!!(g.solid||window.__solid),hasDiv:!!window.__inDivider,nPiers:P.length}})));
await b.close();
