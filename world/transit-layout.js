// The full map looks south: positive X is the LEFT-hand tunnel in the reference.
// Sample one circular half-turn instead of hand-placed bends. The diameter
// joins the arc ends; side selects C or reverse-C on the south-up map.
function semicircle([ax,az],[bx,bz],side,height){
  const cx=(ax+bx)/2,cz=(az+bz)/2,dx=(bx-ax)/2,dz=(bz-az)/2;
  return Array.from({length:49},(_,i)=>{
    const t=i/48,angle=Math.PI*t;
    // Level ends join the shore/platforms; the vertical profile is independent
    // of the circular plan, so ramps cannot introduce a sideways kink.
    const ramp=Math.max(0,Math.min(1,(t-.06)/.88));
    const y=ramp===0||ramp===1?0:height*Math.sin(Math.PI*ramp)**2;
    if(i===0)return [ax,0,az];
    if(i===48)return [bx,0,bz];
    return [cx-dx*Math.cos(angle)+side*dz*Math.sin(angle),y,cz-dz*Math.cos(angle)-side*dx*Math.sin(angle)];
  });
}
export const TUNNEL_POINTS = [
  // Leave the existing shore entrance heading out to sea, then merge into
  // the eastward tangent. A sideways portal would block the north approach.
  // Move the half-circle 24 m seaward, keeping the full tunnel width clear
  // of the carrier berth. Tangent approaches preserve both original portals.
  [34,0,19],[44,0,23.5],[52,0,24.5],[64,0,25],[76,0,25],
  ...semicircle([84,25],[84,158],1,-15),
  [72,0,158],[60,0,158],
];
export const METRO_POINTS = [
  [-15,0,33],[-28,0,33],[-42,0,33],
  ...semicircle([-45,33],[-45,166],-1,6),
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
