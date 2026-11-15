import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge'});
const errors=[];
for(const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5585/');
 await page.waitForSelector('.search-observatory');
 await page.locator('#home-query').focus();
 await page.waitForTimeout(1200);
 await page.locator('#home-query').pressSequentially('creative design',{delay:75});
 await page.waitForTimeout(120);
 await page.screenshot({path:`work/search-optics-input-${width}.png`});
 await page.locator('label:has(input[value="google"])').click();
 await page.waitForTimeout(500);
 await page.screenshot({path:`work/search-optics-engine-${width}.png`});
 await page.close();
}
console.log({errors});await browser.close();if(errors.length)process.exit(1);
