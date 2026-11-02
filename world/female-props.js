// A resident's voxel motorcycle shares her instanced body draw.
export function drawResidentBike(avatar,x=0,y=-.38,z=0){
  const b=(dx,dy,dz,w,h,d,c)=>avatar.prop(x+dx,y+dy,z+dz,w,h,d,c);
  const tire=0x242b30,steel=0x9baab0,orange=0xd77e32;
  for(const axle of [-.84,.84]){
    b(0,.35,axle,.24,.62,.56,tire);b(0,.35,axle,.24,.45,.72,tire);
    for(const s of [-1,1])b(s*.13,.35,axle,.025,.31,.31,steel);
  }
  b(0,.53,-.1,.28,.13,1.4,tire);b(0,.7,-.05,.38,.36,.56,steel);
  b(0,.98,.23,.45,.35,.64,orange);b(0,.96,-.48,.44,.14,.75,tire);
  b(0,.82,-.92,.38,.1,.45,orange);b(0,.78,.86,.35,.08,.5,orange);
  for(const s of [-1,1]){b(s*.18,.74,.71,.07,.78,.07,steel);b(s*.2,.62,-.65,.065,.49,.07,steel);b(s*.32,.43,-.3,.18,.06,.25,tire);b(s*.32,1.25,.51,.2,.07,.18,tire);}
  b(0,1.25,.51,.73,.07,.07,steel);b(0,1.12,.79,.3,.23,.18,tire);b(0,1.12,.89,.23,.17,.025,0xffe6ac);
  b(.3,.47,-.55,.14,.14,.9,steel);b(0,.86,-1.16,.21,.09,.04,0xde574b);
}
