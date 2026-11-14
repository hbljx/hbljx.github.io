import { worldPage } from './world-page.mjs';
import {chromium} from 'playwright';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const url=process.argv[2]||readFileSync(new URL('./.serve-url',import.meta.url),'utf8').trim();
const out=fileURLToPath(new URL('./.check/',import.meta.url));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
let failed=false;
try{
 for(const mobile of [false,true]){
  const name=mobile?'phone':'computer',page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:760},isMobile:mobile,hasTouch:mobile}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(worldPage(url));await page.waitForFunction(()=>window.__home?.world?.transit,null,{timeout:60000});
  const result=await page.evaluate(async()=>{
   const {tunnelCeiling,TUNNEL_RADIUS}=await import('/world/tunnel-glazing.js');
   const {path,waterMask}=__home.world.transit.tunnel,{mask,bounds,waterY}=waterMask,{data,width,height}=mask.image;
   const dry=(x,z)=>{
    const u=(x-bounds.x0)/(bounds.x1-bounds.x0),v=(z-bounds.z0)/(bounds.z1-bounds.z0);
    return u>=0&&u<1&&v>=0&&v<1&&data[Math.floor(v*height)*width+Math.floor(u*width)]>127;
   };
   const leaks=[],lostOcean=[],rampSamples=[0,0];let overheadSamples=0;
   for(let s=0;s<path.length;s+=.25){
    const p=path.sample(s,{}),h=waterY-p.y;
    for(let side=-5.1;side<=5.1;side+=.3){
     const x=p.x+Math.cos(p.heading)*side,z=p.z-Math.sin(p.heading)*side;
     rampSamples[s<path.length/2?0:1]++;if(!dry(x,z))leaks.push({s,side,x,z});
     if(h>tunnelCeiling(side)+1)overheadSamples++;
    }
    for(const side of [-TUNNEL_RADIUS-1,TUNNEL_RADIUS+1]){
     const x=p.x+Math.cos(p.heading)*side,z=p.z-Math.sin(p.heading)*side;
     if(dry(x,z))lostOcean.push({s,side,kind:'outside-wall'});
    }
   }
   return {rampSamples,overheadSamples,leakCount:leaks.length,leaks:leaks.slice(0,5),lostOceanCount:lostOcean.length,lostOcean:lostOcean.slice(0,5)};
  });
  for(const [end,s,direction]of [['north',48,1],['south',230,-1]]){
   await page.evaluate(({s,direction})=>{
    const h=__home,p=h.world.transit.tunnel.path.sample(s,{}),q=h.world.transit.tunnel.path.sample(s+direction*25,{});
    h.rig.showcase([p.x,p.y+3.5,p.z],[q.x,q.y+1,q.z]);for(let i=0;i<80;i++)h.rig.update(.05,h.player);
   },{s,direction});
   await page.screenshot({path:out+`tunnel-water-${name}-${end}.png`});
  }
  const report={...result,errors};console.log(name+': '+JSON.stringify(report));writeFileSync(out+`tunnel-water-${name}.json`,JSON.stringify(report,null,2));
  failed ||=result.leakCount>0||result.lostOceanCount>0||result.rampSamples.some(n=>!n)||!result.overheadSamples||errors.length>0;
  await page.close();
 }
}finally{await browser.close();}
process.exitCode=failed?1:0;
