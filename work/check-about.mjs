import {chromium} from 'playwright';
const b=await chromium.launch({channel:'msedge'});const errors=[];
for(const width of [1280,390]){
 const p=await b.newPage({viewport:{width,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:54324/');await p.waitForSelector('.about-enhanced');await p.locator('#about-us').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await p.waitForTimeout(3800);
 console.log(await p.locator('#about-us').evaluate(e=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,text:e.querySelector('h2').getAttribute('aria-label'),links:e.querySelectorAll('.about-constellation a').length,visible:[...e.querySelectorAll('.about-typed>span')].every(s=>getComputedStyle(s).opacity==='1')})));
 await p.screenshot({path:`work/about-${width}.png`});await p.locator('.about-replay').click();await p.waitForTimeout(100);console.log('replay',await p.locator('.about-typed>span').last().evaluate(e=>getComputedStyle(e).opacity));await p.emulateMedia({reducedMotion:'reduce'});console.log('reduced',await p.locator('.about-typed>span').last().evaluate(e=>getComputedStyle(e).opacity));await p.close();
}
console.log({errors});await b.close();if(errors.length)process.exit(1);

