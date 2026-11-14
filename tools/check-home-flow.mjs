// Regression checks for startup overlays, location recovery and external search submission.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const base=(process.argv[2]||readFileSync(new URL('.serve-url',import.meta.url),'utf8').trim()).replace(/\/$/,'');
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const screenshots=new URL('.check/',import.meta.url);mkdirSync(screenshots,{recursive:true});
try {
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  for(const host of ['www.baidu.com','www.bing.com','www.google.com']) await context.route(`https://${host}/**`,route=>route.fulfill({body:'Search destination verified'}));
  const page=await context.newPage();
  await page.goto(base);await page.waitForSelector('.room-card');
  for(const [provider,host,param] of [['baidu','www.baidu.com','wd'],['bing','www.bing.com','q'],['google','www.google.com','q']]){
    await page.locator(`.search-engines label:has(input[value="${provider}"])`).click();
    await page.locator('#home-query').fill('  像素世界 C++ & 资源?  ');
    const popupPromise=context.waitForEvent('page');
    await page.locator('.site-search button').click();const popup=await popupPromise;
    await popup.waitForLoadState();const url=new URL(popup.url());
    assert.equal(url.hostname,host);assert.equal(url.searchParams.get(param),'像素世界 C++ & 资源?');assert(!url.searchParams.has('engine'));
    assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();
  }
  await page.reload();await page.waitForSelector('.room-card');
  assert(await page.locator('.search-engines input[value="google"]').isChecked());
  await page.locator('[data-open-search]').click();assert(await page.locator('#directory').isVisible());await page.keyboard.press('Escape');
  await page.screenshot({path:new URL('search-desktop.png',screenshots).pathname.replace(/^\/(?=[A-Z]:)/i,'')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL('search-phone.png',screenshots).pathname.replace(/^\/(?=[A-Z]:)/i,'')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  const weatherChecks=await page.evaluate(async()=>{
    const {createWeather}=await import('/engine/weather.js');
    const {requestBrowserLocation}=await import('/engine/location.js');
    const {locateForLunarSky}=await import('/engine/world/lunar.js');
    const checks=[];const check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
    const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
    const payload=()=>({current:{temperature_2m:21,weather_code:2,rain:0,showers:0,cloud_cover:45,wind_speed_10m:8,time:Date.now()/1000}});
    let fetchCalls=0;const fetcher=async()=>{fetchCalls++;return {ok:true,json:async()=>payload()};};
    for(const code of [1,2,3]){
      const w=createWeather({storage,fetcher,geolocation:{getCurrentPosition:(_,fail)=>fail({code})}});
      await w.requestLocation();check('location failure '+code,w.state.status===({1:'denied',2:'location-unavailable',3:'location-timeout'})[code]);w.dispose();
    }
    const unsupported=createWeather({storage,fetcher,geolocation:null});await unsupported.requestLocation();check('unsupported',unsupported.state.status==='location-unsupported');unsupported.dispose();
    let calls=0,answer;const geo={getCurrentPosition(ok){calls++;answer=ok;}};
    const first=requestBrowserLocation(geo),second=requestBrowserLocation(geo);answer({coords:{latitude:31.2,longitude:121.5}});await Promise.all([first,second]);check('deduplicated request',calls===1);
    let sky;const unsubscribe=locateForLunarSky((latitude,longitude)=>sky={latitude,longitude});
    const w=createWeather({storage,fetcher,geolocation:{getCurrentPosition:ok=>ok({coords:{latitude:31.2,longitude:121.5}})}});
    await w.requestLocation();check('location success',w.state.status==='live'&&w.state.data.temperature===21);check('shared sky location',sky.latitude===31.2);
    const before=fetchCalls;await w.refresh({force:true});check('explicit refresh bypasses cache',fetchCalls===before+1);
    await w.setLocation({name:'北京',latitude:39.9,longitude:116.4});check('manual city',w.state.location.city==='北京'&&w.state.status==='live');w.dispose();
    const restored=createWeather({storage,fetcher});restored.start();await new Promise(r=>setTimeout(r,10));check('city restored',restored.state.location.city==='北京');restored.dispose();
    const race=createWeather({storage,fetcher,geolocation:{getCurrentPosition:ok=>answer=ok}});const old=race.requestLocation();await race.setLocation({name:'杭州',latitude:30.2,longitude:120.1});answer({coords:{latitude:0,longitude:0}});await old;check('late location cannot replace city',race.state.location.city==='杭州');race.dispose();unsubscribe();
    const offline=createWeather({storage,fetcher:async()=>{throw Error('offline')}});await offline.setLocation({name:'无缓存',latitude:20,longitude:80});check('weather offline',offline.state.status==='unavailable');offline.dispose();
    return checks;
  });
  console.log('PASS search and weather:',weatherChecks);await context.close();
  for(const width of [1280,390]){
    const context=await browser.newContext({viewport:{width,height:width===390?844:800},reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      window.locationCalls=0;window.geoMode='error';window.dialogEvents=[];
      const original=HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal=function(...args){dialogEvents.push({id:this.id,loading:!!document.querySelector('#loading'),intro:!!window.__home?.rig.introActive});return original.apply(this,args);};
      navigator.geolocation.getCurrentPosition=(ok,fail)=>{locationCalls++;setTimeout(()=>geoMode==='success'?ok({coords:{latitude:31.2,longitude:121.5}}):fail({code:2}),30);};
      const query=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=p=>p.name==='geolocation'?Promise.resolve({state:'prompt'}):query(p);
    });
    await context.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{current:{temperature_2m:23,weather_code:2,rain:0,cloud_cover:30,time:Date.now()/1000}}}));
    await context.route('https://geocoding-api.open-meteo.com/**',route=>route.fulfill({json:{results:[{name:'北京',country:'中国',latitude:39.9,longitude:116.4}]}}));
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/?view=3d');
    await page.waitForFunction(()=>window.__home?.player,null,{timeout:90000});
    await page.waitForFunction(()=>!document.documentElement.classList.contains('world-booting'),null,{timeout:60000});
    await page.waitForSelector('#panel[data-station="mailbox"][open]');await page.waitForTimeout(700);
    const boot=await page.evaluate(()=>({calls:locationCalls,events:dialogEvents}));
    assert.equal(boot.calls,0);assert.deepEqual(boot.events,[{id:'panel',loading:false,intro:false}]);
    await page.locator('#panel .close').click();await page.locator('#moodButton').click();await page.locator('#weatherLocate').click();
    await page.waitForFunction(()=>__home.weather.state.status==='location-unavailable');
    assert.match(await page.locator('.location-message').textContent(),/选择城市/);
    await page.locator('#weatherCity').fill('北京');await page.locator('.city-search button').click();await page.locator('.city-results button').click();
    await page.waitForFunction(()=>__home.weather.state.status==='live');assert.equal(await page.locator('.location-source').textContent(),'天气城市：北京');
    await page.screenshot({path:new URL(`weather-${width}.png`,screenshots).pathname.replace(/^\/(?=[A-Z]:)/i,'')});
    await page.evaluate(()=>geoMode='success');await page.locator('#weatherLocate').click();await page.waitForFunction(()=>__home.weather.state.location?.latitude===31.2&&__home.weather.state.status==='live');
    assert.equal(await page.evaluate(()=>locationCalls),2);assert.deepEqual(errors,[]);
    console.log('PASS 3D startup, manual city and retry:',width);await context.close();
  }
}finally{await browser.close();}
