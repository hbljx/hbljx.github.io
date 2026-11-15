// A small oak homestead. Static geometry is cached; only smoke, water and fireflies move.
export function mountAboutWorld(section) {
  const slot=section.querySelector('.about-world-slot');
  const figure=section.querySelector('.about-homestead');
  if(!slot || !figure)return;
  const canvas=document.createElement('canvas');canvas.className='about-world';
  canvas.width=600;canvas.height=490;canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','草方块浮岛上的橡木小屋，红瓦屋顶、树木、池塘和暖色灯笼');slot.append(canvas);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const button=figure.querySelector('.homestead-toggle');
  const caption=figure.querySelector('.homestead-time');
  const layers=new Map();
  let night=false,visible=false,frame=0,last=0,painted=0,time=0;
  const project=(x,y,z)=>[300+(x-z)*1.08,244+(x+z)*.54-y];
  const dirt=['#7e6650','#66513c','#4a4030'];
  const oak=['#b29964','#8f7245','#6c5537'];
  const stone=['#8c947e','#697462','#4e5c4d'];
  const leaves=['#8eaa61','#65834c','#44623d'];
  const roof=['#b0774b','#885738','#69432e'];
  function build(dark) {
    const layer=document.createElement('canvas');layer.width=600;layer.height=490;
    const c=layer.getContext('2d');
    let seed=25;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    function polygon(points,color,texture=false) {
      c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=color;c.fill();
      if(texture){c.save();c.clip();const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
        for(let i=0;i<w*h/210;i++){c.fillStyle=i%2?'#e4d4a113':'#17241122';c.fillRect(Math.round(x+random()*w),Math.round(y+random()*h),2+Math.floor(random()*4),2+Math.floor(random()*3));}c.restore();}
    }
    function box(x,y,z,w,h,d,colors,texture=true) {
      const a=x-w/2,b=z-d/2;
      polygon([project(a,y,b+d),project(a+w,y,b+d),project(a+w,y+h,b+d),project(a,y+h,b+d)],colors[1],texture);
      polygon([project(a+w,y,b),project(a+w,y,b+d),project(a+w,y+h,b+d),project(a+w,y+h,b)],colors[2],texture);
      polygon([project(a,y+h,b),project(a+w,y+h,b),project(a+w,y+h,b+d),project(a,y+h,b+d)],colors[0],texture);
    }
    // Soft sky light stays behind crisp square clouds and a stepped silhouette.
    const sky=c.createRadialGradient(310,165,20,310,190,290);sky.addColorStop(0,dark?'#66829119':'#c5c89220');sky.addColorStop(1,'#a4be8a00');c.fillStyle=sky;c.fillRect(0,0,600,490);
    c.fillStyle=dark?'#e7e2bd':'#eddca3';c.fillRect(455,62,28,28);c.fillStyle=dark?'#c0c6ad':'#fff0bb';c.fillRect(459,65,8,8);if(dark){c.fillStyle='#263d36';c.fillRect(466,58,19,21);}
    if(dark){for(let i=0;i<25;i++){c.fillStyle=i%3?'#c7d8be70':'#f2e5b4';c.fillRect(70+Math.floor(random()*450),30+Math.floor(random()*180),i%4?2:3,2);}}
    else{c.fillStyle='#b5c5a61b';for(const [x,y] of [[92,95],[380,123],[170,53]]){c.fillRect(x,y,62,10);c.fillRect(x+13,y-8,32,9);}}
    polygon([[120,393],[300,462],[490,391],[305,337]],'#071b1255');
    const tiles=[];
    for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(x*x+z*z<23)tiles.push({x,z});
    tiles.sort((a,b)=>a.x+a.z-b.x-b.z);
    for(const {x,z} of tiles){const h=35+Math.floor(random()*3)*7;box(x*25,-h,z*25,25,h-6,25,dirt);box(x*25,-6,z*25,25,6,25,[(x+z)%3?'#7f9c56':'#92aa62','#5a783d','#426238']);
      if(x+z>4 && (x+z)%2===0)box(x*25,-h+8,z*25+.1,25,5,25,['#7b8070','#696d5b','#4f5748']);}
    // Pond tiles and the stone path are laid on the grass before trees and buildings.
    for(const [x,z] of [[50,50],[75,50],[50,75],[75,75]]){box(x,1,z,24,2,24,['#5d9391','#416c6d','#386062'],false);}
    for(const [x,z] of [[-25,50],[-25,75],[0,75],[25,75]])box(x,1,z,22,3,21,stone);
    const models=[];
    function tree(x,z,size){models.push({depth:x+z,draw(){box(x,0,z,9,49*size,9,oak);for(let i=0;i<3;i++){box(x+(i%2?4:-2),36*size+i*15,z,44*size-i*8,20,40*size-i*7,leaves);}box(x-10,44*size,z+16,16,16,18,['#a1b770','#728f51','#4b6c40']);}});}
    tree(-89,-24,.9);tree(48,-73,1.13);tree(91,-7,.85);
    models.push({depth:-23,draw(){
      box(-25,0,-8,87,9,73,stone);
      for(let i=0;i<7;i++)box(-25,9+i*8,-8,79,7.7,65,oak);
      for(const x of [-61,11])for(const z of [-37,21])box(x,8,z,8,60,8,['#9c8453','#695132','#4d3f2b']);
      // Recessed door and cross-barred window, on the two visible walls.
      box(-39,9,25.5,18,35,1.8,['#ab8852','#4f432d','#50472f']);box(-39,30,27,12,10,1,['#d7c994',dark?'#ffdb8c':'#b4be8c','#aa9c66'],false);
      box(-33,23,28,2,3,2,['#d6bc71','#c7ad65','#8a7349'],false);
      box(-8,28,26,24,22,2,['#e0ce9a',dark?'#f9d48b':'#b7c49b','#8d7c51'],false);
      box(-8,27,28,3,25,3,oak,false);box(-8,37,28,27,3,3,oak,false);box(-8,25,28,29,3,5,oak,false);
      box(16,29,-9,2,21,23,['#e9cf90','#e9cb89',dark?'#edbd70':'#a9b795'],false);
      box(18,28,-9,3,24,3,oak,false);box(18,38,-9,3,3,26,oak,false);
      // Staggered roof courses have individual seams and weathered tile highlights.
      for(let i=0;i<5;i++){const w=94-i*15;box(-25,65+i*8,-8,w,8,83,roof);for(let z=-43;z<31;z+=12)box(-25,72+i*8,z,w,1.5,1.2,['#c18e5d','#99623e','#825434'],false);}
      box(0,93,-29,14,30,14,stone);box(0,121,-29,18,5,18,stone);box(0,126,-29,10,.5,10,['#26362c','#26362c','#26362c'],false);
      box(-39,3,35,26,5,13,stone);
      // Planter beneath the window: soil, small stems and individual flowers.
      box(-8,16,33,27,7,9,['#7b5838','#705133','#4c402a']);for(let x=-17;x<3;x+=7){box(x,23,33,2,8,2,leaves,false);box(x,29,33,5,3,5,['#dfb877','#c48e5d','#9d6d4c'],false);}
    }});
    // Low oak railings and a lantern along the edge of the path.
    models.push({depth:83,draw(){for(const x of [-76,-51,-26])box(x,0,91,5,24,5,oak);box(-51,10,91,56,4,4,oak);box(-51,20,91,56,4,4,oak);}});
    models.push({depth:55,draw(){box(8,0,47,5,40,5,oak);box(13,39,47,15,4,5,oak);box(19,27,47,11,12,11,['#a18d60',dark?'#f3c573':'#cfb575',dark?'#ca9547':'#9e8851'],false);box(19,39,47,13,3,13,stone,false);box(19,25,47,13,3,13,stone,false);}});
    models.sort((a,b)=>a.depth-b.depth).forEach(m=>m.draw());
    // Small grass tufts and mushrooms complete the open foreground.
    for(const [x,z] of [[-85,46],[-63,66],[-5,100],[94,27],[28,95]]){box(x,1,z,2,9,2,leaves,false);box(x+4,1,z+1,2,5,2,leaves,false);}
    for(const [x,z] of [[-65,48],[21,100]]){box(x,1,z,3,6,3,['#d9c8a3','#c1ad8c','#a49473'],false);box(x,6,z,9,4,9,['#b97558','#945743','#704535']);}
    // The natural palette remains readable at night, with localized warm pools of light.
    if(dark){c.globalCompositeOperation='source-atop';c.fillStyle='#102b3a48';c.fillRect(0,105,600,330);c.globalCompositeOperation='source-over';
      for(const [x,y,z,r] of [[-8,38,28,44],[19,32,47,42],[18,38,-9,29]]){const p=project(x,y,z),g=c.createRadialGradient(p[0],p[1],2,p[0],p[1],r);g.addColorStop(0,'#ffda8d55');g.addColorStop(1,'#ffca7000');c.fillStyle=g;c.fillRect(p[0]-r,p[1]-r,r*2,r*2);}}
    // A little field label anchors the floating island without a sci-fi ring.
    c.fillStyle='#102019';c.fillRect(234,441,132,23);c.strokeStyle='#77815b';c.strokeRect(234.5,441.5,132,23);c.fillStyle='#bdc69d';c.font='9px Consolas,monospace';c.textAlign='center';c.fillText('LI+ / HOME SWEET HOME',300,456);
    return layer;
  }
  const chimney=project(0,130,-29),water=project(64,5,66);
  function draw(){
    if(!layers.has(night))layers.set(night,build(night));
    ctx.clearRect(0,0,600,490);ctx.drawImage(layers.get(night),0,0);
    for(let i=0;i<5;i++){
      const age=(time*.15+i/5)%1,size=4+age*8;
      ctx.globalAlpha=(1-age)*.25;ctx.fillStyle=night?'#d5cbb1':'#c9d1b9';ctx.fillRect(Math.round(chimney[0]+Math.sin(age*5)*9),Math.round(chimney[1]-age*65),size,size);
    }
    for(let i=0;i<4;i++){
      ctx.globalAlpha=.3+Math.sin(time*1.4+i)*.14;ctx.fillStyle=night?'#9dbbbb':'#c9dfc3';ctx.fillRect(Math.round(water[0]-20+i*11),Math.round(water[1]+i%2*5),8,1);
    }
    if(night)for(let i=0;i<7;i++){
      ctx.globalAlpha=Math.max(0,Math.sin(time*.8+i*1.7))*.8;ctx.fillStyle='#e7d99a';ctx.fillRect(Math.round(155+i*43+Math.sin(time*.3+i)*8),Math.round(245+(i*37)%100+Math.cos(time*.6+i)*9),2,2);
    }
    ctx.globalAlpha=1;
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;painted=0;}
  function tick(now){
    frame=0;if(!visible||document.hidden||reduced.matches)return;
    if(last)time+=Math.min((now-last)/1000,.08);last=now;
    if(now-painted>=33){draw();painted=now;}
    frame=requestAnimationFrame(tick);
  }
  function start(){if(!visible||document.hidden)return;draw();if(!reduced.matches&&!frame)frame=requestAnimationFrame(tick);}
  button.addEventListener('click',()=>{
    night=!night;figure.dataset.time=night?'night':'day';button.setAttribute('aria-pressed',String(night));
    button.setAttribute('aria-label',night?'切换微缩家园的日景':'切换微缩家园的夜景');
    button.querySelector('.homestead-toggle-label').textContent=night?'迎接日光':'点亮夜晚';
    caption.textContent=night?'灯亮了，小岛还醒着。':'日光下，慢慢建造。';draw();
  });
  new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible)start();else stop();}).observe(canvas);
  reduced.addEventListener('change',()=>{stop();time=0;start();});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',start);
  draw();
}
