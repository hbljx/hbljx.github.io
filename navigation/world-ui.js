const brand=document.querySelector('#li-brand');
const ready=setInterval(()=>{
  if(window.__home?.player){
    clearInterval(ready);brand.hidden=false;
    document.querySelector('#portalButton')?.remove();
    document.querySelector('#minimap .badge.credit')?.remove();
    // Nearby room prompts share the same icon toolbar as character controls.
    const corner = document.querySelector('#corner');
    const prompt = document.querySelector('#prompt');
    if (corner && prompt) corner.append(prompt);
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
