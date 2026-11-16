import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const url=process.argv[2] || 'http://127.0.0.1:5585/';
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
const page=await browser.newPage({viewport:{width:1200,height:850}});
await page.route('**/__model_check',r=>r.fulfill({contentType:'text/html',body:`<script type="importmap">{"imports":{"three":"/vendor/three/three.module.min.js","@engine/":"/engine/"}}</script><body style="margin:0">`}));
await page.goto(new URL('/__model_check',url).href);
const result=await page.evaluate(async()=>{
const T=await import('three');const {buildMusicHall,MUSIC_FLOOR}=await import('/world/music-hall.js');const {createMusicPerformer}=await import('/world/music-performer.js');const {createTeaCouple}=await import('/world/tea-couple.js');
const scene=new T.Scene();scene.background=new T.Color('#c6c5c1');scene.add(new T.HemisphereLight(0xffffff,0x8c8190,2));const light=new T.DirectionalLight(0xffecd9,2.5);light.position.set(23,8,14);scene.add(light);
const hall=buildMusicHall({box(){}},()=>{},()=>{});scene.add(hall);const performer=createMusicPerformer();scene.add(performer.group);
const mesh=performer.group.children[0],matrix=new T.Matrix4(),color=new T.Color(),soleColor=new T.Color(0x242329),soles=[];
for(let i=0;i<mesh.count;i++){mesh.getColorAt(i,color);if(Math.abs(color.r-soleColor.r)+Math.abs(color.g-soleColor.g)+Math.abs(color.b-soleColor.b)<1e-6)soles.push(i);}
if(soles.length!==2)throw Error('Expected two shoe soles');
let minimum=Infinity;
for(let frame=0;frame<9000;frame++){
performer.update(1/60);
for(const i of soles){mesh.getMatrixAt(i,matrix);const e=matrix.elements;const bottom=performer.group.position.y+e[13]-.5*(Math.abs(e[1])+Math.abs(e[5])+Math.abs(e[9]));minimum=Math.min(minimum,bottom);if(bottom<MUSIC_FLOOR-1e-6)throw Error('Shoe penetrated rug at '+frame/60);}
}
const kit=hall.getObjectByName('detailed-drum-kit');kit.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(kit);
if(bounds.min.y<MUSIC_FLOOR-1e-6)throw Error('Drum kit penetrated rug: '+bounds.min.y);
kit.traverse(m=>{if(m.isMesh&&(m.material.transparent||m.material.opacity!==1))throw Error('Transparent drum part');});
const ray=new T.Raycaster();
for(const [origin,dir] of [[[24.3,3,10.6],[0,-1,0]],[[24.3,.9,10.6],[0,1,0]]]){ray.set(new T.Vector3(...origin),new T.Vector3(...dir));if(!ray.intersectObject(kit,true).length)throw Error('Missing cymbal face');}
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshLambertMaterial({color:0x784153}));floor.rotation.x=-Math.PI/2;floor.position.set(25,MUSIC_FLOOR,8);scene.add(floor);
const camera=new T.PerspectiveCamera(40,1200/850,.01,200),renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1200,850);document.body.append(renderer.domElement);
// A fresh performer gives deterministic review poses after the cycle test.
scene.remove(performer.group);const model=createMusicPerformer();scene.add(model.group);
window.review={scene,hall,model,createTeaCouple,show(pos,look){camera.position.set(...pos);camera.lookAt(...look);renderer.render(scene,camera);}};
review.show([27.8,2.1,7.1],[25.1,.9,5.5]);
return {frames:9000,minimumSole:minimum,minimumDrum:bounds.min.y,kitDraws:kit.children.filter(m=>m.isMesh).length};
});
console.log(result);mkdirSync('tools/.check',{recursive:true});await page.screenshot({path:'tools/.check/music-piano.png'});
await page.evaluate(()=>{review.model.update(75);review.show([28.6,2.3,13.8],[25.1,.8,10.9]);});await page.screenshot({path:'tools/.check/music-drums.png'});
await page.evaluate(()=>{review.scene.remove(review.hall,review.model.group);review.createTeaCouple(review.scene,{});review.show([-7,13.5,2],[-11,12,-1.5]);});await page.screenshot({path:'tools/.check/tea-people.png'});
} finally {await browser.close();}

