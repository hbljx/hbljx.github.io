import { zones } from './zones.js?v=20261101-directory-merge';
import { NavigationStore } from './navigation-store.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inFrame=window.parent!==window;
document.body.classList.toggle('embedded',inFrame);
const params=new URLSearchParams(location.search);
const inline=document.querySelector('#directory-content') !== null;
const fromHome=!inFrame&&params.get('home')==='1';
let zone=zones.find(z=>z.id===params.get('zone'))||zones[0],groupId='all',store,base,data;
let storage;try{storage=localStorage;}catch{}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
const groupPriority=new Map(['common-sites','software-news'].map((id,index)=>[id,index]));
const allGroups=()=>[{id:'quickLinks',title:'快捷入口',items:data.quickLinks},...data.groups]
  .sort((a,b)=>(groupPriority.get(a.id)??groupPriority.size)-(groupPriority.get(b.id)??groupPriority.size));
const entries=()=>allGroups().flatMap(g=>g.items.map(item=>({...item,groupId:g.id,groupTitle:g.title})));
function inZone(g){return !zone.groups.length||zone.groups.includes(g.id)||(zone.id==='about'&&g.id==='quickLinks');}
const domain=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return url;}};
function refreshData(){data=store.getData();$('#undo').hidden=!store.canUndo();render();}
function applyZone(id, query = ''){zone=zones.find(z=>z.id===id)||zones[0];groupId='all';$('#query').value=query;if(!inline){const u=new URL(location.href);u.searchParams.set('zone',zone.id);u.searchParams.delete('q');history.replaceState(history.state,'',u);}render();}
let publishedData;
function render(){
  if(!data)return;
  if(!inline)document.title=`${zone.name} · Li+ 像素导航`;
  $('#total-count').textContent=entries().length;
  if(inline&&(publishedData!==data)){
    publishedData=data;
    document.dispatchEvent(new CustomEvent('li-directory-update',{detail:{groups:allGroups()}}));
  }
  $('#zone-nav').innerHTML=zones.map(z=>`<button type="button" data-zone="${z.id}" aria-current="${z.id===zone.id}">${esc(z.name)}</button>`).join('');
  const available=allGroups().filter(inZone);
  const sideCount=available.reduce((n,g)=>n+g.items.length,0);
  $('#group-nav').innerHTML=`<button type="button" data-group="all" aria-current="${groupId==='all'}">${zone.id==='blog'?'全部网址':'本区全部'}<span>${sideCount}</span></button>`+available.map(g=>`<button type="button" data-group="${g.id}" aria-current="${groupId===g.id}">${esc(g.title)}<span>${g.items.length}</span></button>`).join('');
  const raw=$('#query').value.trim().toLocaleLowerCase();
  const local=$('#search-mode').value==='local',q=local?raw:'';
  const engine=data.engines.find(e=>e.id===$('#search-mode').value);
  $('#query').placeholder=local?'搜索名称、域名或分类…':engine?.placeholder||'输入关键词搜索…';
  $('#query').setAttribute('aria-label',local?'搜索本站网址':`使用${engine?.id==='search_1'?'百度':engine?.name||'搜索引擎'}搜索`);
  $('#search-tip').textContent=local?'输入即筛选 · Enter 搜索':'Enter 在新标签页搜索';
  $('#clear-search').hidden=!raw;
  let groups=available.filter(g=>groupId==='all'||groupId===g.id);
  groups=groups.map(g=>({...g,items:g.items.filter(i=>!q||[i.name,i.url,i.description,i.section,i.bookmarkFolder,g.title,i.groupTitle,...(i.aliases||[])].join(' ').toLocaleLowerCase().includes(q))})).filter(g=>g.items.length);
  const count=groups.reduce((n,g)=>n+g.items.length,0);
  $('#result-title').textContent=groupId==='all'?zone.name:(allGroups().find(g=>g.id===groupId)?.title||zone.name);
  $('#result-eyebrow').textContent=q?'SEARCH RESULTS':'YOUR COLLECTION';
  $('#result-count').textContent=`${count} 个网址`;
  if(inline)return;
  $('#cards').innerHTML=groups.map(g=>{
    const sections=[...new Set(g.items.map(i=>i.section||''))];
    return sections.map(section=>{
      const items=g.items.filter(i=>(i.section||'')===section);
      return `<section class="group-section"><h3>${esc(g.title)}${section?` / ${esc(section)}`:''}<small>${items.length}</small></h3><div class="card-grid">${items.map(card).join('')}</div></section>`;
    }).join('');
  }).join('');
  $('#empty').hidden=count>0;
  $('#empty-hint').textContent='换个关键词，或切换到全部网址试试。';
  document.querySelectorAll('.site-mark img').forEach(img=>img.addEventListener('error',()=>{img.parentElement.textContent=img.closest('.site-card').querySelector('.site-name').textContent.slice(0,1);},{once:true}));
}
function card(i){
  // Icons stay local; the destination is requested only after a user opens it.
  const icon=/^(assets|uploads|style)\/[A-Za-z0-9_./-]+$/.test(i.icon||'')&&!i.icon.includes('..')?`navigation/icons/${i.icon.split('/').at(-1)}`:'';
  return `<article class="site-card" data-id="${i.id}"><a class="site-main" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" data-visit="${i.id}" title="${esc(i.name)} · 在新标签页打开"><span class="site-mark">${icon?`<img src="${esc(icon)}" loading="lazy" alt="">`:esc(i.name.slice(0,1))}</span><span class="site-text"><strong class="site-name">${esc(i.name)}</strong><span class="site-description">${esc(i.description||domain(i.url))}</span></span></a><div class="card-actions"><button type="button" data-preview="${i.id}" aria-label="预览：${esc(i.name)}">预览</button></div></article>`;
}
function closeDirectory(){
  if(inFrame){window.parent.postMessage({type:'li-nav-close'},location.origin);return;}
  if(fromHome){location.assign('./');return;}
  window.close();
  // Manually opened browser tabs may not be script-closable; return those to the world.
  setTimeout(()=>location.replace(new URL('./?view=3d',location.href).href),80);
}
function visitLink(event){
  const link=event.target.closest?.('a[data-visit]');
  if(!link||event.defaultPrevented||fromHome||inline)return;
  // Let the native link open its destination before removing the hosting iframe/tab.
  setTimeout(closeDirectory,0);
}
function openEditor(){
  const form=$('#editor-form');form.reset();$('#editor-error').textContent='';
  form.elements.groupId.innerHTML=allGroups().map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('');
  form.elements.groupId.value=groupId!=='all'?groupId:zone.groups[0]||'quickLinks';
  $('#editor').showModal();form.elements.name.focus();
}
function preview(id){const i=entries().find(i=>i.id===id);if(!i)return;$('#preview-title').textContent=i.name;$('#preview-open').href=i.url;$('#preview-open').dataset.visit=id;const frame=document.createElement('iframe');frame.title=i.name;frame.src=i.url;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');$('#preview-frame').replaceChildren(frame);$('#preview').showModal();}
document.addEventListener('click',e=>{
  const zoneButton=e.target.closest('[data-zone]');if(zoneButton){applyZone(zoneButton.dataset.zone);return;}
  const groupButton=e.target.closest('[data-group]');if(groupButton){groupId=groupButton.dataset.group;render();return;}
  const pv=e.target.closest('[data-preview]');if(pv){preview(pv.dataset.preview);return;}
  visitLink(e);
  const close=e.target.closest('[data-close]');if(close)document.getElementById(close.dataset.close)?.close();
});
document.addEventListener('auxclick',event=>{if(event.button===1)visitLink(event);});
$('#preview').addEventListener('close',()=>$('#preview-frame').replaceChildren());
$('#query').addEventListener('input',render);$('#search-mode').addEventListener('change',render);
$('#search-form').addEventListener('submit',e=>{e.preventDefault();const q=$('#query').value.trim();if($('#search-mode').value==='local'){render();return;}if(!q){$('#query').focus();return;}const engine=data.engines.find(x=>x.id===$('#search-mode').value);if(!engine)return;const url=new URL(engine.action);if(!['http:','https:'].includes(url.protocol))return;url.searchParams.set(engine.param,q);for(const[k,v]of Object.entries(engine.extra||{}))url.searchParams.set(k,v);window.open(url.href,'_blank','noopener,noreferrer');});
$('#clear-search').addEventListener('click',()=>{$('#query').value='';render();$('#query').focus();});
$('#show-all').addEventListener('click',()=>applyZone('blog'));
$('#add-site').addEventListener('click',()=>openEditor());
$('#editor-form').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;try{store.save({name:f.elements.name.value,url:f.elements.url.value,groupId:f.elements.groupId.value,section:f.elements.section.value,description:f.elements.description.value,collections:[...(f.elements.original.checked?['original']:[]),...(f.elements.bookmarks.checked?['bookmarks']:[])]});$('#editor').close();refreshData();toast('网址已保存');}catch(error){$('#editor-error').textContent=error.message;}});
$('#undo').addEventListener('click',()=>{try{store.undo();refreshData();toast('已撤销上一步');}catch(e){toast(e.message);}});
$('#export').addEventListener('click',()=>{const backup=store.getData();if(inFrame){window.parent.postMessage({type:'li-nav-export',backup},location.origin);}else{const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Li-plus-navigation-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}toast('已导出网址备份');});
$('#import').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>8*1024*1024)throw new Error('备份文件过大，请使用本站导出的 JSON。');const incoming=JSON.parse(await file.text());store.importData(incoming);refreshData();toast('备份已导入，可撤销网址变更');}catch(error){toast(error.message);}finally{e.target.value='';}});
window.addEventListener('storage',event=>{if(event.key===null||event.key===NavigationStore.STORAGE_KEY){store=NavigationStore.create(base,storage);refreshData();}});
window.addEventListener('keydown',event=>{
  if(inline||event.defaultPrevented||event.isComposing||document.querySelector('dialog[open]'))return;
  const typing=event.target?.closest?.('input,textarea,select')||event.target?.isContentEditable;
  const toggle=event.key.toLowerCase()==='f'&&!event.repeat&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!typing;
  if(!toggle&&!(event.key==='Escape'&&inFrame))return;
  event.preventDefault();event.stopPropagation();
  closeDirectory();
});
try{
  const response=await fetch('navigation/data.json?v=20261101-directory-merge');if(!response.ok)throw new Error('网址数据未能加载，请刷新重试。');base=await response.json();
  store=NavigationStore.create(base,storage);data=store.getData();
  $('#search-mode').innerHTML='<option value="local">本站网址</option>'+data.engines.map(e=>`<option value="${esc(e.id)}">${esc(e.id==='search_1'?'百度':e.name)}</option>`).join('');
  $('#search-mode').value=data.engines.some(e=>e.id==='search_1')?'search_1':'local';
  if(fromHome){
    $('#home-return').hidden=false;
    if(params.has('q')){
      $('#search-mode').value='local';
      $('#query').value=params.get('q');
    }
  }
  render();document.body.dataset.ready='true';if(store.getNotice())toast(store.getNotice());
}catch(error){$('#result-title').textContent='目录暂时未能加载';$('#cards').textContent=error.message;}
