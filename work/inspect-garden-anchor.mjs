import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('http://127.0.0.1:5585/#about-us');
await page.waitForSelector('.footer-world');
await page.waitForTimeout(1500);
console.log(await page.evaluate(()=>({y:scrollY,h:innerHeight,journey:document.querySelector('.garden-arrival').getBoundingClientRect().toJSON(),section:document.querySelector('#about-us').getBoundingClientRect().toJSON(),offset:document.querySelector('#about-us').offsetTop,progress:document.querySelector('.garden-arrival').style.cssText,hidden:document.querySelector('.arrival-veil').hidden})));
await browser.close();
