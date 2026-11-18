import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const directory='C:/Users/Love/Documents/Codex/2026-11-18/new-chat/work/detail-review';
const browser=await chromium.launch({channel:'msedge'});
const palette=[['baidu','rgb(70,240,166)'],['bing','rgb(77,166,255)'],['google','rgb(187,130,255)'],['yuanbao','rgb(255,162,76)']];
const logs=[],errors=[];
const read=page=>page.locator('.hero-stage').evaluate(el=>getComputedStyle(el).getPropertyValue('--search-energy').trim().replaceAll(' ',''));
async function select(page,id){await page.locator('label:has(input[value="'+id+'"])').click();}
try {
 for(const viewport of [{width:1440,height:960},{width:390,height:844},{width:320,height:568}]) {
  const mobile=viewport.width<701;
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5585/');await page.locator('.search-observatory').waitFor();
  await page.waitForTimeout(1200);
  for(const [id,target] of palette) {
   const previous=await read(page);await select(page,id);await page.waitForTimeout(250);
   const midpoint=await read(page);
   if(previous!==target){assert.notEqual(midpoint,previous);assert.notEqual(midpoint,target);}
   await page.waitForFunction(target=>getComputedStyle(document.querySelector('.hero-stage')).getPropertyValue('--search-energy').trim().replaceAll(' ','')===target,target);
   assert.equal(await read(page),target);
   if(!mobile)await page.screenshot({path:directory+'/detail-'+id+'-1440.png'});
   logs.push({width:viewport.width,id,midpoint,target});
  }
  await select(page,'google');await page.locator('#home-query').fill('探索更多可能');
  await page.waitForTimeout(1300);
  await page.screenshot({path:directory+'/detail-'+viewport.width+'x'+viewport.height+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  const before=await page.locator('.search-observatory').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);
  assert.equal(before,await page.locator('.search-observatory').evaluate(c=>c.toDataURL()));
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',checks:'palette endpoints, midpoints, reduced motion, overflow; captured desktop/mobile',logs,errors},null,2));
} finally {await browser.close();}

