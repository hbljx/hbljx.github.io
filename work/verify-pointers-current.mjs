import {chromium} from 'playwright';
const b=await chromium.launch({channel:'msedge'}),p=await b.newPage({viewport:{width:1280,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5585/');await p.waitForSelector('.scene-pointer-canvas');await p.waitForSelector('.room-card');
for(const [id,expected] of [['about','comet'],['works','lightning'],['writing','ribbon'],['coffee','stardust'],['lab','scanner'],['court','water'],['pool','fairy'],['about-us','magnet']]){
 const selector=id==='about-us'?'#about-us':`#scene-${id}-links`;await p.locator(selector).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(500);await p.mouse.move(420,280);await p.mouse.move(580,310,{steps:15});await p.waitForTimeout(60);
 const mode=await p.locator('canvas.scene-pointer-canvas').getAttribute('data-mode');if(mode!==expected)throw Error(`${id}: ${mode}`);await p.screenshot({path:`work/pointer-${expected}.png`});console.log(id,mode);
}
await p.emulateMedia({reducedMotion:'reduce'});await p.mouse.move(550,300);if(await p.locator('.scene-pointer-canvas').getAttribute('data-mode'))throw Error('Reduced motion not disabled');console.log('errors',errors);await b.close();if(errors.length)process.exit(1);

