import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('http://127.0.0.1:5585/?debug');
  await page.waitForFunction(()=>window.__home?.player||window.__homeStartupError,null,{timeout:60000});
  const startup=await page.evaluate(()=>window.__homeStartupError);
  if(startup)throw Error(JSON.stringify(startup));
  await page.waitForTimeout(2500);
  console.log(JSON.stringify(await page.evaluate(()=>__home.stats())));
  await page.screenshot({path:'work/footer-debug.png'});
} finally {await browser.close();}
