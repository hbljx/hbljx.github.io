import { zones } from './zones.js';
// The store is bundled here so the current directory does not depend on legacy files.
/* Local navigation data. No network access and no HTML evaluation. */
const NavigationStore = (() => {
  "use strict";
  const STORAGE_KEY = "li-plus-navigation-v1";
  const clone = value => JSON.parse(JSON.stringify(value));
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const fail = message => { throw new Error(message); };
  function text(value, label, max, required = false) {
    if (value === undefined && !required) return "";
    if (typeof value !== "string") fail(`${label}格式不正确。`);
    const result = value.trim();
    if (required && !result) fail(`请填写${label}。`);
    if (result.length > max) fail(`${label}不能超过 ${max} 个字符。`);
    return result;
  }
  function url(value) {
    const input = text(value, "网址", 4096, true);
    if (!/^https?:\/\//i.test(input) || /[\u0000-\u0020\u007f]/.test(input)) fail("网址须以 https:// 或 http:// 开头，且不能包含空格。");
    let parsed;
    try { parsed = new URL(input); } catch { fail("请输入有效的网址。"); }
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) fail("网址不能包含登录凭据，且仅支持 HTTP 或 HTTPS。");
    return parsed.href;
  }
  function icon(value) {
    const input = text(value, "图标地址", 4096);
    if (!input) return "";
    if (/^https:\/\//i.test(input)) return url(input);
    if (/^(?:assets|uploads|style)\/[A-Za-z0-9_./-]+$/.test(input) && !input.split('/').some(part => part === '..' || part === '.')) return input;
    fail("图标仅支持站内素材路径或 HTTPS 图片地址。");
  }
  function collections(value) {
    if (!Array.isArray(value) || !value.length || value.some(item => item !== "original" && item !== "bookmarks")) fail("请至少选择一个有效的收藏范围。");
    return [...new Set(value)];
  }
  function stableId(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619) >>> 0;
    return `site-${hash.toString(36)}`;
  }
  function create(baseData, storage) {
    if (!isRecord(baseData) || !Array.isArray(baseData.groups) || !Array.isArray(baseData.quickLinks)) fail("网站初始数据格式不正确。");
    const template = clone(baseData);
    const groupIds = new Set();
    for (const group of template.groups) {
      if (!isRecord(group) || typeof group.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(group.id) || group.id === "quickLinks" || groupIds.has(group.id)) fail("网站分类数据格式不正确。");
      groupIds.add(group.id);
    }
    function normalizeData(value) {
      if (!isRecord(value) || !Array.isArray(value.groups) || !Array.isArray(value.quickLinks)) fail("请选择由本站导出的 JSON 备份文件。");
      const incomingGroups = new Map();
      for (const group of value.groups) {
        if (!isRecord(group) || !groupIds.has(group.id) || incomingGroups.has(group.id) || !Array.isArray(group.items)) fail("备份文件中的分类与当前网站不匹配。");
        incomingGroups.set(group.id, group);
      }
      if (incomingGroups.size !== groupIds.size) fail("备份文件缺少分类，请使用完整备份。");
      const usedUrls = new Set(), usedIds = new Set();
      let count = 0;
      function normalizeItem(item) {
        if (!isRecord(item)) fail("备份中包含无效的网址条目。");
        if (++count > 10000) fail("单份备份最多支持 10000 个网址。");
        const normalizedUrl = url(item.url);
        if (usedUrls.has(normalizedUrl)) fail(`网址已存在：${normalizedUrl}`);
        usedUrls.add(normalizedUrl);
        let id = item.id;
        if (id === undefined) {
          id = stableId(normalizedUrl);
          let suffix = 1;
          while (usedIds.has(id)) id = `${stableId(normalizedUrl)}-${suffix++}`;
        }
        if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || usedIds.has(id)) fail("备份中的网址编号无效或重复。");
        usedIds.add(id);
        const result = { id, name: text(item.name, "网站名称", 200, true), url: normalizedUrl, description: text(item.description, "说明", 1000), icon: icon(item.icon), collections: collections(item.collections === undefined ? ["original"] : item.collections) };
        if (item.section !== undefined) result.section = text(item.section, "分区", 120);
        if (item.bookmarkFolder !== undefined) result.bookmarkFolder = text(item.bookmarkFolder, "书签文件夹", 200);
        if (item.aliases !== undefined) {
          if (!Array.isArray(item.aliases) || item.aliases.length > 30) fail("网址别名格式不正确。");
          result.aliases = item.aliases.map(value => text(value, "网址别名", 200));
        }
        return result;
      }
      // Configuration, categories and search engines always come from this site's source.
      const result = clone(template);
      result.quickLinks = value.quickLinks.map(normalizeItem);
      result.groups = template.groups.map(group => ({ ...clone(group), items: incomingGroups.get(group.id).items.map(normalizeItem) }));
      return result;
    }
    const base = normalizeData(baseData);
    const baseJSON = JSON.stringify(base);
    let data = clone(base), previous = null, notice = "";
    if (storage && typeof storage.getItem === "function") {
      try {
        const saved = storage.getItem(STORAGE_KEY);
        if (saved !== null && saved !== undefined) {
          const parsed = JSON.parse(saved);
          if (!isRecord(parsed) || parsed.version !== 1) fail("不支持的备份版本。");
          data = normalizeData(parsed.data);
        }
      } catch {
        notice = "无法读取本地收藏，已显示网站默认内容。原有本地数据未覆盖。";
      }
    } else notice = "浏览器未开放本地存储，当前无法保存修改。";

    function persist(next) {
      try {
        if (!storage || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") throw new Error("Storage unavailable");
        if (JSON.stringify(next) === baseJSON) storage.removeItem(STORAGE_KEY);
        else storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: next }));
      } catch { fail("保存失败：浏览器存储不可用或空间不足。当前收藏没有改动，请先导出备份或检查浏览器设置。"); }
    }
    function commit(next) {
      persist(next);
      previous = data;
      data = next;
      notice = "";
    }
    function allItems(source) { return [...source.quickLinks, ...source.groups.flatMap(group => group.items)]; }
    function locate(source, id) {
      if (typeof id !== "string" || !id) fail("找不到这个网址，请刷新后重试。");
      for (const group of [{ id: "quickLinks", items: source.quickLinks }, ...source.groups]) {
        const index = group.items.findIndex(item => item.id === id);
        if (index !== -1) return { item: group.items[index], list: group.items, index, groupId: group.id };
      }
      fail("找不到这个网址，可能已被删除。");
    }
    function save(input) {
      if (!isRecord(input)) fail("网址内容格式不正确。");
      const next = clone(data);
      const found = input.id ? locate(next, input.id) : null;
      if (input.groupId !== "quickLinks" && !groupIds.has(input.groupId)) fail("请选择有效的网站分类。");
      const normalizedUrl = url(input.url);
      if (allItems(next).some(item => item.url === normalizedUrl && item.id !== found?.item.id)) fail("这个网址已经在收藏中，请编辑现有条目。");
      let id = found?.item.id || stableId(normalizedUrl);
      if (!found) {
        let suffix = 1;
        while (allItems(next).some(item => item.id === id)) id = `${stableId(normalizedUrl)}-${suffix++}`;
      }
      const item = { ...(found?.item || {}), id, name: text(input.name, "网站名称", 200, true), url: normalizedUrl, description: text(input.description, "说明", 1000), collections: collections(input.collections), section: text(input.section, "分区", 120) };
      if (!found || found.item.url !== normalizedUrl) { item.icon = ""; item.aliases = []; }
      if (input.groupId === "quickLinks") delete item.section;
      else if (found?.groupId !== input.groupId) {
        const group = next.groups.find(group => group.id === input.groupId);
        if (group.originalFolder) item.bookmarkFolder = group.originalFolder;
        else delete item.bookmarkFolder;
      }
      const target = input.groupId === "quickLinks" ? next.quickLinks : next.groups.find(group => group.id === input.groupId).items;
      if (found?.groupId === input.groupId) target[found.index] = item;
      else { if (found) found.list.splice(found.index, 1); target.push(item); }
      commit(normalizeData(next));
      return id;
    }
    return {
      getData: () => clone(data),
      getNotice: () => notice,
      save,
      remove(id) {
        const next = clone(data), found = locate(next, id);
        found.list.splice(found.index, 1);
        commit(next);
      },
      undo() {
        if (!previous) return false;
        persist(previous);
        data = previous;
        previous = null;
        notice = "";
        return true;
      },
      reset() { commit(clone(base)); },
      importData(value) {
        let parsed = value;
        if (typeof value === "string") {
          try { parsed = JSON.parse(value); } catch { fail("JSON 文件无法读取，请选择有效的收藏备份。"); }
        }
        commit(normalizeData(parsed));
      },
      exportData: () => JSON.stringify(data, null, 2),
      hasSavedChanges: () => JSON.stringify(data) !== baseJSON,
      canUndo: () => previous !== null
    };
  }
  return Object.freeze({ create, STORAGE_KEY });
})();


