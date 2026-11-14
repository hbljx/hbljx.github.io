import * as THREE from 'three';

export const TUNNEL_RADIUS=5.6, TUNNEL_SILL=.4;
export const tunnelCeiling=side=>TUNNEL_SILL+Math.sqrt(Math.max(0,TUNNEL_RADIUS**2-side**2));

// One semicircle closes every section, including curves and both ramps.
export function createTunnelGlazing(path){
  const sides = 24;
  const cross=Array.from({length:sides+1},(_,i)=>{const a=Math.PI-i*Math.PI/sides;return [Math.cos(a)*TUNNEL_RADIUS,TUNNEL_SILL+Math.sin(a)*TUNNEL_RADIUS];});
  const positions=[],indices=[],rings=Math.ceil(path.length/1.25),p={};
  for(let i=0;i<=rings;i++){
    path.sample(path.length*i/rings,p);
    for(const [x,y]of cross)positions.push(p.x+Math.cos(p.heading)*x,p.y+y,p.z-Math.sin(p.heading)*x);
    if(i)for(let j=0;j<cross.length-1;j++){const a=(i-1)*cross.length+j,b=a+cross.length;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  // Clear glass keeps the tunnel dry while letting visitors see the seabed,
  // fish and ocean gardens outside the enclosure.
  const material=new THREE.MeshPhongMaterial({color:0x9edfe2,specular:0xffffff,shininess:110,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
  const shell=new THREE.Mesh(geometry,material);shell.name='undersea-tunnel-glazing';shell.renderOrder=2;
  return {shell,cross};
}

// Remove the sea surface only where the tunnel roof reaches above the water.
export function maskTunnelWater(coast,path){
  const size=1024,bounds={x0:Infinity,z0:Infinity,x1:-Infinity,z1:-Infinity},data=new Uint8Array(size*size),p={},start={},end={};
  // Derive coverage from the current route, including both shore ramps.
  // Fixed map coordinates leave water inside the tube when an entrance moves.
  const border=TUNNEL_RADIUS+1;
  for(const point of path.samples){
    bounds.x0=Math.min(bounds.x0,point.x-border);bounds.x1=Math.max(bounds.x1,point.x+border);
    bounds.z0=Math.min(bounds.z0,point.z-border);bounds.z1=Math.max(bounds.z1,point.z+border);
  }
  path.sample(0,start);path.sample(path.length,end);
  const spanX=bounds.x1-bounds.x0,spanZ=bounds.z1-bounds.z0;
  // Cover the whole texel at the glass boundary, not only its centre. This
  // prevents thin water slivers on curved walls and sloping roof sections.
  const pixel=Math.hypot(spanX/size,spanZ/size),radius=TUNNEL_RADIUS+pixel;
  const waterY=coast.sea.position.y;
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
    const x=bounds.x0+(i+.5)/size*(bounds.x1-bounds.x0),z=bounds.z0+(j+.5)/size*(bounds.z1-bounds.z0);
    path.near(x,z,p);
    let sideDistance=Math.abs(p.side),distance=p.distance,centerlineY=p.y;
    if(!Number.isFinite(distance)){
      const fromStart=Math.hypot(x-start.x,z-start.z),fromEnd=Math.hypot(x-end.x,z-end.z);
      if(Math.min(fromStart,fromEnd)>radius){data[j*size+i]=0;continue;}
      const cap=fromStart<fromEnd?start:end;
      distance=Math.min(fromStart,fromEnd);sideDistance=distance;centerlineY=cap.y;
    }
    if(distance>radius){data[j*size+i]=0;continue;}
    const centerY=centerlineY+TUNNEL_SILL,roofY=centerY+TUNNEL_RADIUS,bottomY=centerY-TUNNEL_RADIUS;
    if(roofY<=waterY){data[j*size+i]=0;continue;}
    const halfWidth=waterY<=bottomY?TUNNEL_RADIUS:Math.sqrt(Math.max(0,TUNNEL_RADIUS**2-(waterY-centerY)**2));
    const coverage=THREE.MathUtils.clamp(.5+(halfWidth-sideDistance)/pixel,0,1);
    data[j*size+i]=Math.round(coverage*255);
  }
  const mask=new THREE.DataTexture(data,size,size,THREE.RedFormat);mask.magFilter=THREE.LinearFilter;mask.minFilter=THREE.LinearFilter;mask.generateMipmaps=false;mask.needsUpdate=true;
  const material=coast.sea.material,compile=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);shader.uniforms.uTunnelDryMask={value:mask};
    shader.uniforms.uTunnelDryBounds={value:new THREE.Vector4(bounds.x0,bounds.z0,spanX,spanZ)};
    shader.fragmentShader='uniform sampler2D uTunnelDryMask;\nuniform vec4 uTunnelDryBounds;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 dryUV=(vOceanXZ-uTunnelDryBounds.xy)/uTunnelDryBounds.zw;\nif(all(greaterThanEqual(dryUV,vec2(0.)))&&all(lessThanEqual(dryUV,vec2(1.)))&&texture2D(uTunnelDryMask,dryUV).r>.5)discard;');
  };
  material.customProgramCacheKey=()=> 'ocean-tunnel-dry-mask-v4';material.needsUpdate=true;coast.sea.renderOrder=1;
  return {mask,bounds,waterY};
}
