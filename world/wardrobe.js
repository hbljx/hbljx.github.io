// A shuffled wardrobe bag: every outfit appears once per ten visits.
const palettes = [
 ['森林绿',0x4f7a4a,0x3f5b85,0xe6e3dc,0xe9ce84],
 ['海军蓝',0x294b72,0xc7b69c,0xede7db,0xd19b55],
 ['奶油白',0xe4d8bf,0x584f49,0x936b4d,0x507b71],
 ['酒红',0x893e50,0x343e50,0xe8ded0,0xd1b179],
 ['雾霾蓝',0x709cae,0xe1d4bb,0x384b63,0xebc889],
 ['焦糖',0xb47a4d,0x303e4d,0xe3d8bf,0x6a8c85],
 ['薰衣草',0x9a789e,0x4c526c,0xe2d7c5,0xe6bc6c],
 ['珊瑚粉',0xc97c78,0x58684e,0xeadfcf,0x8fa6c1],
 ['炭灰',0x4a4d55,0x9a9386,0xebe6dc,0xdba264],
 ['湖水绿',0x538e87,0x38475c,0xd7c5a5,0xe1b4c8],
];
function choose(person){
 const key=`li-wardrobe-${person}-v1`;let state={remaining:[],last:-1};
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&Array.isArray(saved.remaining)&&saved.remaining.every(i=>Number.isInteger(i)&&i>=0&&i<10))state=saved;}catch{}
 if(!state.remaining.length){
  state.remaining=Array.from({length:10},(_,i)=>i);
  for(let i=9;i>0;i--){const j=Math.floor(Math.random()*(i+1));[state.remaining[i],state.remaining[j]]=[state.remaining[j],state.remaining[i]];}
  if(state.remaining.at(-1)===state.last)[state.remaining[0],state.remaining[9]]=[state.remaining[9],state.remaining[0]];
 }
 const index=state.remaining.pop();state.last=index;
 try{localStorage.setItem(key,JSON.stringify(state));}catch{}
 const [name,shirt,pants,shoe,accent]=palettes[index];return{index,name,shirt,pants,shoe,accent};
}
export const outfits={male:choose('male'),female:choose('female')};
export const shade=(hex,k)=>'#'+[16,8,0].map(shift=>Math.min(255,Math.round(((hex>>shift)&255)*k)).toString(16).padStart(2,'0')).join('');
