/* Personal desk preferences supplement the original bookmark store. */
(() => {
'use strict';
function initialize(){
 const root=document.documentElement, get=id=>document.getElementById(id);
 if(!get('pinned-grid')) return;
 const keys={pins:'li-plus-desk-pins-v1',recent:'li-plus-desk-recent-v1',remember:'li-plus-desk-remember',density:'li-plus-desk-density'};
 let data=globalThis.LiNavManager?.getData()||JSON.parse(get('navigation-data').textContent);
 let all=[], map=new Map(),organizing=false,dragged=null,timer;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function toast(text){get('desk-toast').textContent=text;get('desk-toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>get('desk-toast').hidden=true,4500);}
 function read(key,fallback){try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch{return fallback;}}
 function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('浏览器未允许保存；本次调整仅在当前页面有效。');return false;}}
 function index(){all=[...data.quickLinks,...data.groups.flatMap(g=>g.items)];map=new Map(all.map(item=>[item.id,item]));}index();
 const initial=['ChatGPT','Deepseek','豆包','QQ邮箱','LINUX DO','可画'].map(name=>all.find(i=>i.name.toLowerCase()===name.toLowerCase())?.id).filter(Boolean);
 let pins=read(keys.pins,initial),recent=read(keys.recent,[]),remember=read(keys.remember,true)!==false;
 if(!Array.isArray(pins))pins=initial;if(!Array.isArray(recent))recent=[];
 pins=[...new Set(pins)].filter(id=>map.has(id));recent=[...new Set(recent)].filter(id=>map.has(id)).slice(0,4);
 root.dataset.density=read(keys.density,'comfortable')==='compact'?'compact':'comfortable';
 function safeIcon(value){return typeof value==='string'&&(/^(assets|uploads|style)\/[a-z0-9_./-]+$/i.test(value)||/^https:\/\//.test(value))&&!value.includes('..')?value:'';}
 function makeLink(item,cls,domain=false){
  const link=el('a',cls);link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.dataset.deskSite=item.id;link.title=`${item.name}（在新标签页打开）`;
  const mark=el('span','site-mark');const icon=safeIcon(item.icon);
  if(icon){const img=el('img');img.src=icon;img.alt='';img.width=40;img.height=40;mark.append(img);}else mark.append(el('span','site-letter',Array.from(item.name)[0]));
  const copy=el('span','site-content');copy.append(el('strong','',item.name),el('span',domain?'site-domain':'site-description',domain?new URL(item.url).hostname.replace(/^www\./,''):item.description||new URL(item.url).hostname));link.append(mark,copy);return link;
 }
 function button(text,label,action,id){const b=el('button','',text);b.type='button';b.setAttribute('aria-label',label);b.dataset.deskAction=action;b.dataset.id=id;return b;}
 function renderPins(){
  const grid=get('pinned-grid');grid.replaceChildren();
  root.classList.toggle('is-organizing',organizing);get('organize-pins').textContent=organizing?'完成':'整理';get('organize-pins').setAttribute('aria-pressed',String(organizing));
  document.querySelector('.pin-count').textContent=`${pins.length} 个网址`;
  if(!pins.length)grid.append(el('p','pin-empty','在下方目录点击“置顶”，把常用网址留在手边。'));
  for(const id of pins){const item=map.get(id);if(!item)continue;
   const card=el('div','pinned-card site-entry');card.dataset.pinId=id;card.draggable=organizing;
   card.append(makeLink(item,'pinned-link'));
   const actions=el('div','pin-actions');actions.append(button('取消置顶',`取消置顶：${item.name}`,'unpin',id),button('编辑',`编辑置顶：${item.name}`,'edit',id));card.append(actions);
   if(organizing){const moves=el('div','pin-move-actions');const prev=button('向前',`向前移动：${item.name}`,'prev',id),next=button('向后',`向后移动：${item.name}`,'next',id);prev.disabled=pins.indexOf(id)===0;next.disabled=pins.indexOf(id)===pins.length-1;moves.append(prev,next);card.append(moves);}
   grid.append(card);
  }
  updatePinButtons();
 }
 function renderRecent(){const list=get('recent-list');list.replaceChildren();get('recent-section').hidden=!remember||Boolean(get('search-input').value.trim());if(!remember)return;
  if(!recent.length){list.append(el('p','recent-empty','从这里出发的每一次探索，都会留在最近打开。'));return;}
  for(const id of recent){const item=map.get(id);if(!item)continue;const row=el('div','recent-item');row.append(makeLink(item,'recent-link',true));list.append(row);}
 }
 function updatePinButtons(){for(const entry of document.querySelectorAll('.directory-main .site-entry')){const a=entry.querySelector('[data-site-id]');if(!a)continue;let b=entry.querySelector('.pin-site-button');if(!b){b=el('button','pin-site-button');b.type='button';b.dataset.pinSite=a.dataset.siteId;entry.append(b);}const pinned=pins.includes(a.dataset.siteId);b.textContent=pinned?'已置顶':'置顶';b.setAttribute('aria-pressed',String(pinned));b.setAttribute('aria-label',`${pinned?'取消置顶':'置顶'}：${map.get(a.dataset.siteId)?.name||''}`);}}
 function togglePin(id){if(!map.has(id))return;pins=pins.includes(id)?pins.filter(p=>p!==id):[...pins,id];const saved=save(keys.pins,pins);renderPins();if(saved)toast(pins.includes(id)?'已加入常用置顶。':'已取消置顶，网址仍保留在目录中。');}
 function record(id){if(!remember||!map.has(id))return;recent=[id,...recent.filter(p=>p!==id)].slice(0,4);save(keys.recent,recent);renderRecent();}
 function focusSearch(){get('search-input').scrollIntoView({behavior:root.dataset.motion==='off'?'auto':'smooth',block:'center'});get('search-input').focus({preventScroll:true});}
 const mobileQuery=window.matchMedia('(max-width: 700px)');
 function syncSidebar(){const closed=mobileQuery.matches&&!get('app-sidebar').classList.contains('is-open');get('app-sidebar').inert=closed;if(closed)get('app-sidebar').setAttribute('aria-hidden','true');else get('app-sidebar').removeAttribute('aria-hidden');}
 function closeMenu(){get('app-sidebar').classList.remove('is-open');get('mobile-menu').setAttribute('aria-expanded','false');get('mobile-menu').setAttribute('aria-label','打开分类菜单');syncSidebar();}
 mobileQuery.addEventListener('change',syncSidebar);syncSidebar();
 get('close-sidebar').addEventListener('click',()=>{closeMenu();get('mobile-menu').focus();});
 document.addEventListener('click',event=>{
  const action=event.target.closest('[data-desk-action]');
  if(action){const id=action.dataset.id;if(action.dataset.deskAction==='edit'){globalThis.LiNavManager?.edit(id);return;}
   if(action.dataset.deskAction==='unpin'){togglePin(id);get('organize-pins').focus({preventScroll:true});return;}
   const old=pins.indexOf(id),next=old+(action.dataset.deskAction==='prev'?-1:1);if(next<0||next>=pins.length)return;[pins[old],pins[next]]=[pins[next],pins[old]];save(keys.pins,pins);renderPins();const card=[...get('pinned-grid').children].find(c=>c.dataset.pinId===id);card?.querySelector('.pin-move-actions button:not(:disabled)')?.focus({preventScroll:true});return;
  }
  const pin=event.target.closest('[data-pin-site]');if(pin){togglePin(pin.dataset.pinSite);return;}
  const a=event.target.closest('a[data-desk-site],a[data-site-id]');if(a)record(a.dataset.deskSite||a.dataset.siteId);
  if(event.target.closest('[data-category-link],button[data-collection]'))closeMenu();
  if(!event.target.closest('#app-sidebar,#mobile-menu'))closeMenu();
 });
 get('pinned-grid').addEventListener('dragstart',e=>{const c=e.target.closest('[data-pin-id]');if(!organizing||!c)return;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.dataset.pinId);dragged=c.dataset.pinId;c.classList.add('is-dragging');});
 get('pinned-grid').addEventListener('dragover',e=>{const c=e.target.closest('[data-pin-id]');if(!organizing||!dragged||!c)return;e.preventDefault();e.dataTransfer.dropEffect='move';for(const card of get('pinned-grid').children)card.classList.toggle('is-drop-target',card===c);});
 get('pinned-grid').addEventListener('drop',e=>{const c=e.target.closest('[data-pin-id]');if(!organizing||!dragged||!c)return;e.preventDefault();const dest=pins.indexOf(c.dataset.pinId);pins=pins.filter(id=>id!==dragged);pins.splice(dest,0,dragged);const saved=save(keys.pins,pins);dragged=null;renderPins();if(saved)toast('置顶顺序已更新。');});
 get('pinned-grid').addEventListener('dragend',()=>{dragged=null;renderPins();});
 get('organize-pins').addEventListener('click',()=>{organizing=!organizing;renderPins();});
 get('quick-add').addEventListener('click',()=>globalThis.LiNavManager?.edit());
 get('quick-manage').addEventListener('click',()=>{get('manage-sites').click();get('manage-actions').scrollIntoView({behavior:root.dataset.motion==='off'?'auto':'smooth',block:'center'});});
 get('manage-sites').addEventListener('click',()=>get('quick-manage').textContent=root.classList.contains('is-managing')?'完成管理':'管理网址');
 get('appearance-toggle').addEventListener('click',()=>{closeMenu();get('appearance-dialog').showModal();});get('appearance-close').addEventListener('click',()=>get('appearance-dialog').close());
 function syncDensity(){get('density-toggle').textContent=root.dataset.density==='compact'?'紧凑':'舒适';get('density-toggle').setAttribute('aria-pressed',String(root.dataset.density==='compact'));}syncDensity();
 get('density-toggle').addEventListener('click',()=>{root.dataset.density=root.dataset.density==='compact'?'comfortable':'compact';save(keys.density,root.dataset.density);syncDensity();});
 get('remember-recent').checked=remember;get('remember-recent').addEventListener('change',()=>{remember=get('remember-recent').checked;save(keys.remember,remember);if(!remember){recent=[];save(keys.recent,[]);}renderRecent();});
 get('open-search').addEventListener('click',focusSearch);
 get('mobile-menu').addEventListener('click',()=>{const open=get('app-sidebar').classList.toggle('is-open');get('mobile-menu').setAttribute('aria-expanded',String(open));get('mobile-menu').setAttribute('aria-label',open?'关闭分类菜单':'打开分类菜单');syncSidebar();if(open)get('app-sidebar').querySelector('a').focus();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&get('app-sidebar').classList.contains('is-open')){closeMenu();get('mobile-menu').focus();}});
 get('search-scope').addEventListener('change',()=>document.querySelector(`[data-collection="${get('search-scope').value}"]`)?.click());
 document.addEventListener('li:search-updated',e=>{get('search-scope').value=e.detail.collection;get('pinned-section').hidden=Boolean(e.detail.query);get('recent-section').hidden=Boolean(e.detail.query)||!remember;});
 document.addEventListener('li:site-opened',e=>record(e.detail.id));
 document.addEventListener('li:navigation-changed',e=>{data=e.detail?.data||globalThis.LiNavManager.getData();index();pins=pins.filter(id=>map.has(id));recent=recent.filter(id=>map.has(id));renderPins();renderRecent();});
 renderPins();renderRecent();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
