import * as THREE from 'three';

// Shared rounded cuboid: retains the voxel silhouette and instanced rendering,
// but gives faces, tailoring, hands and hair soft edges with continuous normals.
export function softBoxGeometry() {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
  const positions = geometry.attributes.position, normals = geometry.attributes.normal;
  const point = new THREE.Vector3(), core = new THREE.Vector3(), normal = new THREE.Vector3();
  const radius = .16, inner = .5 - radius;
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    core.copy(point).clampScalar(-inner, inner);
    normal.copy(point).sub(core).normalize();
    point.copy(core).addScaledVector(normal, radius);
    positions.setXYZ(i, point.x, point.y, point.z);
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
