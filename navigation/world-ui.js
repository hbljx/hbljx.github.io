const brand=document.querySelector('#li-brand');
const ready=setInterval(()=>{
  if(window.__home?.player){
    clearInterval(ready);brand.hidden=false;
    const guide=document.querySelector('#pages [data-station="mailbox"] .li-help');
    if(guide)guide.innerHTML='<p>把好用的网址，留在这个小世界里。</p>'+
      '<p>WASD / 方向键移动，点击地面前往目标；拖动视角，Shift 跑步，空格跳跃，R 切换走路、跑步、飞行。走近门口绿色指南书按 E，或点击书本，随时查看这份玩法说明。走近其他物件按 E 互动；再按 E 或 Esc 结束互动，Q 坐下 / 起身，F 打开附近房间或目录。蛛丝按钮点击一次开启、再点一次关闭；开启后点击可到达的位置即可快速摆荡。</p>'+
      '<p>客厅可看电视，电影院可与女主一起看电影；书房、卧室和图书馆可以看书，浴室或卧室可开始睡前流程并按 E 取消。厨房可以做饭，咖啡吧可以喝咖啡，健身区跑步机可跑步，篮球场按住空格蓄力并在绿色区域松手投篮，海边栈道末端可钓鱼。AI 工作台用 A / D 接住金块、躲开红块。所有椅凳、沙发和床沿都可坐下。</p>'+
      '<p>车库可驾驶汽车和摩托车；W / S 前进倒车，A / D 转向，空格刹车，喷气汽车按 J 启动。车库出口前方是海底隧道，按 T 开启领航；沿东侧海岸道路可驶上海上观景桥，并沿登山步道前往后山停机坪。飞机走近按 E 登机，W / S 调速、A / D 转向、空格上升、C 下降、V 悬停；1 垂直起飞、2 弹射起飞、3 滑跃起飞，L 降落山顶、H 降落航母、R 返回三楼，停稳后按 E 下机。沿海岸栈桥登上 001 号航母，走进舰岛驾驶舱按 E 驾驶；P 开始 / 暂停自动巡航，R 自动返港，方向键或空格可接管。走近「领海一号」按 E 登艇，P 开始 / 暂停巡视，W / S 航行、A / D 转向、C 下潜、空格上浮，R 上浮返港，按 E 下艇。</p>'+
      '<p>女生会随机做饭、投篮、看电视、打游戏、喝咖啡、观景、骑摩托、钓鱼、游泳、看书和跑步。角色静止 5 分钟后，或在卧室、浴室按 E，可开始共同沐浴与睡前休息；睡眠时段为北京时间 22:00—07:00。点击地面可唤醒角色，音效由右上角开关控制。</p>'+
      '<a href="directory.html" target="_blank" rel="noopener">打开独立目录 ↗</a>';
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
