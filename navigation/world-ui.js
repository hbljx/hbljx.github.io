const brand=document.querySelector('#li-brand');
const guideStyle=document.createElement('style');
guideStyle.textContent=`
dialog#panel[data-station="mailbox"] {
  width:min(820px,calc(100vw - 44px));
  height:min(720px,calc(100dvh - 164px));
  min-height:300px;
  padding:12px;
  overflow:hidden;
  background:linear-gradient(90deg,#563b25 0 12px,#815a36 12px 18px,#68472c 18px 100%);
  border:3px solid #3e2c1d;
  box-shadow:0 18px 48px #0009,inset 0 0 0 2px #bd9560,inset 9px 0 13px #2d1c1270;
}
#panel[data-station="mailbox"] header { width:100%; padding:0 4px 10px; }
#panel[data-station="mailbox"] .body {
  min-height:0;
  overflow-x:hidden;
  overflow-y:auto;
  overscroll-behavior:contain;
  touch-action:pan-y;
  scrollbar-color:#98744c #eadbbd;
  scrollbar-width:thin;
  padding:clamp(20px,4vw,42px) clamp(22px,6vw,64px);
  border:1px solid #c8b48f;
  background:
    linear-gradient(90deg,transparent 0 27px,#c77f71 27px 29px,transparent 29px),
    repeating-linear-gradient(0deg,transparent 0 31px,#8d79531a 31px 32px),
    #f3e8cf;
  box-shadow:inset 12px 0 18px -15px #533c26,inset 0 0 0 5px #e4d4b4,0 2px 5px #26190f80;
  color:#443522;
}
#panel[data-station="mailbox"] .body::-webkit-scrollbar { width:10px; }
#panel[data-station="mailbox"] .body::-webkit-scrollbar-thumb { background:#98744c; border:3px solid #eadbbd; }
#panel[data-station="mailbox"] .body p { max-width:62ch; margin:0 0 18px; color:#443522; font-size:16px; line-height:1.95; }
#panel[data-station="mailbox"] .body .guide-intro { font-size:19px; font-weight:600; color:#5b3d24; }
#panel[data-station="mailbox"] .body h3 {
  margin:24px 0 14px;
  padding-bottom:7px;
  border-bottom:1px solid #bba27a;
  color:#5b3d24;
  font-size:clamp(18px,3vw,22px);
}
#panel[data-station="mailbox"] .body h4 { margin:16px 0 4px; color:#5b3d24; font-size:16px; line-height:1.5; }
#panel[data-station="mailbox"] .body .li-help { display:block; padding:0; border:0; border-image:none; background:transparent; box-shadow:none; }
@media (max-width:720px), (max-height:520px) {
  dialog#panel[data-station="mailbox"] {
    width:calc(100vw - 24px);
    height:min(720px,calc(100dvh - 112px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
    min-height:240px;
    padding:8px;
  }
  #panel[data-station="mailbox"] header { height:46px; padding-bottom:8px; }
  #panel[data-station="mailbox"] .body { padding:24px 23px 30px 35px; }
  #panel[data-station="mailbox"] .body p { font-size:15px; line-height:1.8; }
  #panel[data-station="mailbox"] .body .guide-intro { font-size:17px; }
}
`;
document.head.append(guideStyle);
const guideSeenKey='li-home-guide-seen';
let settledAt=0;
const ready=setInterval(()=>{
  const home=window.__home;
  if(home?.player&&!home.rig.introActive&&!document.querySelector('#loading')&&!document.hidden){
    // Allow the final opening-camera frame and HUD to settle before a single guide opening.
    if(!settledAt){settledAt=performance.now();return;}
    if(performance.now()-settledAt<400)return;
    clearInterval(ready);brand.hidden=false;
    document.documentElement.classList.remove('world-booting');
    document.querySelector('#portalButton')?.remove();
    document.querySelector('#minimap .badge.credit')?.remove();

    if(document.querySelector('#panel[open]'))return;
    try{if(localStorage.getItem(guideSeenKey)==='1')return;}catch{}
    home.openPage('mailbox',{preserveScene:true});
    if(document.querySelector('#panel[data-station="mailbox"][open]')){
      try{localStorage.setItem(guideSeenKey,'1');}catch{}
    }
  }
  else if(window.__homeStartupError||document.body.classList.contains('plain')){clearInterval(ready);document.documentElement.classList.remove('world-booting');}
  else settledAt=0;
},250);
// F closes an open panel when focus is outside the embedded directory.
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
