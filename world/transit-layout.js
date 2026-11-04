// The full map looks south: positive X is the LEFT-hand tunnel in the reference.
export const TUNNEL_POINTS = [
  [34,0,19],[44,0,25],[69,-5,40],[119,-13,68],[144,-15,106],
  [122,-13,145],[88,-5,168],[74,0,158],[60,0,158],
];
export const METRO_POINTS = [
  [-15,0,33],[-28,0,33],[-42,0,33],[-62,2,29],[-90,6,58],[-108,6,103],
  [-87,6,146],[-58,2,164],[-45,0,166],[-30,0,166],[-15,0,166],
];
export const TRANSIT_STOPS = [
  {id:'metro-home',service:'metro',name:'海上地铁 · 家园站',en:'Metro · Home',at:[-28,28.5],floor:0,track:[-28,33],access:[-28,26],end:0},
  {id:'metro-mountain',service:'metro',name:'海上地铁 · 山脚站',en:'Metro · Mountain',at:[-30,170],floor:0,track:[-30,166],access:[20,157],end:1},
  ...[ ['home','家园',29,0],['bridge','海桥观景',86,6],['mountain','山脚',156,0] ].flatMap(([key,name,z,floor])=>[
    {id:`bus-${key}`,service:'bus',name:`公交 · ${name}站（${key==='mountain'?'回家':'往山脚'}）`,en:`Bus · ${key}`,at:key==='mountain'?[36.5,154]:[28.05,z],floor,track:key==='mountain'?[34,154]:[26,z],end:key},
    {id:`bus-${key}-return`,service:'bus',name:`公交 · ${name}站（${key==='home'?'往山脚':'回家'}）`,en:`Bus · ${key} return`,at:key==='mountain'?[11.5,154]:[19.95,z],floor,track:key==='mountain'?[14,154]:[22,z],end:key,returning:true},
  ]),
];
export const TRANSIT_BOUNDS={x0:-120,x1:156};
