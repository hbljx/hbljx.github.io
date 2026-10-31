// Pack static printed panels into one atlas per shading mode. Interactive
// bounds remain independent; dynamic screens and non-plane geometry are skipped.
import * as THREE from 'three';
export function atlasPlanes(planes) {
  const groups=new Map(),rest=[];
  for(const mesh of planes){
    const m=mesh.material;
    if(mesh.geometry?.type!=='PlaneGeometry'||!m?.map?.image||m.transparent||m.map.isVideoTexture||(!m.isMeshBasicMaterial&&!m.isMeshLambertMaterial)){rest.push(mesh);continue;}
    const key=m.type;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(mesh);
  }
  for(const meshes of groups.values()){
    if(meshes.length<2){rest.push(...meshes);continue;}
    const size=256,gap=2,cols=Math.min(4,meshes.length),rows=Math.ceil(meshes.length/cols);
    const canvas=document.createElement('canvas');canvas.width=cols*size;canvas.height=rows*size;
    const ctx=canvas.getContext('2d'),positions=[],normals=[],uvs=[];
    const point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
    meshes.forEach((mesh,i)=>{
      const x=i%cols*size,y=Math.floor(i/cols)*size;
      ctx.drawImage(mesh.material.map.image,x+gap,y+gap,size-2*gap,size-2*gap);
      mesh.updateMatrix();normalMatrix.getNormalMatrix(mesh.matrix);
      const g=mesh.geometry,indices=g.index?.array||Array.from({length:g.attributes.position.count},(_,n)=>n);
      for(const j of indices){
        point.fromBufferAttribute(g.attributes.position,j).applyMatrix4(mesh.matrix);positions.push(point.x,point.y,point.z);
        normal.fromBufferAttribute(g.attributes.normal,j).applyNormalMatrix(normalMatrix);normals.push(normal.x,normal.y,normal.z);
        const u=g.attributes.uv.getX(j),v=g.attributes.uv.getY(j);
        uvs.push((x+gap+u*(size-2*gap))/canvas.width,1-(y+gap+(1-v)*(size-2*gap))/canvas.height);
      }
    });
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;
    const material=meshes[0].material.clone();material.map=texture;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();
    const merged=new THREE.Mesh(geometry,material);merged.receiveShadow=meshes[0].receiveShadow;merged.name='navigation-panel-atlas';rest.push(merged);
    for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}
    for(const texture of new Set(meshes.map(m=>m.material.map)))texture.dispose();
  }
  return rest;
}
