// A short surveyed route, stamped waypoints, and unfolding paper on arrival.
// Reuse fixed pools so fast mouse movement cannot grow the animation workload.
export function createAtlasPointerEffects(ctx) {
 const points=Array.from({length:24},()=>({x:0,y:0,t:-Infinity,join:false,mark:false,n:0}));
 const stamps=Array.from({length:3},()=>({x:0,y:0,t:-Infinity}));
 const dash=[5,6];
 let head=0,count=0,stampHead=0,serial=0,px=0,py=0,last=-Infinity,distance=0;
 function reset(){head=count=stampHead=serial=0;last=-Infinity;distance=0;for(const p of points)p.t=-Infinity;for(const s of stamps)s.t=-Infinity;}
 function move(x,y,now){
  const step=Math.hypot(x-px,y-py),join=now-last<180&&step<140;
  if(join&&step<12)return;
  distance=join?distance+step:60;
  const p=points[head];p.x=x+15;p.y=y+19;p.t=now;p.join=join;p.mark=distance>=58;
  if(p.mark){p.n=++serial;distance=0;}
  head=(head+1)%points.length;count=Math.min(count+1,points.length);px=x;py=y;last=now;
 }
 function click(x,y,now){const s=stamps[stampHead];s.x=x+24;s.y=y+30;s.t=now;stampHead=(stampHead+1)%stamps.length;}
 function draw(now){
  ctx.save();ctx.shadowBlur=0;ctx.lineCap='round';ctx.lineJoin='round';
  let previous=null;
  for(let i=0;i<count;i++){
   const p=points[(head-count+i+points.length)%points.length],age=now-p.t;
   if(age>880){previous=null;continue;}
   const alpha=Math.min(1,age/65)*Math.min(1,(880-age)/360);
   if(previous&&p.join){
    ctx.globalAlpha=alpha*.8;ctx.beginPath();ctx.moveTo(previous.x,previous.y);
    // A tiny right-angle survey elbow gives the trail its own visual language.
    ctx.lineTo(p.x,previous.y);ctx.lineTo(p.x,p.y);
    ctx.setLineDash([]);ctx.strokeStyle='#fff4d7';ctx.lineWidth=4;ctx.stroke();
    ctx.setLineDash(dash);ctx.lineDashOffset=-(now-p.t)*.012;
    ctx.strokeStyle='#16796e';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
   }
   if(p.mark){
    const rise=Math.max(0,1-age/160)*5;
    ctx.save();ctx.translate(p.x,p.y-rise);ctx.globalAlpha=alpha;
    ctx.fillStyle='#f1c578';ctx.strokeStyle='#23534f';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(4,0);ctx.lineTo(0,4);ctx.lineTo(-4,0);ctx.closePath();ctx.fill();ctx.stroke();
    if(p.n%3===1){
     ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,-20);ctx.stroke();
     ctx.fillStyle='#fff1ce';ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(22,-20);ctx.lineTo(18,-14);ctx.lineTo(0,-14);ctx.closePath();ctx.fill();ctx.stroke();
     ctx.fillStyle='#23534f';ctx.font='bold 8px monospace';ctx.textBaseline='middle';ctx.fillText(String(p.n%100).padStart(2,'0'),3,-16);
    }
    ctx.restore();
   }
   previous=p;
  }
  for(const s of stamps){
   const age=now-s.t;if(age<0||age>950)continue;
   const opening=1-Math.pow(1-Math.min(1,age/260),3),w=5+opening*13;
   ctx.save();ctx.translate(s.x,s.y-Math.min(age/100,5));
   ctx.globalAlpha=Math.min(1,age/70)*Math.min(1,(950-age)/300);ctx.lineWidth=1.5;
   for(let panel=0;panel<3;panel++){
    const left=(panel-1.5)*w,fold=panel%2?4:-4;
    ctx.fillStyle=panel===1?'#8dd7c1':'#fff0cf';ctx.strokeStyle='#23534f';
    ctx.beginPath();ctx.moveTo(left,fold);ctx.lineTo(left+w,-fold);ctx.lineTo(left+w,23-fold);ctx.lineTo(left,23+fold);ctx.closePath();ctx.fill();ctx.stroke();
   }
   ctx.strokeStyle='#16796e';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.beginPath();
   ctx.moveTo(-w,14);ctx.lineTo(-w*.4,9);ctx.lineTo(w*.25,15);ctx.lineTo(w,7);ctx.stroke();ctx.setLineDash([]);
   ctx.strokeStyle='#b26332';ctx.beginPath();ctx.moveTo(w-3,4);ctx.lineTo(w+3,10);ctx.moveTo(w+3,4);ctx.lineTo(w-3,10);ctx.stroke();ctx.restore();
  }
  ctx.restore();
 }
 return {reset,move,click,draw};
}
