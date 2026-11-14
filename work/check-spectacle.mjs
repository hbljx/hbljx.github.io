import {chromium} from 'playwright';
const b=await chromium.launch({channel:'msedge'});const p=await b.newPage({viewport:{width:1280,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:50610/');await p.waitForSelector('.room-card');
for(const id of ['about','works','writing','coffee','lab','court','pool']){
 await p.locator(`#scene-${id}-links`).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(1800);
 if(id==='works'){
  await p.locator('#scene-works-links .room-card').first().hover();await p.waitForTimeout(120);
  if(!await p.locator('.energy-wires path').count())throw Error('Missing chain');
  await p.evaluate(()=>{const q=document.querySelector('#room-query');q.value='AI';q.dispatchEvent(new Event('input'));});await p.waitForTimeout(180);
  if(!await p.locator('.target-lock').count())throw Error('Missing search lock');
  await p.evaluate(()=>{const q=document.querySelector('#room-query');q.value='';q.dispatchEvent(new Event('input'));});
 }
 await p.screenshot({path:`work/spectacle-${id}.png`});
}
await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(250);console.log({errors,devices:await p.locator('.theme-device').count(),reduced:await p.locator('.hyper-rays').first().evaluate(e=>getComputedStyle(e).display)});
await b.close();if(errors.length)process.exit(1);
