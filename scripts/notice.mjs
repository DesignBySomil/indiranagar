import puppeteer from 'puppeteer-core';
const URL='https://raw.githack.com/DesignBySomil/indiranagar/preview/index.html';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.goto(URL,{waitUntil:'networkidle2',timeout:60000});
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,600));
console.log('LINKS:', await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.href).join(' | ')));
await b.close();
