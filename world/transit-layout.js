// The full map looks south: positive X is the LEFT-hand tunnel in the reference.
// A single half-ellipse keeps the bend convex, with east/west tangents at
// both shores. Offset endpoints shear the arc without adding reverse bends.
// side selects C or reverse-C on the south-up map.
function seaArc([ax,az],[bx,bz],side,height,reach=Math.abs(bz-az)/2){
  const cx=(ax+bx)/2,cz=(az+bz)/2,dx=(bx-ax)/2,dz=(bz-az)/2;
  return Array.from({length:49},(_,i)=>{
    const t=i/48,angle=Math.PI*t;
    // Level ends join the shore/platforms; the vertical profile is independent
    // of the arc in plan, so ramps cannot introduce a sideways kink.
    const ramp=Math.max(0,Math.min(1,(t-.06)/.88));
    const y=ramp===0||ramp===1?0:height*Math.sin(Math.PI*ramp)**2;
    if(i===0)return [ax,0,az];
    if(i===48)return [bx,0,bz];
    return [cx-dx*Math.cos(angle)+side*reach*Math.sin(angle),y,cz-dz*Math.cos(angle)];
  });
}
// Face the east garage opening on its centreline, six metres from the door.
// Keep the walking handoff on solid land, behind the mouth of the tunnel.
export const TUNNEL_HOME={x:36,y:0,z:-6.5};
export const TUNNEL_HOME_RELEASE={x:33,y:0,z:TUNNEL_HOME.z};
export const TUNNEL_POINTS = [
  // A straight, level entry lets cars leave the garage without steering.
  // One continuous C-shaped bend connects the level approaches. Its 94 m
  // seaward reach keeps the outer wall clear of the entire carrier berth.
  [TUNNEL_HOME.x,0,TUNNEL_HOME.z],[44,0,TUNNEL_HOME.z],
  ...seaArc([52,TUNNEL_HOME.z],[72,158],1,-15,94),
  [60,0,158],
];
export const METRO_POINTS = [
  [-15,0,33],[-28,0,33],[-42,0,33],
  ...seaArc([-45,33],[-45,166],-1,6),
  [-30,0,166],[-15,0,166],
];
export const TRANSIT_STOPS = [
  {id:'metro-home',service:'metro',name:'海上地铁 · 家园站',en:'Metro · Home',at:[-28,28.5],floor:0,track:[-28,33],access:[-28,26],end:0},
  {id:'metro-mountain',service:'metro',name:'海上地铁 · 山脚站',en:'Metro · Mountain',at:[-30,170],floor:0,track:[-30,166],access:[20,157],end:1},
  ...[ ['home','家园',29,0],['bridge','海桥观景',86,6],['mountain','山脚',156,0] ].flatMap(([key,name,z,floor])=>[
    {id:`bus-${key}`,service:'bus',name:`公交 · ${name}站（${key==='mountain'?'回家':'往山脚'}）`,en:`Bus · ${key}`,at:key==='mountain'?[36.5,154]:[28.05,z],floor,track:key==='mountain'?[34,154]:[26,z],end:key},
    {id:`bus-${key}-return`,service:'bus',name:`公交 · ${name}站（${key==='home'?'往山脚':'回家'}）`,en:`Bus · ${key} return`,at:key==='mountain'?[11.5,154]:[19.95,z],floor,track:key==='mountain'?[14,154]:[22,z],end:key,returning:true},
  ]),
];
export const TRANSIT_BOUNDS={x0:-120,x1:166};
