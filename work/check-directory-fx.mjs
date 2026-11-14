import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge'});
const errors=[];
for(const width of [1280,390]) {
 const page=await browser.newPage({viewport:{width,height:844}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:50610/');
 await page.waitForSelector('.room-card');
 await page.locator('#scene-works-links').scrollIntoViewIfNeeded();
 await page.waitForTimeout(1100);
 await page.locator('#scene-works-links .room-card').first().hover();
 await page.waitForTimeout(1500);
 await page.screenshot({path:`work/directory-fx-${width}.png`});
 console.log(JSON.stringify(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,rooms:document.querySelectorAll('.directory-fx').length,cards:document.querySelectorAll('.room-card').length,visible:document.querySelectorAll('.room-card.fx-visible').length}))));
 await page.evaluate(()=>{const q=document.querySelector('#room-query');q.value='AI';q.dispatchEvent(new Event('input'));});
 await page.waitForTimeout(600);
 await page.emulateMedia({reducedMotion:'reduce'});
 console.log('reduced',await page.locator('.room-card').first().evaluate(e=>getComputedStyle(e).animationName));
 await page.close();
}
console.log('errors',errors);await browser.close();if(errors.length)process.exit(1);

