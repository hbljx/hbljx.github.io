import {chromium} from 'playwright';
const b=await chromium.launch({channel:'msedge'}),errors=[];
for(const width of [1440,390]){
 const p=await b.newPage({viewport:{width,height:960}});p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5585/');await p.waitForSelector('.about-world');
 await p.locator('#about-us').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(4000);
 await p.screenshot({path:`work/about-world-${width}.png`});await p.close();
}
await b.close();console.log({errors});if(errors.length)process.exit(1);