const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inFrame=window.parent!==window;
document.body.classList.toggle('embedded',inFrame);
const params=new URLSearchParams(location.search);
let zone=zones.find(z=>z.id===params.get('zone'))||zones[0],groupId='all',filter='all',editingId=null,store,base,data;
let storage;try{storage=localStorage;}catch{}
const readArray=key=>{try{const v=JSON.parse(storage?.getItem(key)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch{return [];}};
const STAR='li-homecraft-stars-v1',RECENT='li-homecraft-recent-v1';
let stars=new Set(readArray(STAR)),recent=readArray(RECENT),toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
function writeArray(key,value){try{if(!storage)throw new Error();storage.setItem(key,JSON.stringify(value));return true;}catch{toast('浏览器暂时无法保存，请导出备份。');return false;}}
const groupPriority=new Map(['common-sites','common-tools','software-news'].map((id,index)=>[id,index]));
const allGroups=()=>[{id:'quickLinks',title:'快捷入口',items:data.quickLinks},...data.groups]
  .sort((a,b)=>(groupPriority.get(a.id)??groupPriority.size)-(groupPriority.get(b.id)??groupPriority.size));
const entries=()=>allGroups().flatMap(g=>g.items.map(item=>({...item,groupId:g.id,groupTitle:g.title})));
function inZone(g){return !zone.groups.length||zone.groups.includes(g.id)||(zone.id==='about'&&g.id==='quickLinks');}
const domain=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return url;}};
function refreshData(){data=store.getData();$('#undo').hidden=!store.canUndo();render();}
function applyZone(id){zone=zones.find(z=>z.id===id)||zones[0];groupId='all';filter='all';$('#query').value='';try{const u=new URL(location.href);u.searchParams.set('zone',zone.id);history.replaceState(null,'',u);}catch{}render();}
function render(){
  if(!data)return;
  document.title=`${zone.name} · Li+ 像素导航`;
  $('#total-count').textContent=entries().length;
  $('#zone-nav').innerHTML=zones.map(z=>`<button type="button" data-zone="${z.id}" aria-current="${z.id===zone.id}">${esc(z.name)}</button>`).join('');
  const available=allGroups().filter(inZone);
  const sideCount=available.reduce((n,g)=>n+g.items.length,0);
  $('#group-nav').innerHTML=`<button type="button" data-group="all" aria-current="${groupId==='all'&&filter==='all'}">${zone.id==='blog'?'全部网址':'本区全部'}<span>${sideCount}</span></button>`+available.map(g=>`<button type="button" data-group="${g.id}" aria-current="${groupId===g.id&&filter==='all'}">${esc(g.title)}<span>${g.items.length}</span></button>`).join('');
  $('#favorites-filter').setAttribute('aria-pressed',filter==='stars');
  $('#recent-filter').setAttribute('aria-pressed',filter==='recent');
  $('#favorites-filter').textContent=`${filter==='stars'?'★':'☆'} 星标收藏 · ${entries().filter(i=>stars.has(i.id)).length}`;
  const raw=$('#query').value.trim().toLocaleLowerCase();
  const local=$('#search-mode').value==='local',q=local?raw:'';
  const engine=data.engines.find(e=>e.id===$('#search-mode').value);
  $('#query').placeholder=local?'搜索名称、域名或分类…':engine?.placeholder||'输入关键词搜索…';
  $('#query').setAttribute('aria-label',local?'搜索本站网址':`使用${engine?.id==='search_1'?'百度':engine?.name||'搜索引擎'}搜索`);
  $('#search-tip').textContent=local?'输入即筛选 · Enter 搜索':'Enter 在新标签页搜索';
  $('#clear-search').hidden=!raw;
  let groups=filter==='all'?available.filter(g=>groupId==='all'||groupId===g.id):[{id:filter,title:filter==='stars'?'星标收藏':'最近打开',items:entries().filter(i=>filter==='stars'?stars.has(i.id):recent.includes(i.id)).sort((a,b)=>filter==='recent'?recent.indexOf(a.id)-recent.indexOf(b.id):0)}];
  groups=groups.map(g=>({...g,items:g.items.filter(i=>!q||[i.name,i.url,i.description,i.section,i.bookmarkFolder,g.title,i.groupTitle,...(i.aliases||[])].join(' ').toLocaleLowerCase().includes(q))})).filter(g=>g.items.length);
  const count=groups.reduce((n,g)=>n+g.items.length,0);
  $('#result-title').textContent=filter==='stars'?'星标收藏':filter==='recent'?'最近打开':groupId==='all'?zone.name:(allGroups().find(g=>g.id===groupId)?.title||zone.name);
  $('#result-eyebrow').textContent=q?'SEARCH RESULTS':'YOUR COLLECTION';
  $('#result-count').textContent=`${count} 个网址`;
  $('#cards').innerHTML=groups.map(g=>{
    const sections=[...new Set(g.items.map(i=>i.section||''))];
    return sections.map(section=>{
      const items=g.items.filter(i=>(i.section||'')===section);
      return `<section class="group-section"><h3>${esc(g.title)}${section?` / ${esc(section)}`:''}<small>${items.length}</small></h3><div class="card-grid">${items.map(card).join('')}</div></section>`;
    }).join('');
  }).join('');
  $('#empty').hidden=count>0;
  $('#empty-hint').textContent=filter==='stars'&&!q?'点击网址卡片下的 ☆，把常用网站放在这里。':filter==='recent'&&!q?'从目录打开网址后，会在这里留下记录。':'换个关键词，或切换到全部网址试试。';
  document.querySelectorAll('.site-mark img').forEach(img=>img.addEventListener('error',()=>{img.parentElement.textContent=img.closest('.site-card').querySelector('.site-name').textContent.slice(0,1);},{once:true}));
}
function card(i){
  // Icons stay local; the destination is requested only after a user opens it.
  const icon=/^(assets|uploads|style)\/[A-Za-z0-9_./-]+$/.test(i.icon||'')&&!i.icon.includes('..')?`navigation/icons/${i.icon.split('/').at(-1)}`:'';
  return `<article class="site-card" data-id="${i.id}"><a class="site-main" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" data-visit="${i.id}" title="${esc(i.name)} · 在新标签页打开"><span class="site-mark">${icon?`<img src="${esc(icon)}" loading="lazy" alt="">`:esc(i.name.slice(0,1))}</span><span class="site-text"><strong class="site-name">${esc(i.name)}</strong><span class="site-description">${esc(i.description||domain(i.url))}</span></span></a><div class="card-actions"><button type="button" class="star" data-star="${i.id}" aria-label="${stars.has(i.id)?'取消星标':'添加星标'}：${esc(i.name)}" aria-pressed="${stars.has(i.id)}">${stars.has(i.id)?'★':'☆'}</button><button type="button" data-preview="${i.id}" aria-label="预览：${esc(i.name)}">预览</button><button type="button" data-edit="${i.id}" aria-label="编辑：${esc(i.name)}">编辑</button></div></article>`;
}
function record(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,24);writeArray(RECENT,recent);}
function closeDirectory(){
  if(inFrame){window.parent.postMessage({type:'li-nav-close'},location.origin);return;}
  window.close();
  // Manually opened browser tabs may not be script-closable; return those to the world.
  setTimeout(()=>location.replace(new URL('./',location.href).href),80);
}
function visitLink(event){
  const link=event.target.closest?.('a[data-visit]');
  if(!link||event.defaultPrevented)return;
  record(link.dataset.visit);
  // Let the native link open its destination before removing the hosting iframe/tab.
  setTimeout(closeDirectory,0);
}
function openEditor(id){
  editingId=id||null;const item=id?entries().find(i=>i.id===id):null;
  const form=$('#editor-form');form.reset();$('#editor-error').textContent='';
  $('#editor-title').textContent=item?'编辑网址':'添加网址';$('#delete-site').hidden=!item;
  form.elements.groupId.innerHTML=allGroups().map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('');
  form.elements.groupId.value=item?.groupId||(groupId!=='all'?groupId:zone.groups[0]||'quickLinks');
  for(const name of ['name','url','section','description'])form.elements[name].value=item?.[name]||'';
  form.elements.original.checked=!item||item.collections.includes('original');
  form.elements.bookmarks.checked=!!item?.collections.includes('bookmarks');
  $('#editor').showModal();form.elements.name.focus();
}
function preview(id){const i=entries().find(i=>i.id===id);if(!i)return;$('#preview-title').textContent=i.name;$('#preview-open').href=i.url;$('#preview-open').dataset.visit=id;const frame=document.createElement('iframe');frame.title=i.name;frame.src=i.url;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');$('#preview-frame').replaceChildren(frame);$('#preview').showModal();}
document.addEventListener('click',e=>{
  const zoneButton=e.target.closest('[data-zone]');if(zoneButton){applyZone(zoneButton.dataset.zone);return;}
  const groupButton=e.target.closest('[data-group]');if(groupButton){groupId=groupButton.dataset.group;filter='all';render();return;}
  const star=e.target.closest('[data-star]');if(star){const id=star.dataset.star;if(stars.has(id))stars.delete(id);else stars.add(id);writeArray(STAR,[...stars]);render();document.querySelector(`[data-star="${id}"]`)?.focus();return;}
  const edit=e.target.closest('[data-edit]');if(edit){openEditor(edit.dataset.edit);return;}
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
$('#favorites-filter').addEventListener('click',()=>{filter=filter==='stars'?'all':'stars';render();});
$('#recent-filter').addEventListener('click',()=>{filter=filter==='recent'?'all':'recent';render();});
$('#add-site').addEventListener('click',()=>openEditor());
$('#editor-form').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;try{store.save({id:editingId||undefined,name:f.elements.name.value,url:f.elements.url.value,groupId:f.elements.groupId.value,section:f.elements.section.value,description:f.elements.description.value,collections:[...(f.elements.original.checked?['original']:[]),...(f.elements.bookmarks.checked?['bookmarks']:[])]});$('#editor').close();refreshData();toast('网址已保存');}catch(error){$('#editor-error').textContent=error.message;}});
$('#delete-site').addEventListener('click',()=>{$('#confirm-text').textContent=entries().find(i=>i.id===editingId)?.name||'';$('#confirm').showModal();});
$('#confirm').addEventListener('close',()=>{if($('#confirm').returnValue!=='delete')return;try{store.remove(editingId);$('#editor').close();refreshData();toast('已删除，可点击页脚的“撤销”恢复');}catch(error){$('#editor-error').textContent=error.message;}});
$('#undo').addEventListener('click',()=>{try{store.undo();refreshData();toast('已撤销上一步');}catch(e){toast(e.message);}});
$('#export').addEventListener('click',()=>{const backup={...store.getData(),liPlusFavorites:[...stars]};if(inFrame){window.parent.postMessage({type:'li-nav-export',backup},location.origin);}else{const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Li-plus-navigation-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}toast('已导出网址和星标备份');});
$('#import').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>8*1024*1024)throw new Error('备份文件过大，请使用本站导出的 JSON。');const incoming=JSON.parse(await file.text());store.importData(incoming);if(Array.isArray(incoming.liPlusFavorites)){stars=new Set(incoming.liPlusFavorites.filter(id=>typeof id==='string'));writeArray(STAR,[...stars]);}refreshData();toast('备份已导入，可撤销网址变更');}catch(error){toast(error.message);}finally{e.target.value='';}});
window.addEventListener('storage',event=>{if(event.key===NavigationStore.STORAGE_KEY){store=NavigationStore.create(base,storage);refreshData();}if(event.key===STAR){stars=new Set(readArray(STAR));render();}if(event.key===RECENT){recent=readArray(RECENT);render();}});
window.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.isComposing||document.querySelector('dialog[open]'))return;
  const typing=event.target?.closest?.('input,textarea,select')||event.target?.isContentEditable;
  const toggle=event.key.toLowerCase()==='f'&&!event.repeat&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!typing;
  if(!toggle&&!(event.key==='Escape'&&inFrame))return;
  event.preventDefault();event.stopPropagation();
  closeDirectory();
});
try{
  const response=await fetch('navigation/data.json');if(!response.ok)throw new Error('网址数据未能加载，请刷新重试。');base=await response.json();
  store=NavigationStore.create(base,storage);data=store.getData();
  $('#search-mode').innerHTML='<option value="local">本站网址</option>'+data.engines.map(e=>`<option value="${esc(e.id)}">${esc(e.id==='search_1'?'百度':e.name)}</option>`).join('');
  $('#search-mode').value=data.engines.some(e=>e.id==='search_1')?'search_1':'local';
  render();document.body.dataset.ready='true';if(store.getNotice())toast(store.getNotice());
}catch(error){$('#result-title').textContent='目录暂时未能加载';$('#cards').textContent=error.message;}
