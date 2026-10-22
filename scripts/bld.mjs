import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto('http://localhost:4175/',{waitUntil:'load'});
await p.waitForFunction('window.__game',{timeout:180000});
const out=await p.evaluate(()=>{const w=window.__world||window.__game.world;if(!w)return 'noworld '+Object.keys(window.__game).join();const r=[];const pts=[[-350,-251],[-415,-254],[-310,-262]];for(const bd of w.buildings){const xs=bd.p.map(q=>q[0]),zs=bd.p.map(q=>q[1]);const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);if(pts.some(q=>q[0]>=x0&&q[0]<=x1&&q[1]>=z0&&q[1]<=z1))r.push(JSON.stringify({n:bd.p.length,x0,x1,z0,z1,h:bd.h,k:Object.keys(bd).join(),name:bd.name}))}return r.join('\n')});
console.log(out);await b.close();
