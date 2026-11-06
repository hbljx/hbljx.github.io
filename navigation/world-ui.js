const brand=document.querySelector('#li-brand');
function installHelp(){
  const button=document.querySelector('#webButton');
  if(!button||button.dataset.helpReady)return;
  button.dataset.helpReady='true';
  const dialog=document.createElement('dialog');
  dialog.id='game-help';
  dialog.innerHTML='<header><div><small>LI+ WORLD GUIDE</small><h2>新手玩法说明</h2></div><button class="help-close" aria-label="关闭">×</button></header><div class="help-content">'+
    '<section><h3>基本操作</h3><p>WASD/方向键移动，点击地面前往目标，拖动转动视角；Shift 跑步、空格跳跃、R 切换走路/跑步/飞行。蛛丝按钮单击开启，再单击关闭；开启后点击可到达的位置快速摆荡过去。走近物件按 E 互动，再按 E 或 Esc 退出；Q 坐下/起身，F 打开附近房间或目录。</p></section>'+
    '<section><h3>房间与休闲</h3><p>客厅看电视，书房/卧室/图书馆看书；浴室或卧室可开始睡前流程，E 可取消。厨房做饭按提示切菜、翻炒；咖啡吧品尝咖啡；AI 工作台用 A/D 或方向键接金块、躲红块。篮球场按住空格蓄力，在绿色区松手投篮。海边钓鱼按空格抛竿，浮漂下沉后尽快按空格收线。跑步机用空格暂停、R 调速。</p></section>'+
    '<section><h3>车库、道路与隧道</h3><p>走近汽车或摩托车按 E 上下车。W/S 前进倒车，A/D 转向，空格刹车；喷气汽车按 J 启动。进入海底隧道后按 T 开启领航，R 返回车库。沿海岸道路可前往观景桥和山顶停机坪。</p></section>'+
    '<section><h3>飞机与航母</h3><p>走近停放的飞机按 E 登机；W/S 调速，A/D 转向，空格上升、C 下降，V 悬停/继续。1 垂直起飞、2 弹射、3 滑跃；L 降落山顶、H 降落航母、R 返回三楼，停稳后 E 下机。航母从海岸栈桥登舰，进入舰岛驾驶舱按 E 驾驶；P 自动巡航/暂停，R 自动返港，W/S 航行、A/D 转向、Shift 加速、空格刹车；方向键可接管。</p></section>'+
    '<section><h3>潜艇</h3><p>走近「领海一号」按 E 登艇；P 开始/暂停下潜巡视，W/S 前后航行、A/D 转向、C 下潜、空格上浮，R 上浮返港，返港后按 E 下艇。方向键可接管自动航行。</p></section>'+
    '<section><h3>地图提示</h3><p>靠近可互动目标会出现提示；底部快捷栏打开网址分类，迷你地图帮助辨认房屋、海岸、航母和潜艇。操作面板可点「收起」减少遮挡。</p></section></div>';
  document.body.append(dialog);
  dialog.querySelector('.help-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  let count=0,timer;
  button.addEventListener('click',e=>{count++;clearTimeout(timer);if(count===3){e.preventDefault();e.stopImmediatePropagation();count=0;dialog.showModal();dialog.querySelector('.help-close').focus();}else timer=setTimeout(()=>count=0,650);},true);
}

const ready=setInterval(()=>{
  if(window.__home?.player){
    clearInterval(ready);brand.hidden=false;installHelp();
    document.querySelector('#portalButton')?.remove();
    document.querySelector('#minimap .badge.credit')?.remove();
  }
  else if(window.__homeStartupError){clearInterval(ready);}
},250);
// The engine handles F near a room; a second F closes its open panel even
// when focus is on the outer title bar rather than inside the directory.
window.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.key.toLowerCase()!=='f')return;
  if(event.target?.closest?.('input,textarea,select')||event.target?.isContentEditable)return;
  const panel=document.querySelector('#panel');
  if(!panel?.open)return;
  // Keep nested editors and previews open until the user dismisses them.
  try{if(panel.querySelector('iframe')?.contentDocument?.querySelector('dialog[open]'))return;}catch{}
  event.preventDefault();event.stopImmediatePropagation();panel.querySelector('.close')?.click();
},true);
window.addEventListener('message',event=>{
  const frame=document.querySelector('#panel .body iframe');
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  if(event.data?.type==='li-nav-close')document.querySelector('#panel .close')?.click();
  if(event.data?.type==='li-nav-export'&&Array.isArray(event.data.backup?.groups)&&Array.isArray(event.data.backup?.quickLinks)){
    const content=JSON.stringify(event.data.backup,null,2);if(content.length>8*1024*1024)return;
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=document.createElement('a');
    a.href=url;a.download='Li-plus-navigation-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
});
