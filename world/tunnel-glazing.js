import * as THREE from 'three';

export const TUNNEL_RADIUS=5.6, TUNNEL_SILL=.4;
export const tunnelCeiling=side=>TUNNEL_SILL+Math.sqrt(Math.max(0,TUNNEL_RADIUS**2-side**2));

// One semicircle closes every section, including curves and both ramps.
export function createTunnelGlazing(path){
  const cross=Array.from({length:25},(_,i)=>{const a=Math.PI-i*Math.PI/24;return [Math.cos(a)*TUNNEL_RADIUS,TUNNEL_SILL+Math.sin(a)*TUNNEL_RADIUS];});
  const positions=[],indices=[],rings=Math.ceil(path.length/3),p={};
  for(let i=0;i<=rings;i++){
    path.sample(path.length*i/rings,p);
    for(const [x,y]of cross)positions.push(p.x+Math.cos(p.heading)*x,p.y+y,p.z-Math.sin(p.heading)*x);
    if(i)for(let j=0;j<cross.length-1;j++){const a=(i-1)*cross.length+j,b=a+cross.length;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshPhongMaterial({color:0xa6dce0,specular:0x9bd9e3,shininess:85,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
  const shell=new THREE.Mesh(geometry,material);shell.name='undersea-tunnel-glazing';shell.renderOrder=2;
  return {shell,cross};
}

// Clip water only INSIDE the dry tube. Keep the ocean above submerged glass.
export function maskTunnelWater(coast,path){
  const size=512,bounds={x0:20,z0:8,x1:164,z1:186},data=new Uint8Array(size*size),p={};
  const waterY=coast.sea.position.y;
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
    const x=bounds.x0+(i+.5)/size*(bounds.x1-bounds.x0),z=bounds.z0+(j+.5)/size*(bounds.z1-bounds.z0);
    path.near(x,z,p);const h=waterY-p.y;
    data[j*size+i]=p.distance<=TUNNEL_RADIUS+.08&&h>=-.08&&h<=tunnelCeiling(p.side)+.08?255:0;
  }
  const mask=new THREE.DataTexture(data,size,size,THREE.RedFormat);mask.needsUpdate=true;
  const material=coast.sea.material,compile=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);shader.uniforms.uTunnelDryMask={value:mask};
    shader.fragmentShader='uniform sampler2D uTunnelDryMask;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 dryUV=(vOceanXZ-vec2(20.,8.))/vec2(144.,178.);\nif(all(greaterThanEqual(dryUV,vec2(0.)))&&all(lessThanEqual(dryUV,vec2(1.)))&&texture2D(uTunnelDryMask,dryUV).r>.5)discard;');
  };
  material.customProgramCacheKey=()=> 'ocean-tunnel-dry-mask-v1';material.needsUpdate=true;coast.sea.renderOrder=1;
  return {mask,bounds,waterY};
}
