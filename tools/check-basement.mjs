import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto((process.argv[2]||'http://127.0.0.1:5585/')+'?view=3d');await page.waitForFunction(()=>window.__home||window.__homeStartupError,{timeout:90000});
await page.waitForTimeout(2000);
console.log(await page.evaluate(()=>{if(window.__homeStartupError)return window.__homeStartupError;const {world,player,nav}=__home;const b=world.basement;return {foot:nav.canStand(b.foot.x,b.foot.z),blocked:b.points.filter(p=>!world.ground.canStand(p.x,p.z,p.y)),shader:world.coast.sea.material.customProgramCacheKey()};}));
const result=await page.evaluate(()=>{const {world,player,navigate}=__home;player.teleport(-23,15);document.querySelector('#panel .close')?.click();const accepted=navigate(-18,9,-8);for(let i=0;i<2000;i++)player.update(1/60,{x:0,z:0},0);return{accepted,x:player.pos.x,y:player.y,z:player.pos.z,island:player.island,swimming:player.swimming,path:player.path?.slice(0,3)};});console.log('down',result);if(!result.accepted||Math.abs(result.y+8)>.01||result.island!=='basement'||result.swimming)throw Error('Basement descent failed');
await page.evaluate(()=>{document.querySelector('#panel .close')?.click();__home.rig.showcase([-17,-5.5,-9],[-33,-6,-9]);__home.rig.update(1,__home.player);__home.world.oceanLife.update(0,null,__home.stage.camera);__home.stage.renderer.render(__home.stage.scene,__home.stage.camera);});await page.waitForTimeout(1200);mkdirSync('tools/.check',{recursive:true});await page.screenshot({path:'tools/.check/basement-west.png'});
const up=await page.evaluate(()=>{const {player,navigate}=__home;const accepted=navigate(-23,15,0);for(let i=0;i<2000;i++)player.update(1/60,{x:0,z:0},0);return{accepted,x:player.pos.x,y:player.y,z:player.pos.z,island:player.island,path:player.path?.slice(0,3)};});console.log('up',up);if(Math.abs(up.y)>.01||up.island)throw Error('Basement ascent failed');
await page.evaluate(()=>{__home.rig.showcase([-17,6,19],[-22,-1,10]);__home.rig.update(1,__home.player);__home.stage.renderer.render(__home.stage.scene,__home.stage.camera);});await page.waitForTimeout(500);await page.screenshot({path:'tools/.check/basement-entry.png'});console.log('walls',await page.evaluate(()=>{
const {player,world}=__home,empty={x:0,z:0};
for(const [x,z,dx,dz] of [[-24,0,-1,0],[28,0,1,0],[0,-26,0,-1],[0,15,0,1]]){
 if(!player.restore(x,-8,z,0))throw Error('Cannot stand near glass');
 for(let i=0;i<150;i++)player.update(1/60,{x:dx,z:dz},0);
 const r=world.basement.room;
 if(player.pos.x<=r.x0||player.pos.x>=r.x1||player.pos.z<=r.z0||player.pos.z>=r.z1||player.swimming)throw Error('Glass wall leaked');
}
player.restore(-18,-8,9,0);return 'four walls block walking; room stays dry';
}));
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.querySelector('#panel .close')?.click();__home.rig.showcase([-21,-6,-9],[-33,-6,-9]);__home.rig.update(1,__home.player);__home.world.oceanLife.update(0,null,__home.stage.camera);__home.stage.renderer.render(__home.stage.scene,__home.stage.camera);});await page.waitForTimeout(1500);await page.screenshot({path:'tools/.check/basement-phone.png'});
console.log({errors});if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
