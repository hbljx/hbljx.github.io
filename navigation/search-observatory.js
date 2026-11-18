// Projected 3D search sculpture: one canvas, bounded geometry, no WebGL context.
// All optical layers and the native form share one interpolated engine color.
const TAU = Math.PI * 2;
const ENGINES = [
  {id:'baidu', label:'百度', color:[70,240,166]},
  {id:'bing', label:'必应', color:[77,166,255]},
  {id:'google', label:'谷歌', color:[187,130,255]},
  {id:'yuanbao', label:'元宝', color:[255,162,76]},
];
const SEGMENTS = 96;
const CUBE_EDGES = [0,1,1,3,3,2,2,0,4,5,5,7,7,6,6,4,0,4,1,5,2,6,3,7];
function toHSV(color,out) {
  const r=color[0]/255,g=color[1]/255,b=color[2]/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  out[0]=delta===0?0:((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)/6+1)%1;
  out[1]=max===0?0:delta/max;out[2]=max;
  return out;
}
const HUES=ENGINES.map(e=>toHSV(e.color,new Float32Array(3)));

export function mountSearchObservatory(environment) {
  const stage=environment.closest('.hero-stage');
  const canvas=document.createElement('canvas');
  canvas.className='search-observatory';canvas.setAttribute('aria-hidden','true');
  environment.append(canvas);
  const c=canvas.getContext('2d');
  if(!c)return {
    focus(){},input(){},launch(){},visibility(){},stop(){},
    engine(id){const e=ENGINES.find(e=>e.id===id)||ENGINES[0];stage?.style.setProperty('--search-energy','rgb('+e.color.join(',')+')');},
  };
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const shortViewport=matchMedia('(max-height: 580px)');
  const rgb=new Float32Array(ENGINES[0].color),from=new Float32Array(HUES[0]);
  const rings=new Float32Array(3*(SEGMENTS+1)*3);
  const globe=new Float32Array(9*24*3),projected=new Float32Array(globe.length);
  const stars=new Float32Array(56*5),starScreen=new Float32Array(56*3);
  const scanScreen=new Float32Array(2*65*3),satellites=new Float32Array(4*8*3),satelliteCenters=new Float32Array(4*3);
  const crystal=new Float32Array([0,-67,0, 43,0,0, 0,0,43, -43,0,0, 0,0,-43, 0,67,0]);
  const crystalScreen=new Float32Array(crystal.length);
  const faces=[[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]];
  const faceOrder=[0,1,2,3,4,5,6,7],faceDepth=new Float32Array(8);
  const sortFaces=(a,b)=>faceDepth[b]-faceDepth[a];
  const scratch=new Float32Array(9);
  // Fixed seeds prevent flicker, random allocation and particle growth.
  for(let i=0;i<56;i++) {
    const o=i*5;
    stars[o]=i*2.399963;stars[o+1]=164+(i*37%83);
    stars[o+2]=(i*53%150)-75;stars[o+3]=.5+(i%5)*.25;stars[o+4]=i%4;
  }
  for(let row=0;row<9;row++)for(let col=0;col<24;col++) {
    const lat=(row-4)*Math.PI/10,lon=col*TAU/24,o=(row*24+col)*3;
    globe[o]=Math.cos(lat)*104*Math.cos(lon);globe[o+1]=Math.sin(lat)*104;globe[o+2]=Math.cos(lat)*104*Math.sin(lon);
  }
  let selected=0,count=0,focused=false,hovered=false,visible=true;
  let raf=0,last=0,time=0,scale=1,cssUnit=1,compact=false,miniature=false;
  let mix=1,wake=.18,impulse=0,switchPulse=0,launchPulse=0,hoverGlow=0;
  let pointerX=0,pointerY=0,tiltX=0,tiltY=0,yawCos=1,yawSin=0,pitchCos=1,pitchSin=0;
  let ink='',light='',aura,coreGlow,well,glass;
  let captionText='',captionFont='',captionWidth=0,captionAge=0,captionSheen;

  function blendColor(progress) {
    const target=HUES[selected],distance=((target[0]-from[0]+1.5)%1)-.5;
    const hue=(from[0]+distance*progress+1)%1;
    const saturation=from[1]+(target[1]-from[1])*progress,value=from[2]+(target[2]-from[2])*progress;
    // Shortest hue arc preserves neon saturation, including orange/blue changes.
    for(let i=0;i<3;i++) {
      const k=((i===0?5:i===1?3:1)+hue*6)%6;
      rgb[i]=255*value*(1-saturation*Math.max(0,Math.min(k,4-k,1)));
    }
    if(progress===1)rgb.set(ENGINES[selected].color);
    syncColor();
  }

  function syncColor() {
    const next='rgb('+Math.round(rgb[0])+','+Math.round(rgb[1])+','+Math.round(rgb[2])+')';
    if(next===ink)return;
    ink=next;light='rgb('+Math.round(190+rgb[0]*.25)+','+Math.round(190+rgb[1]*.25)+','+Math.round(190+rgb[2]*.25)+')';
    stage?.style.setProperty('--search-energy',ink);
    // Rebuild gradients only when the quantized theme color changes.
    const tone=alpha=>'rgba('+Math.round(rgb[0])+','+Math.round(rgb[1])+','+Math.round(rgb[2])+','+alpha+')';
    aura=c.createRadialGradient(320,243,25,320,243,252);
    aura.addColorStop(0,tone(.13));aura.addColorStop(.6,tone(.045));aura.addColorStop(1,tone(0));
    coreGlow=c.createRadialGradient(320,240,0,320,240,80);
    coreGlow.addColorStop(0,'#ffffff');coreGlow.addColorStop(.035,light);coreGlow.addColorStop(.09,tone(.8));coreGlow.addColorStop(.35,tone(.12));coreGlow.addColorStop(1,tone(0));
    glass=c.createLinearGradient(270,170,366,310);
    glass.addColorStop(0,tone(.58));glass.addColorStop(.42,tone(.04));glass.addColorStop(.5,tone(.32));glass.addColorStop(1,tone(.08));
  }
  function stroke(alpha=1,width=1,tint=ink) {
    c.globalAlpha=alpha;c.strokeStyle=tint;c.lineWidth=Math.max(width*1.2,cssUnit*.9);c.stroke();c.globalAlpha=1;
  }
  function neon(alpha=1,width=1.4) {
    stroke(alpha*.075,width+10);stroke(alpha*.16,width+4);stroke(alpha,width);stroke(alpha*.65,Math.max(.9,width*.3),light);
  }
  function dot(x,y,r,alpha=1,tint=ink) {
    c.beginPath();c.arc(x,y,Math.max(.5,r),0,TAU);c.globalAlpha=alpha;c.fillStyle=tint;c.fill();c.globalAlpha=1;
  }
  function glint(x,y,r,alpha=1) {
    c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r,y);c.moveTo(x,y-r);c.lineTo(x,y+r);stroke(alpha,.8,light);dot(x,y,1.2,alpha,light);
  }
  // Perspective projection retains z for back/front occlusion.
  function project(x,y,z,out,o=0) {
    const rx=x*yawCos+z*yawSin,rz=z*yawCos-x*yawSin;
    const ry=y*pitchCos-rz*pitchSin,depth=y*pitchSin+rz*pitchCos,f=680/(680+depth);
    out[o]=320+rx*f;out[o+1]=240+ry*f;out[o+2]=depth;
  }
  function geometry() {
    const yaw=tiltX*.2+time*.07,pitch=-.13+tiltY*.13;
    yawCos=Math.cos(yaw);yawSin=Math.sin(yaw);pitchCos=Math.cos(pitch);pitchSin=Math.sin(pitch);
    for(let lane=0;lane<3;lane++) {
      const roll=lane===0?-.32:lane===1?.93:-1.08,tilt=lane===0?.34:lane===1?.57:.65,radius=lane===0?188:lane===1?167:151;
      const cr=Math.cos(roll),sr=Math.sin(roll),depth=Math.sqrt(1-tilt*tilt);
      for(let i=0;i<=SEGMENTS;i++) {
        const a=i/SEGMENTS*TAU,x=Math.cos(a)*radius,y=Math.sin(a)*radius*tilt,z=Math.sin(a)*radius*depth;
        project(x*cr-y*sr,x*sr+y*cr,z,rings,(lane*(SEGMENTS+1)+i)*3);
      }
    }
    const spin=time*.15,cy=Math.cos(spin),sy=Math.sin(spin);
    for(let i=0;i<globe.length;i+=3)project(globe[i]*cy+globe[i+2]*sy,globe[i+1],globe[i+2]*cy-globe[i]*sy,projected,i);
    for(let i=0;i<56;i++) {
      const j=i*5,a=stars[j]+time*(i%2?.055:-.04),r=stars[j+1];
      project(Math.cos(a)*r,stars[j+2]+Math.sin(a*2+time*.3)*15,Math.sin(a)*r,starScreen,i*3);
    }
    for(let i=0;i<crystal.length;i+=3)project(crystal[i]*cy-crystal[i+2]*sy,crystal[i+1]+Math.sin(time*.8)*4,crystal[i+2]*cy+crystal[i]*sy,crystalScreen,i);
    // A latitude band scans the globe, with a second, fading rail behind it.
    for(let band=0;band<2;band++) {
      const y=Math.sin(time*.45)*74-band*9,r=Math.sqrt(104*104-y*y);
      for(let i=0;i<=64;i++) {
        const a=i*TAU/64;project(Math.cos(a)*r,y,Math.sin(a)*r,scanScreen,(band*65+i)*3);
      }
    }
    const spinCos=Math.cos(time*.35+.4),spinSin=Math.sin(time*.35+.4);
    for(let i=0;i<(compact?2:4);i++) {
      const a=i*TAU/4+time*.055+.5,x=Math.cos(a)*215,y=Math.sin(a*2)*86,z=Math.sin(a)*175;
      project(x,y,z,satelliteCenters,i*3);
      for(let vertex=0;vertex<8;vertex++) {
        const vx=(vertex&1?1:-1)*7,vy=(vertex&2?1:-1)*9,vz=(vertex&4?1:-1)*7;
        project(x+vx*spinCos-vz*spinSin,y+vy,z+vz*spinCos+vx*spinSin,satellites,(i*8+vertex)*3);
      }
    }
  }
  function orbitalRibbons(front) {
    for(let lane=0;lane<3;lane++) {
      const base=lane*(SEGMENTS+1)*3;c.beginPath();
      for(let i=0;i<SEGMENTS;i++) {
        const p=base+i*3,q=p+3;
        if((rings[p+2]+rings[q+2]<=0)!==front)continue;
        c.moveTo(rings[p],rings[p+1]);c.lineTo(rings[q],rings[q+1]);
      }
      // A broad luminous contour and a fine inner rail keep the orbit readable.
      if(front)neon(.78,3.2);else stroke(.24,1.6);
      c.beginPath();
      for(let i=0;i<SEGMENTS;i++) {
        const p=base+i*3,q=p+3;
        if((rings[p+2]+rings[q+2]<=0)!==front||i%6===5)continue;
        c.moveTo(320+(rings[p]-320)*.958,240+(rings[p+1]-240)*.958);
        c.lineTo(320+(rings[q]-320)*.958,240+(rings[q+1]-240)*.958);
        if(i%8===0){c.lineTo(rings[q],rings[q+1]);}
      }
      stroke(front?.37:.1,1);
      const head=((time*(lane===1?-.085:.065)+lane*.31)%1+1)%1;
      // Paired comets travel along each rail with tapered luminous wakes.
      for(let comet=0;comet<2;comet++)for(let tail=0;tail<16;tail++) {
        const i=(Math.floor(head*SEGMENTS)+comet*48-tail+SEGMENTS)%SEGMENTS,p=base+i*3,q=p+3;
        if((rings[p+2]+rings[q+2]<=0)!==front)continue;
        const alpha=(1-tail/16)*(front?.95:.35);
        c.beginPath();c.moveTo(rings[p],rings[p+1]);c.lineTo(rings[q],rings[q+1]);stroke(alpha*.12,9);stroke(alpha,3.6-tail*.13);
      }
      for(let comet=0;comet<2;comet++) {
        const h=base+((Math.floor(head*SEGMENTS)+comet*48)%SEGMENTS)*3;
        if((rings[h+2]<=0)===front) {
          dot(rings[h],rings[h+1],10,.12);dot(rings[h],rings[h+1],3.4,front?1:.45,light);
          if(front)glint(rings[h],rings[h+1],7,.85);
        }
      }
      for(let i=8;i<SEGMENTS;i+=24) {
        const p=base+i*3;
        if((rings[p+2]<=0)!==front)continue;
        c.save();c.translate(rings[p],rings[p+1]);c.rotate(Math.atan2(rings[p+4]-rings[p+1],rings[p+3]-rings[p]));
        c.fillStyle='#102b36';c.fillRect(-6,-4,12,8);c.beginPath();c.rect(-6,-4,12,8);stroke(front?.9:.3,1.3);
        c.beginPath();c.moveTo(-2,-2);c.lineTo(2,2);stroke(front?.8:.2,1,light);c.restore();
      }
    }
  }
  function starfield(front) {
    const total=compact?32:56;
    for(let i=0;i<total;i++) {
      const p=i*3,j=i*5;if((starScreen[p+2]<=0)!==front)continue;
      const x=starScreen[p],y=starScreen[p+1],depth=680/(680+starScreen[p+2]);
      const alpha=(front?.7:.22)*(.7+.3*Math.sin(time*.7+i))+.14*hoverGlow,size=stars[j+3]*depth;
      if(stars[j+4]===2) {
        const direction=i%2?.055:-.04,a=stars[j]+time*direction-direction*2,r=stars[j+1];
        project(Math.cos(a)*r,stars[j+2]+Math.sin(a*2+time*.3)*15,Math.sin(a)*r,scratch);
        c.beginPath();c.moveTo(scratch[0],scratch[1]);c.lineTo(x,y);stroke(alpha*.32,1.15);
      }
      if(stars[j+4]===0) {
        const r=size*3;
        c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.6,y);c.lineTo(x,y+r);c.lineTo(x-r*.6,y);c.closePath();
        c.fillStyle=ink;c.globalAlpha=alpha*.25;c.fill();c.globalAlpha=1;stroke(alpha,.8);
        c.beginPath();c.moveTo(x,y-r);c.lineTo(x,y+r);stroke(alpha,.8,light);
      } else if(stars[j+4]===1)glint(x,y,size*2,alpha);
      else {dot(x,y,size,alpha);dot(x,y,size*3,alpha*.08);}
      if(i%7===0) {
        const q=((i+7)%total)*3;
        if(Math.hypot(x-starScreen[q],y-starScreen[q+1])<110) {
          c.beginPath();c.moveTo(x,y);c.lineTo(starScreen[q],starScreen[q+1]);stroke(alpha*.25,.65);
        }
      }
    }
  }
  function lattice(front) {
    c.beginPath();
    for(let row=0;row<9;row++)for(let col=0;col<24;col++) {
      const p=(row*24+col)*3,q=(row*24+(col+1)%24)*3;
      if((projected[p+2]<=0)!==front)continue;
      c.moveTo(projected[p],projected[p+1]);c.lineTo(projected[q],projected[q+1]);
      if(row<8&&col%2===0){c.moveTo(projected[p],projected[p+1]);c.lineTo(projected[p+72],projected[p+73]);}
    }
    stroke(front?.24+wake*.1:.09,1.1);
    for(let i=0;i<projected.length;i+=12)if((projected[i+2]<=0)===front)dot(projected[i],projected[i+1],front?1.35:.8,front?.55:.14);
  }
  function scanningBand(front) {
    for(let band=1;band>=0;band--) {
      const base=band*65*3;c.beginPath();
      for(let i=0;i<64;i++) {
        const p=base+i*3;
        if((scanScreen[p+2]+scanScreen[p+5]<=0)!==front)continue;
        c.moveTo(scanScreen[p],scanScreen[p+1]);c.lineTo(scanScreen[p+3],scanScreen[p+4]);
      }
      if(band===0&&front)neon(.45+wake*.2,1.8);else stroke(front?.18:.1,1);
    }
    const index=Math.floor(((time*.09)%1)*64)*3;
    if((scanScreen[index+2]<=0)===front)glint(scanScreen[index],scanScreen[index+1],5,front?.85:.25);
  }
  function satelliteCubes(front) {
    for(let i=0;i<(compact?2:4);i++) {
      if((satelliteCenters[i*3+2]<=0)!==front)continue;
      const base=i*24;c.beginPath();
      for(let edge=0;edge<CUBE_EDGES.length;edge+=2) {
        const a=base+CUBE_EDGES[edge]*3,b=base+CUBE_EDGES[edge+1]*3;
        c.moveTo(satellites[a],satellites[a+1]);c.lineTo(satellites[b],satellites[b+1]);
      }
      stroke(front?.76:.25,1.3);
      const x=satelliteCenters[i*3],y=satelliteCenters[i*3+1];
      dot(x,y,6,front?.12:.04);dot(x,y,2.2,front?.9:.3,light);
      // Short broken uplinks connect each satellite back to its orbit.
      c.beginPath();c.moveTo(x*.8+64,y*.8+48);c.lineTo(x*.9+32,y*.9+24);stroke(front?.3:.1,1);
    }
  }
  function prism() {
    for(let i=0;i<faces.length;i++) {
      const f=faces[i];faceDepth[i]=crystalScreen[f[0]*3+2]+crystalScreen[f[1]*3+2]+crystalScreen[f[2]*3+2];
    }
    faceOrder.sort(sortFaces);
    for(let i=0;i<8;i++) {
      const f=faces[faceOrder[i]],a=f[0]*3,b=f[1]*3,d=f[2]*3;
      c.beginPath();c.moveTo(crystalScreen[a],crystalScreen[a+1]);c.lineTo(crystalScreen[b],crystalScreen[b+1]);c.lineTo(crystalScreen[d],crystalScreen[d+1]);c.closePath();
      c.fillStyle='#081f2b';c.globalAlpha=.42;c.fill();c.globalAlpha=1;c.fillStyle=glass;c.fill();stroke(.45+i*.055,1.9);
      if(faceDepth[faceOrder[i]]<0) {
        // Inset facet engraving and a slow reflection moving across the glass.
        const cx=(crystalScreen[a]+crystalScreen[b]+crystalScreen[d])/3,cy=(crystalScreen[a+1]+crystalScreen[b+1]+crystalScreen[d+1])/3;
        c.beginPath();c.moveTo(cx+(crystalScreen[a]-cx)*.72,cy+(crystalScreen[a+1]-cy)*.72);
        c.lineTo(cx+(crystalScreen[b]-cx)*.72,cy+(crystalScreen[b+1]-cy)*.72);c.lineTo(cx+(crystalScreen[d]-cx)*.72,cy+(crystalScreen[d+1]-cy)*.72);c.closePath();stroke(.27,1);
        const sweep=(time*.17+faceOrder[i]*.13)%1;
        c.beginPath();c.moveTo(crystalScreen[a]+(crystalScreen[b]-crystalScreen[a])*sweep,crystalScreen[a+1]+(crystalScreen[b+1]-crystalScreen[a+1])*sweep);
        c.lineTo(crystalScreen[a]+(crystalScreen[d]-crystalScreen[a])*sweep,crystalScreen[a+1]+(crystalScreen[d+1]-crystalScreen[a+1])*sweep);stroke(Math.sin(sweep*Math.PI)*.55,1.1,light);
      }
    }
    for(let i=0;i<crystalScreen.length;i+=3)dot(crystalScreen[i],crystalScreen[i+1],2.5,.85,light);
    c.fillStyle=coreGlow;c.globalAlpha=.8+wake*.2;c.fillRect(240,160,160,160);c.globalAlpha=1;
    c.beginPath();c.arc(317,235,10,0,TAU);c.moveTo(324,242);c.lineTo(333,251);stroke(.9,2.6,light);
    glint(crystalScreen[0],crystalScreen[1],6+impulse*4,.95);
  }
  function pedestal() {
    c.save();c.translate(320,408);
    c.beginPath();c.ellipse(0,8,130,27,0,0,TAU);stroke(.22,1.6);
    c.beginPath();c.ellipse(0,0,150,31,0,0,TAU);neon(.55,2.3);
    c.beginPath();c.ellipse(0,-5,117,22,0,0,TAU);stroke(.35,1.3);
    for(let i=0;i<3;i++) {
      const a=time*.18+i*TAU/3;c.beginPath();c.ellipse(0,0,150,31,0,a,a+.48);neon(.85,2.8);
    }
    c.beginPath();
    for(let i=0;i<=6;i++) {
      const a=i*TAU/6+time*.1,x=Math.cos(a)*31,y=Math.sin(a)*8-4;
      if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    stroke(.45,1.4);dot(0,-4,3,.7,light);
    for(let i=0;i<8;i++) {
      const phase=(time*.19+i/8)%1,x=Math.cos(i*TAU/8)*72,y=-phase*82;
      c.beginPath();c.moveTo(x,y);c.lineTo(x,y-6);stroke(Math.sin(phase*Math.PI)*.28,1.2);
    }
    c.beginPath();c.moveTo(-76,-5);c.lineTo(-38,-104);c.moveTo(76,-5);c.lineTo(38,-104);stroke(.12,.8);
    c.beginPath();c.moveTo(0,0);c.lineTo(0,-73);stroke(.13,.8);
    for(let i=0;i<16;i++) {
      const a=i*TAU/16;c.beginPath();c.moveTo(Math.cos(a)*156,Math.sin(a)*33);c.lineTo(Math.cos(a)*161,Math.sin(a)*35);stroke(.35,.8);
    }
    c.restore();
  }
  function pulses() {
    const strength=Math.max(switchPulse,launchPulse,impulse*.6);
    if(strength<.01||reduced.matches)return;
    const progress=1-strength;
    for(let i=0;i<2;i++) {
      const r=98+progress*115+i*15;c.beginPath();c.ellipse(320,240,r,r*.69,-.3,0,TAU);stroke(strength*(1-strength)*1.8/(i+1),2.2);
    }
    // Input converges inward; submit emits a bounded set of outward rays.
    for(let i=0;i<(compact?8:12);i++) {
      const a=i*TAU/(compact?8:12)+.2,r=launchPulse>0?110+progress*105:204-progress*96;
      project(Math.cos(a)*r,Math.sin(a)*r*.7,Math.sin(a)*55,scratch);
      project(Math.cos(a)*(r-13),Math.sin(a)*(r-13)*.7,Math.sin(a)*55,scratch,3);
      c.beginPath();c.moveTo(scratch[3],scratch[4]);c.lineTo(scratch[0],scratch[1]);stroke(strength*.75,2);dot(scratch[0],scratch[1],2.8,strength,light);
    }
  }
  function markings() {
    c.beginPath();c.moveTo(104,130);c.lineTo(104,105);c.lineTo(129,105);c.moveTo(511,105);c.lineTo(536,105);c.lineTo(536,130);
    c.moveTo(104,340);c.lineTo(104,365);c.lineTo(129,365);c.moveTo(511,365);c.lineTo(536,365);c.lineTo(536,340);stroke(.45,1.7);
    if(!miniature)for(let side=0;side<2;side++) {
      const x=side?536:104,dir=side?-1:1;
      for(let i=0;i<8;i++) {
        c.beginPath();c.moveTo(x,146+i*5);c.lineTo(x+dir*(i%3===0?10:5),146+i*5);stroke(.25+i*.035,1);
      }
      c.beginPath();c.moveTo(x,300);c.lineTo(x+dir*20,300);c.lineTo(x+dir*34,286);stroke(.4,1.2);
      dot(x+dir*34,286,3,.8);dot(x+dir*34,286,8,.09);
    }
    for(let i=0;i<5;i++) {
      c.beginPath();c.moveTo(89,212+i*12);c.lineTo(i===2?99:94,212+i*12);
      c.moveTo(546,212+i*12);c.lineTo(i===2?556:551,212+i*12);stroke(i===2?.65:.24,.8);
    }
    if(!miniature) {
      c.textAlign='center';c.font='600 '+Math.max(10,10*cssUnit)+'px ui-monospace,Consolas,monospace';
      c.fillStyle=ink;c.globalAlpha=.7;c.fillText('S E A R C H   /   N E X U S',320,48);c.globalAlpha=1;
    }
  }
  function caption() {
    // Compact phones reserve the space below the orb for the page headline.
    if(compact&&shortViewport.matches)return;
    const message=launchPulse>.1?'探索已启程':count?'灵感汇聚中':focused&&!miniature?'输入关键词，连接世界':'搜索就绪';
    const text=ENGINES[selected].label+' · '+message;
    const font='700 '+Math.max(16,13*cssUnit)+'px ui-monospace,Consolas,"Microsoft YaHei",monospace';
    c.font=font;
    if(text!==captionText||font!==captionFont) {
      if(text!==captionText)captionAge=0;
      captionText=text;captionFont=font;captionWidth=c.measureText(text).width;
    }
    if(reduced.matches)captionAge=1.8;
    const reveal=Math.min(1,captionAge/.55),ease=1-Math.pow(1-reveal,3);
    const breath=reduced.matches?0:(.5+.5*Math.sin(time*2.1))*Math.max(wake,hoverGlow);
    const baseline=(miniature?510:488)+(1-ease)*8*cssUnit;
    c.save();c.textAlign='center';c.textBaseline='alphabetic';
    c.globalAlpha=.3+.7*ease;c.fillStyle=light;
    c.shadowColor=ink;c.shadowBlur=reduced.matches?0:(3+breath*4)*scale;
    c.fillText(captionText,320,baseline);c.shadowBlur=0;
    // A cached highlight sweeps only across the glyphs, not the background.
    // Repeat gently while interacting; an idle caption settles after its reveal.
    if(!reduced.matches) {
      const sweep=captionAge<1.8?Math.min(1,captionAge/1.8):(time%4.8)/1.8;
      if(sweep<1) {
        const x=320-captionWidth/2-48+(captionWidth+96)*sweep;
        c.translate(x,0);c.fillStyle=captionSheen;c.globalAlpha=ease*.9;
        c.fillText(captionText,320-x,baseline);
      }
    }
    c.restore();
    if(!miniature) {
      for(let i=0;i<19;i++) {
        const h=2+(1+Math.sin(i*.8+time*1.6))*(2+wake*3+impulse*7);
        c.globalAlpha=.3+(i%3)*.16;c.fillStyle=ink;c.fillRect(274+i*5,510-h,2,h);
      }
      c.globalAlpha=1;
    }
  }
  function draw() {
    if(!canvas.width||!well)return;
    c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,640,540);c.lineJoin='round';c.lineCap='round';
    c.fillStyle=well;c.fillRect(0,0,640,540);c.fillStyle=aura;c.fillRect(0,0,640,540);
    geometry();c.save();
    if(miniature){c.translate(320,240);c.scale(1.08,1.08);c.translate(-320,-240);}
    markings();if(!compact||!shortViewport.matches)pedestal();
    starfield(false);satelliteCubes(false);orbitalRibbons(false);lattice(false);scanningBand(false);
    prism();lattice(true);scanningBand(true);orbitalRibbons(true);satelliteCubes(true);starfield(true);pulses();
    c.restore();caption();
  }
  function hasMotion() {
    return focused||hovered||(!(compact&&shortViewport.matches)&&captionAge<1.8)||mix<1||hoverGlow>.005||impulse>.005||switchPulse>.005||launchPulse>.005||Math.abs(wake-.18)>.005||Math.abs(tiltX-pointerX)>.002||Math.abs(tiltY-pointerY)>.002;
  }
  function frame(now) {
    raf=0;if(!visible||document.hidden||reduced.matches){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;time+=dt;
    captionAge+=dt;
    const ease=1-Math.exp(-dt*6);
    wake+=((focused?1:.18)-wake)*ease;hoverGlow+=((hovered?1:0)-hoverGlow)*ease;
    tiltX+=(pointerX-tiltX)*ease;tiltY+=(pointerY-tiltY)*ease;
    impulse=Math.max(0,impulse-dt*.8);switchPulse=Math.max(0,switchPulse-dt*.75);launchPulse=Math.max(0,launchPulse-dt*.75);
    if(mix<1) {
      mix=Math.min(1,mix+dt/1.05);
      blendColor(mix*mix*(3-2*mix));
    }
    draw();if(hasMotion())raf=requestAnimationFrame(frame);else last=0;
  }
  function start() {
    if(!visible||document.hidden)return;
    if(reduced.matches){rgb.set(ENGINES[selected].color);mix=1;wake=focused?1:.18;syncColor();draw();return;}
    if(!raf)raf=requestAnimationFrame(frame);
  }
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function inInteractionArea(event) {
    if(event.target.closest?.('.site-search'))return true;
    const rect=canvas.getBoundingClientRect();if(!rect.width)return false;
    const x=(event.clientX-rect.left)*640/rect.width,y=(event.clientY-rect.top)*540/rect.height;
    return Math.hypot(x-320,(y-240)*1.1)<250;
  }
  stage?.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!fine.matches||!visible||reduced.matches)return;
    const next=inInteractionArea(event);
    if(next) {
      const rect=canvas.getBoundingClientRect();
      pointerX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
      pointerY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
    } else pointerX=pointerY=0;
    if(next||next!==hovered){hovered=next;start();}
  },{passive:true});
  function resetPointer(){hovered=false;pointerX=pointerY=0;start();}
  stage?.addEventListener('pointerleave',resetPointer,{passive:true});
  stage?.addEventListener('pointerdown',event=>{if(visible&&!reduced.matches&&inInteractionArea(event)){impulse=1;start();}},{passive:true});
  fine.addEventListener('change',resetPointer);
  function resize() {
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    compact=matchMedia('(max-width: 700px)').matches;miniature=rect.width<280;cssUnit=640/Math.max(rect.width,1);
    canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);scale=canvas.width/640;
    well=c.createRadialGradient(320,246,45,320,246,280);
    well.addColorStop(0,'#04131de0');well.addColorStop(.55,'#061c2799');well.addColorStop(1,'#061c2700');
    captionSheen=c.createLinearGradient(-40,0,40,0);
    captionSheen.addColorStop(0,'#ffffff00');captionSheen.addColorStop(.5,'#ffffff');captionSheen.addColorStop(1,'#ffffff00');
    ink='';syncColor();draw();
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);resize();
  shortViewport.addEventListener('change',resize);
  reduced.addEventListener('change',()=>{
    stop();hovered=false;hoverGlow=impulse=switchPulse=launchPulse=0;pointerX=pointerY=tiltX=tiltY=0;start();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(hasMotion())start();});
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',()=>{if(hasMotion())start();});
  return {
    focus(value){if(value&&!focused)impulse=.65;focused=value;start();},
    input(value,burst=true){count=Array.from(value.trim()).length;if(burst)impulse=1;start();},
    engine(id,animate=true) {
      const index=ENGINES.findIndex(e=>e.id===id);if(index<0)return;
      toHSV(rgb,from);selected=index;canvas.dataset.engine=id;
      if(animate&&!reduced.matches){mix=0;switchPulse=1;start();}
      else {mix=1;rgb.set(ENGINES[selected].color);syncColor();draw();}
    },
    launch(){launchPulse=1;impulse=0;start();},
    visibility(value){visible=value;if(!value){hovered=false;pointerX=pointerY=0;stop();}else start();},
    stop,
  };
}
