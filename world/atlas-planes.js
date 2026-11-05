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
    const size=256,gap=4,tiles=new Map();
    for(const mesh of meshes){
      const map=mesh.material.map;
      if(!tiles.has(map))tiles.set(map,{image:map.image,
        w:map.userData.preserveAtlasResolution?map.image.width:size-4,
        h:map.userData.preserveAtlasResolution?map.image.height:size-4});
    }
    // Shelf-pack text at its source resolution, sharing tiles between the two
    // faces of a sign. Ordinary decorative panels keep their existing budget.
    const entries=[...tiles.values()].sort((a,b)=>b.h-a.h||b.w-a.w);
    const area=entries.reduce((sum,t)=>sum+(t.w+2*gap)*(t.h+2*gap),0);
    const atlasWidth=THREE.MathUtils.ceilPowerOfTwo(Math.max(1024,Math.sqrt(area),...entries.map(t=>t.w+2*gap)));
    let cursorX=0,cursorY=0,rowHeight=0;
    for(const tile of entries){
      if(cursorX+tile.w+2*gap>atlasWidth){cursorX=0;cursorY+=rowHeight;rowHeight=0;}
      tile.x=cursorX+gap;tile.y=cursorY+gap;
      cursorX+=tile.w+2*gap;rowHeight=Math.max(rowHeight,tile.h+2*gap);
    }
    const canvas=document.createElement('canvas');canvas.width=atlasWidth;canvas.height=cursorY+rowHeight;
    const ctx=canvas.getContext('2d'),positions=[],normals=[],uvs=[];
    for(const {image,x,y,w,h}of entries){
      ctx.drawImage(image,x,y,w,h);
      // Extend edge pixels into the gutter so filtering cannot darken borders.
      ctx.drawImage(image,0,0,image.width,1,x,y-gap,w,gap);
      ctx.drawImage(image,0,image.height-1,image.width,1,x,y+h,w,gap);
      ctx.drawImage(image,0,0,1,image.height,x-gap,y,gap,h);
      ctx.drawImage(image,image.width-1,0,1,image.height,x+w,y,gap,h);
      for(const [sx,dx]of [[0,x-gap],[image.width-1,x+w]])for(const [sy,dy]of [[0,y-gap],[image.height-1,y+h]])ctx.drawImage(image,sx,sy,1,1,dx,dy,gap,gap);
    }
    const point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
    meshes.forEach(mesh=>{
      const {x,y,w,h}=tiles.get(mesh.material.map);
      mesh.updateMatrix();normalMatrix.getNormalMatrix(mesh.matrix);
      const g=mesh.geometry,indices=g.index?.array||Array.from({length:g.attributes.position.count},(_,n)=>n);
      for(const j of indices){
        point.fromBufferAttribute(g.attributes.position,j).applyMatrix4(mesh.matrix);positions.push(point.x,point.y,point.z);
        normal.fromBufferAttribute(g.attributes.normal,j).applyNormalMatrix(normalMatrix);normals.push(normal.x,normal.y,normal.z);
        const u=g.attributes.uv.getX(j),v=g.attributes.uv.getY(j);
        uvs.push((x+u*w)/canvas.width,1-(y+(1-v)*h)/canvas.height);
      }
    });
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;
    texture.anisotropy=Math.max(...meshes.map(mesh=>mesh.material.map.anisotropy));
    const material=meshes[0].material.clone();material.map=texture;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();
    const merged=new THREE.Mesh(geometry,material);merged.receiveShadow=meshes[0].receiveShadow;merged.name='navigation-panel-atlas';rest.push(merged);
    for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}
    for(const texture of new Set(meshes.map(m=>m.material.map)))texture.dispose();
  }
  return rest;
}
