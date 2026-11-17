import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  await page.addInitScript(()=>localStorage.setItem('li-home-guide-seen','1'));
  await page.goto('http://127.0.0.1:5585/?view=3d&debug');
  await page.waitForFunction(()=>window.__home,null,{timeout:120000});
  const result = await page.evaluate(async()=>{
    const h=__home,p=h.player,empty={x:0,z:0}, tick=(input,n=60)=>{for(let i=0;i<n;i++)p.update(1/60,input,0);};
    p.restore(-10,-8,0,0);p.toggleFly();tick(empty);
    const takeoff=p.y;tick({...empty,up:true},30);const rise=p.y;
    tick({...empty,up:true},90);const ceiling=p.y;
    tick({...empty,down:true},120);const landing={y:p.y,mode:p.mode};
    p.restore(.5,0,10,0);const walk=h.navigate(.5,12,0);tick(empty,150);
    const room={walk,z:p.pos.z,mode:p.mode};
    p.restore(.5,0,15,0);const doors=h.world.animated.doors;
    if(doors.states.find(d=>d.id==='front-left').open)doors.interact(p,h.nav);
    doors.update(.6,h.nav,[]);
    p.restore(.5,0,11,0);
    const doorway=h.navigate(.5,19,0);
    for(let i=0;i<400;i++){doors.update(1/60,h.nav,[p]);p.update(1/60,empty,0);}
    const entrance={accepted:doorway,z:p.pos.z,mode:p.mode};
    // Hidden upper glass must not intercept a ground pick.
    const THREE=await import('three');
    const ray=new THREE.Ray(new THREE.Vector3(0,25,0),new THREE.Vector3(0,-1,0));
    const picked=h.world.ground.pick(ray,hit=>!['roof','tea-roof'].includes(hit.site));
    return {takeoff,rise,ceiling,landing,room,entrance,picked:picked?.site};
  });
  console.log(result);
  assert.equal(result.takeoff,-8);assert.ok(result.rise>-8&&result.rise<-2);
  assert.ok(result.ceiling<-3.7);assert.equal(result.landing.mode,'ground');assert.equal(result.landing.y,-8);
  assert.ok(result.room.walk&&result.room.z>11.5&&result.room.mode==='ground');
  assert.ok(result.entrance.accepted&&result.entrance.z>18.5&&result.entrance.mode==='ground');
  await page.evaluate(()=>{
    __home.player.restore(.5,0,10,0);__home.rig.skipIntro();
    __home.rig.showcase([.5,2,9],[.5,0,12]);
  });
  await page.waitForTimeout(2000);
  const target=await page.evaluate(async()=>{
    const THREE=await import('three');
    const point=new THREE.Vector3(.5,.01,12).project(__home.stage.camera);
    return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2};
  });
  await page.mouse.click(target.x,target.y);
  const clicked=await page.evaluate(()=>({mode:__home.player.mode,path:__home.player.path,open:document.querySelector('#panel')?.open}));
  console.log({clicked});
  assert.equal(clicked.mode,'ground');assert.ok(clicked.path?.length);assert.ok(!clicked.open);
  console.log('PASS basement takeoff, ceiling, landing; room and closed-door walking; filtered floor picking');
} finally {await browser.close();}
