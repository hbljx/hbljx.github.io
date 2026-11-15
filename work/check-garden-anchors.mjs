import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:5585/#about-us');
 await page.waitForSelector('.footer-world');
 await page.waitForFunction(()=>document.querySelector('.arrival-veil').hidden);
 await page.locator('#scene-pool .scene-next').focus();
 await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('.arrival-veil').hidden);
 assert.equal(new URL(page.url()).hash,'#about-us');
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await page.waitForTimeout(150);
 const a=await page.locator('.footer-world').evaluate(c=>c.toDataURL());
 await page.waitForTimeout(150);
 assert.notEqual(await page.locator('.footer-world').evaluate(c=>c.toDataURL()),a);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.waitForTimeout(200);
 const b=await page.locator('.footer-world').evaluate(c=>c.toDataURL());
 await page.waitForTimeout(250);
 assert.equal(await page.locator('.footer-world').evaluate(c=>c.toDataURL()),b);
 console.log('Direct about anchor, garden next link, animated footer and offscreen pause passed');
}finally{await browser.close();}
