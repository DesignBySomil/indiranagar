import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL||'http://localhost:4173/', { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 90000 });
const r = await p.evaluate(() => { const out=[]; const THREE_Box=null; window.__game.scene.traverse(o=>{ if(o.isInstancedMesh||!(o.isMesh||o.isPoints||o.isSprite||o.isLine)) return; o.updateWorldMatrix(true,false); if(!o.geometry||!o.geometry.attributes||!o.geometry.attributes.position) {out.push([o.type,o.name,'nogeo']);return;} o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); if(bb.min.y>22 || (bb.max.y>60 && o.geometry.attributes.position.count<5000)) out.push([o.type,o.name,o.parent&&o.parent.name,+bb.min.y.toFixed(1),+bb.max.y.toFixed(1),+bb.min.x.toFixed(0),+bb.min.z.toFixed(0),o.geometry.attributes.position.count]); }); return out.slice(0,40); });
console.log(JSON.stringify(r)); await b.close();
