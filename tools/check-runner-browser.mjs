import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('./.check/runner/', import.meta.url));
const rememberedURL = () => {
 try { return readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim(); }
 catch { return 'http://127.0.0.1:8765/'; }
};
const url = process.argv[2] || rememberedURL();
mkdirSync(out,{recursive:true});
const browser = await chromium.launch({channel:'msedge'}).catch(() => chromium.launch());
try {
 for (const width of [1440,768,390,320]) {
  const context = await browser.newContext({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
  const page = await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.waitForSelector('.footer-runner');
  await page.locator('.home-footer').evaluate(el=>el.scrollIntoView({behavior:'instant',block:'end'}));
  await page.waitForTimeout(400);
  await page.screenshot({path:`${out}/runner-${width}.png`});
  console.log(width, await page.locator('.footer-runner').boundingBox());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
  await page.evaluate(async()=>{
   const {Runner}=await import('/navigation/runner-core.js');
   const update=Runner.prototype.update;
   Runner.prototype.update=function(...args){window.testRunner=this;return update.apply(this,args);};
  });
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.footer-runner').getAttribute('data-state'),'running');
  const scroll=await page.evaluate(()=>scrollY);
  await page.keyboard.down('Space'); await page.waitForTimeout(250);
  assert.ok(await page.evaluate(()=>testRunner.y>90),'held jump');
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(240);
  assert.equal(await page.evaluate(()=>testRunner.y),0,'fast fall');
  assert.equal(await page.evaluate(()=>testRunner.duck),true);
  await page.keyboard.up('ArrowDown');
  assert.equal(await page.evaluate(()=>testRunner.duck),false);
  assert.equal(await page.evaluate(()=>scrollY),scroll,'game keys must not scroll');
  const plaques = await page.evaluate(() => ['.footer-brand-plaque','.footer-icp','.footer-top'].map(selector => {
   const b=document.querySelector(selector).getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};
  }));
  for(const plaque of plaques) assert.ok(plaque.x>=0 && plaque.right<=width,'footer plaque fits');
  if(width<700) assert.ok(plaques[0].bottom<=plaques[1].y && plaques[1].bottom<=plaques[2].y,'mobile plaques do not overlap');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.footer-runner').getAttribute('data-state'),'paused');
  const score=await page.locator('[data-score]').textContent();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('[data-score]').textContent(),score);
  await page.locator('.runner-start').click();
  if(width<700){
   const duck=await page.locator('[data-duck]').boundingBox();
   const session=await context.newCDPSession(page);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:duck.x+20,y:duck.y+20}]});
   await page.waitForTimeout(60);
   assert.equal(await page.evaluate(()=>testRunner.duck),true,'touch crouch');
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await page.evaluate(()=>testRunner.duck),false,'touch release');
   const canvas=await page.locator('canvas.runner-canvas').boundingBox();
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:canvas.x+180,y:canvas.y+100}]});
   await page.waitForTimeout(200);
   assert.ok(await page.evaluate(()=>testRunner.y>80),'touch hold jump');
   await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   assert.equal(await page.evaluate(()=>testRunner.jumpHeld),false,'touch cancel');
  }
  await page.evaluate(()=>{testRunner.y=0;testRunner.vy=0;testRunner.score=710;testRunner.distance=28400;testRunner.nextSpawn=10000;});
  await page.waitForTimeout(50);
  await page.locator('.footer-runner').screenshot({path:`${out}/runner-night-${width}.png`});
  assert.equal(await page.locator('.footer-runner').getAttribute('data-night'),'true');
  await page.evaluate(()=>{Object.assign(testRunner.obstacles[0],{active:true,kind:'cactus',x:testRunner.playerX+18,width:22,height:48,bottom:0,count:1});});
  await page.waitForTimeout(50);
  assert.equal(await page.locator('.footer-runner').getAttribute('data-state'),'over');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('.footer-runner').getAttribute('data-state'),'over','restart cooldown');
  await page.waitForTimeout(510);await page.keyboard.press('Enter');
  assert.equal(await page.locator('.footer-runner').getAttribute('data-state'),'running');
  assert.ok(await page.evaluate(()=>testRunner.speed<6.1));
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);
  assert.equal(await page.locator('.footer-runner').getAttribute('data-state'),'paused','offscreen pause');
  await page.reload();await page.waitForSelector('.footer-runner');
  assert.ok(Number(await page.locator('[data-best]').textContent())>=710,'best score survives reload');
  assert.deepEqual(errors,[]);
  console.log('PASS browser input, touch, night, death/restart, pause and bounds',width);
  await context.close();
 }
}finally{await browser.close();}

