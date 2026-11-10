import * as THREE from 'three';
import { STUDIO_WALL_END } from './layout.js';
import { HOUSE_COLORS as colors } from './house-palette.js';

export const LIBRARY = {
  at: [-21.5, -19.25], male: [-21.5, 0, -20.5], female: [-18.5, 0, -20.5],
  approach: {x:-18.5,y:0,z:-19.25},
};
export const CINEMA = {
  at: [7.4, -19.55], male: [4.15, 0, -22.1], female: [5.85, 0, -22.1],
  approach: { x: 7.4, y: 0, z: -20.15 }, screen: [5, 2.115, -26.04],
};
export const BATH = { male:{x:-10.7,y:0,z:-25.5}, female:{x:-7.2,y:0,z:-25.5}, duration:300000 };

// All fixtures join the existing furniture batches; partitions use their real
// thickness for both walking and flying instead of full-metre glass voxels.
export function buildSharedRooms(B, obstacles, lighting) {
  const wood={tex:'walnut'}, ivory={tex:'paint',tint:colors.ivory}, lavender={tex:'paint',tint:colors.lavender},
    cinemaWall={tex:'paint',tint:colors.cinema}, heather={tex:'paint',tint:colors.heather},
    brass={tex:'paint',tint:0xb5a074}, glass={tex:'glass',glass:true}, green={tex:'paint',tint:0x46675d};
  const walls=[];
  const room={bathWest:-13,shared:-3.2,cinemaEast:11,north:-27.7,south:-18.4,height:3.25,thickness:.16};
  const roomZ=(room.north+room.south)/2,roomDepth=room.south-room.north;
  const cinemaX=(room.shared+room.cinemaEast)/2,cinemaWidth=room.cinemaEast-room.shared;
  const foot=(x,z,w,d)=>obstacles.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,level:0});
  function partition(x,z,w,d,h,look,bottom=0){
    B.box(x,bottom,z,w,h,d,look);
    if(bottom<1.8)foot(x,z,w,d);
    walls.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y0:bottom,y1:bottom+h});
  }
  const darkFrame={tex:'black_metal'};
  function slidingEntrance(x,width,x0,x1,wallFinish){
    const z=room.south,left=x-width/2,right=x+width/2;
    const jambWidth=.09,jambHeight=2.91;
    const wallLeftEnd=left-jambWidth/2,wallRightStart=right+jambWidth/2;
    // Butt the wall segments against the frame and the posts against the
    // lintel, so their visible faces do not overlap.
    partition((x0+wallLeftEnd)/2,z,wallLeftEnd-x0,room.thickness,room.height,wallFinish);
    partition((wallRightStart+x1)/2,z,x1-wallRightStart,room.thickness,room.height,wallFinish);
    for(const dx of [-width/2,width/2]){
      partition(x+dx,z,jambWidth,.2,jambHeight,darkFrame);
    }
    partition(x,z,width+jambWidth,.2,3-jambHeight,darkFrame,jambHeight);
    partition(x,z,width+.09,room.thickness,room.height-3,wallFinish,3);
    // Two top-hung leaves are parked flat against the hall side of the wall,
    // retaining the existing always-open entrances and their full clear width.
    const leafWidth=width/2+.06,leafZ=z+room.thickness/2+.1;
    B.box(x,3.03,leafZ,width*2+.36,.08,.08,darkFrame);
    for(const side of [-1,1]){
      B.box(x+side*(width+.1),3,z+.08,.12,.14,.22,darkFrame);
      const leafX=x+side*(width/2+.04+leafWidth/2);
      partition(leafX,leafZ,leafWidth,.12,2.84,wood,.04);
      for(const dx of [-leafWidth/2+.025,leafWidth/2-.025])
        B.box(leafX+dx,.04,leafZ,.05,2.84,.14,darkFrame);
      for(const y of [.04,2.82])B.box(leafX,y,leafZ,leafWidth,.06,.14,darkFrame);
      for(const dx of [-leafWidth*.3,leafWidth*.3])
        B.box(leafX+dx,2.86,leafZ,.075,.22,.09,darkFrame);
      B.box(leafX-side*(leafWidth/2-.16),1.08,leafZ+.09,.045,.42,.055,brass);
    }
  }
  function glassRoofFrame(x,z,width,depth,y,sharedWest=false){
    for(const dz of [-depth/2,depth/2])B.box(x,y,z+dz,width,.1,.1,darkFrame);
    for(const dx of sharedWest?[width/2]:[-width/2,width/2])B.box(x+dx,y,z,.1,.1,depth,darkFrame);
    B.box(x,y,z,width,.06,.06,darkFrame);
  }
  // Match the lavender studio wall and retain its exact cut edge.
  const endWidth = STUDIO_WALL_END - Math.floor(STUDIO_WALL_END);
  if (endWidth > 0) partition(STUDIO_WALL_END - endWidth / 2, -12.5, endWidth, 1, 4,
    lavender);

  // Library: two banks of actual books, a shared desk and two reading chairs.
  B.box(-20,0,-22.4,10.9,.018,9.4,{tex:'parquet'});
  const bookColors=[0x35585b,0xa16b4a,0xb5a56f,0x71657c,0x6c805e,0xdbc7a1];
  function shelf(x,z,w,yaw=0){
    B.at(x,0,z,yaw,()=>{
      B.box(0,0,0,w,3.15,.42,wood);
      for(let row=0;row<4;row++){
        const y=.21+row*.72;
        B.box(0,y,-.005,w-.14,.055,.5,brass);
        for(let col=0;col<18;col++){
          const bx=-w/2+.2+col*(w-.4)/18, bh=.40+(col%4)*.045;
          B.box(bx,y+.055,.245,(w-.4)/18-.025,bh,.24,{tex:'paint',tint:bookColors[(col+row*2)%bookColors.length]});
          B.box(bx,y+.14,.369,(w-.4)/18-.06,.018,.008,ivory);
        }
      }
      B.box(0,3.16,.13,w,.035,.4,{tex:'paint',tint:0xffdf9d,emissive:1});
    });
    foot(x,z,yaw?.66:w+.1,yaw?w+.1:.66);
  }
  shelf(-20.4,-27.1,8.8);shelf(-25.15,-22.5,6.2,Math.PI/2);
  B.box(-20,.78,-22,5.8,.14,1.45,wood);foot(-20,-22,5.9,1.55);
  for(const x of [-22.45,-17.55]) B.box(x,0,-22,.14,.78,1.1,brass);
  for(const x of [-21.5,-18.5]){
    B.box(x,.48,-20.5,.68,.1,.66,heather);B.box(x,.58,-20.16,.68,.65,.1,heather);
    for(const dx of [-.26,.26])for(const dz of [-.25,.25])B.box(x+dx,0,-20.5+dz,.055,.48,.055,wood);
    foot(x,-20.45,.75,.8);
    B.box(x,.925,-22,.76,.025,.5,green);B.box(x,.95,-22,.71,.035,.46,ivory);
    B.box(x, .985,-22,.025,.012,.46,brass);
    B.box(x+.9,.92,-22.35,.27,.035,.25,brass);B.box(x+.9,.955,-22.35,.035,.48,.035,brass);
    B.box(x+.72,1.41,-22.35,.4,.04,.25,{tex:'paint',tint:0xffe3a1,emissive:1});
  }
  // Bathroom entrance is two metres wide. Its solid screen shields the WC;
  // walk-in showers remain open from the south, without invisible thresholds.
  B.box(-8.1,.005,-23.0,9.6,.02,9.4,{tex:'pool_tile'});
  partition(room.bathWest,roomZ,room.thickness,roomDepth,room.height,lavender);
  partition(room.shared,roomZ,room.thickness,roomDepth,room.height,heather);
  // The cinema shares the bathroom wall and opens to the hall at its south end.
  partition(room.cinemaEast,roomZ,room.thickness,roomDepth,room.height,cinemaWall);
  partition(cinemaX,room.north,cinemaWidth+room.thickness,room.thickness,room.height,cinemaWall);
  slidingEntrance(-8,2,room.bathWest-room.thickness/2,room.shared,lavender);
  slidingEntrance(7.4,2.4,room.shared,room.cinemaEast+room.thickness/2,cinemaWall);
  // Glazing and its frame span the same wall bounds, including the corners.
  for(const [x0,x1] of [[room.bathWest,room.shared],[room.shared,room.cinemaEast]]){
    const x=(x0+x1)/2,width=x1-x0;
    // Meet over the shared wall without overlapping coplanar glass panes.
    const paneLeft=x0-(x0===room.bathWest?room.thickness/2:0);
    const paneRight=x1+(x1===room.cinemaEast?room.thickness/2:0);
    B.box((paneLeft+paneRight)/2,room.height,roomZ,paneRight-paneLeft,.08,roomDepth+room.thickness,glass);
    glassRoofFrame(x,roomZ,width,roomDepth,room.height,x0===room.shared);
  }
  for(const x of [-10.7,-7.2]){
    B.box(x,.03,-25.55,2.8,.035,3.05,ivory);
    B.box(x,0,-26.9,2.8,2.9,.12,heather);
    B.box(x, .15,-26.81,.045,2.5,.045,brass);
    B.box(x,2.62,-26.2,.045,.045,1.25,brass);
    B.box(x,2.59,-25.65,.66,.055,.58,brass);
    B.box(x,1.1,-26.75,.35,.12,.08,brass);
    for(let i=0;i<3;i++)B.box(x-.6+i*.22,1.18,-26.65,.14,.25,.14,{tex:'paint',tint:bookColors[i]});
    B.box(x,.072,-25.5,.44,.008,.16,{tex:'paint',tint:0x777f81});
  }
  partition(-8.95,-25.7,.055,2.6,2.7,glass);
  B.box(-8.95,2.7,-25.7,.07,.045,2.6,brass);
  // Freestanding tub, water, mixer and step-free access around its east end.
  B.box(-10,.04,-22.25,3.55,.12,1.7,ivory);foot(-10,-22.25,3.65,1.8);
  for(const z of [-22.99,-21.51])B.box(-10,.16,z,3.55,.49,.22,ivory);
  for(const x of [-11.66,-8.34])B.box(x,.16,-22.25,.23,.49,1.48,ivory);
  B.box(-10,.43,-22.25,3.06,.02,1.23,{tex:'paint',tint:0xa3d0d4});
  B.box(-8.03,0,-22.25,.06,.95,.06,brass);B.box(-8.24,.9,-22.25,.46,.05,.06,brass);
  // Double basin, mirrors, towel shelves and a toilet.
  B.box(-4.05,.12,-21.8,1.2,.72,3.5,wood);foot(-4.05,-21.8,1.3,3.6);
  B.box(-4.05,.84,-21.8,1.35,.09,3.65,ivory);
  for(const z of [-22.65,-20.95]){
    B.box(-4.05,.94,z,.9,.12,.7,ivory);B.box(-4.05,1.065,z,.67,.015,.48,{tex:'paint',tint:0x9eb8bb});
    B.box(-3.66,.93,z,.05,.32,.05,brass);B.box(-3.81,1.22,z,.35,.04,.05,brass);
    B.box(-3.31,1.25,z,.055,1.3,1.3,brass);B.box(-3.35,1.3,z,.025,1.2,1.2,{tex:'paint',tint:0xacc6cd});
    B.box(-3.38,2.56,z,.08,.06,1.25,{tex:'paint',tint:0xffe3b6,emissive:1});
    B.box(-4.62,.6,z,.035,.035,.8,brass);B.box(-4.66,.36,z,.035,.25,.55,{tex:'linen'});
  }
  B.box(-11.7,.02,-19.5,.48,.35,.65,ivory);B.box(-11.7,.37,-19.5,.62,.12,.82,ivory);
  B.box(-11.7,.49,-19.8,.65,.52,.18,ivory);foot(-11.7,-19.5,.72,.92);
  B.box(-12.45,.65,-19.5,.08,.22,.24,{tex:'linen'});
  for(let i=0;i<3;i++)B.box(-5.4,.06+i*.13,-19,.75,.11,.42,{tex:'linen'});
  // Cheerful bath toys and wall accents, kept low-poly and inside the wet area.
  const bathTints=[0xff8a75,0xffd56a,0x74c9c4];
  for(let i=0;i<3;i++){
    const x=-12.1+i*.62;
    B.box(x,.52,-22.2,.42,.28,.35,{tex:'paint',tint:bathTints[i]});
    B.box(x,.69,-22.2,.28,.12,.24,{tex:'paint',tint:bathTints[i]});
    B.box(x-.08,.75,-22.05,.045,.045,.035,{tex:'paint',tint:0x282c30});
    B.box(x+.08,.75,-22.05,.045,.045,.035,{tex:'paint',tint:0x282c30});
  }
  B.box(-12.88,2.35,-23.3,.035,.54,1.1,{tex:'paint',tint:0x78bfc5});
  B.box(-12.84,2.35,-23.3,.04,.13,.38,{tex:'paint',tint:0xffd56a});
  B.box(-12.82,2.35,-23.83,.04,.24,.34,{tex:'paint',tint:0xff8a75});
  B.box(-12.82,2.35,-22.77,.04,.24,.34,{tex:'paint',tint:0xff8a75});
  B.box(-12.82,2.47,-23.04,.04,.09,.09,{tex:'paint',tint:0xffffff});
  B.box(-12.79,2.47,-23.04,.04,.045,.045,{tex:'paint',tint:0x26333a});
  B.box(-9.15,.65,-22.18,.42,.22,.34,{tex:'paint',tint:0xffd447});
  B.box(-8.98,.82,-22.18,.22,.22,.22,{tex:'paint',tint:0xffd447});
  B.box(-8.83,.82,-22.05,.16,.08,.12,{tex:'paint',tint:0xff8a38});
  B.box(-8.95,.87,-22.06,.045,.045,.04,{tex:'paint',tint:0x26333a});

  // Cinema lounge occupies the room east of the bathroom; the south doorway
  // and a broad central aisle remain clear for walking and camera movement.
  B.box(4.05,.008,-22.65,13.7,.025,9.2,{tex:'paint',tint:0x26343b});
  B.box(cinemaX,0,-27.48,cinemaWidth,.12,.36,{tex:'paint',tint:0x12181e});
  B.box(cinemaX,3.25,-27.48,cinemaWidth,.12,.36,{tex:'paint',tint:0x12181e});
  B.box(-3.12,0,-23.05,.12,.12,9.3,{tex:'paint',tint:0x12181e});
  B.box(10.93,0,-23.05,.12,.12,9.3,{tex:'paint',tint:0x12181e});
  B.box(5,0,-26.25,7.2,.2,.42,{tex:'steel'});
  B.box(5,.2,-26.25,6.75,4.05,.24,{tex:'paint',tint:0x151b20});
  B.box(5,.34,-26.08,6.25,3.55,.035,{tex:'paint',tint:0x242d36,emissive:.3});
  // Film-reel motif and framed stills make the side wall read as a cinema.
  for(const z of [-25.55,-23.05,-20.55]){
    B.box(10.78,2.05,z,.055,1.65,1.7,{tex:'paint',tint:0x182229});
    B.box(10.735,2.05,z,.025,1.38,1.42,{tex:'paint',tint:z===-23.05?0xb45e48:0x668b87,emissive:.18});
    for(const y of [1.2,2.9])B.box(10.69,y,z,.06,.08,1.78,brass);
    for(const dz of [-.85,.85])B.box(10.69,2.05,z+dz,.06,1.78,.08,brass);
  }
  B.box(5,3.02,-27.25,4.8,.26,.08,{tex:'paint',tint:0xd7b46d,emissive:.75});
  for(const x of [3.1,6.9])B.box(x,2.02,-27.2,.12,.12,.08,{tex:'paint',tint:0xc85c4c,emissive:.6});
  // A wide two-seat sofa faces the screen. Its center gap marks both seats.
  B.box(5,.12,-22.05,4.25,.24,1.25,{tex:'velvet'});foot(5,-22.05,4.35,1.35);
  B.box(5,.39,-21.58,4.25,.55,.28,{tex:'velvet'});
  B.box(2.94,.38,-22.05,.28,.56,1.18,{tex:'velvet'});
  B.box(7.06,.38,-22.05,.28,.56,1.18,{tex:'velvet'});
  for(const x of [4.08,5.92])B.box(x,.4,-22.05,1.68,.34,1.05,{tex:'paint',tint:0x526b67});
  B.box(4.05,0,-25.05,.36,.12,.36,{tex:'paint',tint:0xffc766,emissive:1});
  B.box(5.95,0,-25.05,.36,.12,.36,{tex:'paint',tint:0x75c7c4,emissive:1});
  B.box(5,.015,-20.45,3.3,.04,.62,{tex:'paint',tint:0x364246});
  for(const x of [3.65,6.35]){B.box(x,.05,-20.45,.12,.1,.12,{tex:'paint',tint:0xd4aa63});foot(x,-20.45,.2,.2);}
  lighting.push({id:'cinema',position:[5,3.2,-23.5],power:2.2,radius:7,direction:null});
  lighting.push({id:'library-reading',position:[-20,3,-22],power:4,radius:8,direction:null},
    {id:'bathroom',position:[-8,3,-23],power:4,radius:7,direction:null});
  return {id:'interior-partitions',levels(){},collides(x,y,z){
    return walls.some(w=>y<w.y1&&y+1.8>w.y0&&x+.28>w.x0&&x-.28<w.x1&&z+.28>w.z0&&z-.28<w.z1);
  }};
}

export function createShower(scene){
  const positions=[],uvs=[];
  for(const p of [BATH.male,BATH.female]){
    const source=new THREE.CylinderGeometry(.55,.8,2.5,12,1,true),g=source.toNonIndexed();source.dispose();
    g.translate(p.x,1.35,p.z);positions.push(...g.attributes.position.array);uvs.push(...g.attributes.uv.array);g.dispose();
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  const time={value:0},m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    uniforms:{time},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;uniform float time;void main(){float line=pow(max(0.,sin(vUv.x*151.)),18.);float drop=step(.45,fract(vUv.y*15.+time*4.+floor(vUv.x*24.)*.17));float a=line*drop*.48*smoothstep(0.,.1,vUv.y);gl_FragColor=vec4(.7,.9,1.,a);}' });
  const mesh=new THREE.Mesh(g,m);mesh.name='shared-shower-water';mesh.visible=false;scene.add(mesh);
  return {mesh,update(dt,on){mesh.visible=on;if(on)time.value+=dt;}};
}
