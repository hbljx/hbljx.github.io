import * as THREE from 'three';

// Thin glass boxes draw front/back faces and edge strips on top of their
// frames. A centred two-sided pane has no competing faces at those joints.
export function flattenGlazing(mesh,material){
  if(!mesh.isInstancedMesh||mesh.material!==material)return;
  const old=mesh.geometry,pane=new THREE.PlaneGeometry(1,1),matrix=new THREE.Matrix4();
  const turnX=new THREE.Matrix4().makeRotationY(Math.PI/2),turnY=new THREE.Matrix4().makeRotationX(Math.PI/2);
  for(const name of ['iLayers','iEmissive'])if(old.attributes[name])pane.setAttribute(name,old.attributes[name]);
  for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);const e=matrix.elements;
    const x=Math.hypot(e[0],e[1],e[2]),y=Math.hypot(e[4],e[5],e[6]),z=Math.hypot(e[8],e[9],e[10]);
    if(x<y&&x<z)matrix.multiply(turnX);else if(y<x&&y<z)matrix.multiply(turnY);
    mesh.setMatrixAt(i,matrix);
  }
  mesh.geometry=pane;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();old.dispose();
}

export function flattenBatchGlazing(batch){
  const build=batch.build;
  batch.build=function(materials){
    const meshes=build.call(this,materials);
    for(const mesh of meshes)flattenGlazing(mesh,materials.boxGlass);
    return meshes;
  };
}
