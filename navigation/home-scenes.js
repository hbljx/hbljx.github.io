import { zones } from './zones.js?v=20261101-directory-merge';
import { createRoomFrame } from './room-scenes.js';

const details = {
  about: ['#b8e675', '92 140 65', '把常用网址放在手边', '从随手收藏到每日打开的网站，常用入口都放在这里。'],
  works: ['#9af7d4', '27 130 117', '从一个想法开始', '找 AI 对话、生图、开发工具与 API 服务，把灵感做成作品。'],
  writing: ['#e0c4ff', '119 76 161', '翻开灵感书房', '从图书资源、图片设计到像素壁纸，随时查资料，也随时找灵感。'],
  coffee: ['#ffcf8a', '166 92 43', '给今天配个好声音', '在音乐网站里找歌单、听专辑，为工作或休息挑一段伴奏。'],
  lab: ['#f9d371', '151 116 44', '把工具收进车库', '从办公软件、软件资讯到网络工具，按需要打开有用的入口。'],
  court: ['#a7e8ff', '57 119 163', '从这里看行情', '集中查看行情简报、行业指数和基金工具，快速找到每天关注的数据。'],
  pool: ['#f4bde0', '127 73 111', '在花园发现好去处', '看看社区收藏和公益资源，发现值得逛的网站和平台。'],
};

export function mountScenes() {
  const scenes = document.querySelector('#zone-scenes');
  const links = document.querySelector('#scene-links');
  const sceneMenu = links.closest('details');
  sceneMenu.addEventListener('keydown',event=>{
    if (event.key !== 'Escape' || !sceneMenu.open) return;
    sceneMenu.open=false;
    sceneMenu.querySelector('summary').focus();
  });
  document.addEventListener('click',event=>{
    if (sceneMenu.open && (!sceneMenu.contains(event.target) || event.target.closest('#scene-links a'))) sceneMenu.open=false;
  });
  const searchBar = document.querySelector('#directory');
  const roomQuery = document.querySelector('#room-query');
  const roomStars = document.querySelector('#room-stars');
  const manager = document.querySelector('#room-manage');
  const matches = document.querySelector('#room-matches');
  const directoryContent = document.querySelector('#directory-content');
  const homeSearch = document.querySelector('.site-search');
  const rooms = zones.filter(zone => details[zone.id]);
  const groupOwners = new Map();
  for (const zone of rooms) {
    for (const group of zone.groups) if (!groupOwners.has(group)) groupOwners.set(group,zone.id);
  }
  groupOwners.set('quickLinks','about');
  const roomStats = new Map();
  const roomFrames = new Map();

  for (const [index, zone] of rooms.entries()) {
    const [accent, glow, heading, summary] = details[zone.id];
    const marker = 'scene-' + zone.id;
    const link = Object.assign(document.createElement('a'), { href: '#' + marker, textContent: zone.name });
    const caption = Object.assign(document.createElement('small'), {textContent:zone.label});
    const arrow = Object.assign(document.createElement('span'), {textContent:'↗'});
    arrow.setAttribute('aria-hidden','true');
    link.append(caption,arrow);
    links.append(link);

    const section = document.createElement('section');
    section.className = 'scene';
    section.id = marker;
    section.dataset.room=zone.id;
    section.style.setProperty('--accent-room', accent);
    section.style.setProperty('--glow-room', glow);
    section.setAttribute('aria-labelledby', marker + '-title');
    const next = rooms[index+1];
    section.innerHTML = `
      <div class="scene-cinema"><div class="scene-screen">
        <div class="scene-art"><img alt="" width="1440" height="960" decoding="async"></div>
        <div class="scene-opening" aria-hidden="true"><span>${zone.name}</span><small>↓ 滚动探索</small></div>
        <div class="scene-meter" aria-hidden="true"><i></i></div>
        <div class="scene-info">
          <p class="kicker"><span></span> ${zone.en}</p>
          <h2 id="${marker}-title">${zone.name}<span>.</span></h2>
          <p class="scene-lead">${heading}</p><p class="scene-description">${summary}</p>
          <div class="scene-index"></div>
          <div class="scene-actions">
            <a class="scene-enter" href="#${marker}-links">查看本区全部网址 <span aria-hidden="true">↓</span></a>
            <a class="scene-next" href="#${next ? 'scene-' + next.id : 'zones'}">${next ? '下一站 · '+ next.name : '返回场景分类'} ↓</a>
          </div>
        </div>
        ${sceneDecoration(zone.id)}
        <div class="chapter-strip" aria-hidden="true"></div>
      </div></div>
      <div class="room-directory pixel-directory" id="${marker}-links" tabindex="-1">
        <div class="room-heading"><h3>网址收藏</h3><span>${zone.name}</span></div><div class="room-groups"></div>
      </div>`;
    const paint=createRoomFrame(section.querySelector('img'),zone.id);
    roomFrames.set(section,{paint,progress:-1});
    roomStats.set(zone.id, {stats:section.querySelector('.scene-index'),list:section.querySelector('.room-groups'),strip:section.querySelector('.chapter-strip')});
    scenes.append(section);
  }

  let snapshot;
  function renderRooms() {
    if (!snapshot) return;
    const {groups,stars} = snapshot;
    const query = roomQuery.value.trim().toLocaleLowerCase();
    const starOnly = roomStars.getAttribute('aria-pressed') === 'true';
    const visible = new Set();
    matches.replaceChildren();

    for (const zone of rooms) {
      const {stats,list,strip} = roomStats.get(zone.id);
      const categories = groups.filter(group => groupOwners.get(group.id) === zone.id);
      const total=categories.reduce((count,group)=>count+group.items.length,0);
      stats.textContent = total + ' 个网址 · ' + categories.map(group=>group.title).join(' · ');
      if (zone.id==='court') roomFrames.get(stats.closest('.scene')).total=total;
      strip.replaceChildren(...categories.map(group=>Object.assign(document.createElement('span'),{textContent:group.title})));
      scheduleScenes();
      list.replaceChildren();
      let matchCount = 0;
      for (const group of categories) {
        const entries = group.items.filter(item => (!starOnly || stars.has(item.id)) &&
          [item.name,item.url,item.description,item.section,group.title,...(item.aliases || [])].join(' ').toLocaleLowerCase().includes(query));
        if (!entries.length) continue;
        entries.forEach(item => visible.add(item.id));
        matchCount += entries.length;
        const category = document.createElement('section');
        category.className = 'room-category';
        const title = Object.assign(document.createElement('h4'),{textContent:group.title});
        title.append(Object.assign(document.createElement('small'),{textContent:entries.length}));
        const grid = document.createElement('div');
        grid.className = 'room-card-grid';
        for (const item of entries) {
          const card = document.createElement('article');
          card.className = 'room-card';
          card.dataset.site = item.id;
          const link = Object.assign(document.createElement('a'),{
            href:item.url,target:'_blank',rel:'noopener noreferrer',
          });
          const note = Object.assign(document.createElement('small'),{
            textContent:item.description || new URL(item.url).hostname,
          });
          const mark = Object.assign(document.createElement('span'), {className:'room-mark',textContent:item.name.trim().slice(0,1)});
          mark.setAttribute('aria-hidden','true');
          if (/^(assets|uploads|style)\/[A-Za-z0-9_./-]+$/.test(item.icon||'') && !item.icon.includes('..')) {
            const icon = Object.assign(document.createElement('img'), {src:'navigation/icons/'+item.icon.split('/').at(-1),loading:'lazy',alt:''});
            icon.addEventListener('error',()=>icon.remove(),{once:true});
            mark.append(icon);
          }
          const text = Object.assign(document.createElement('span'),{className:'room-card-text'});
          text.append(Object.assign(document.createElement('strong'),{textContent:item.name}),note);
          const exit = Object.assign(document.createElement('span'),{className:'room-card-exit',textContent:'↗'});
          exit.setAttribute('aria-hidden','true');
          link.append(mark,text,exit);
          const star = Object.assign(document.createElement('button'),{type:'button',textContent:stars.has(item.id)?'★':'☆'});
          star.dataset.star = item.id;
          star.setAttribute('aria-pressed',String(stars.has(item.id)));
          star.setAttribute('aria-label',(stars.has(item.id)?'取消星标：':'添加星标：')+item.name);
          const edit = Object.assign(document.createElement('button'),{type:'button',textContent:'编辑'});
          edit.dataset.edit=item.id;
          edit.setAttribute('aria-label','编辑：'+item.name);
          const actions = Object.assign(document.createElement('div'),{className:'room-card-actions'});
          actions.append(star,edit);
          card.append(link,actions);
          grid.append(card);
        }
        category.append(title,grid);
        list.append(category);
      }
      if (!matchCount) list.textContent = '本场景没有符合条件的网址。';
      if (matchCount) matches.append(Object.assign(document.createElement('a'), {
        href:'#scene-'+zone.id+'-links',textContent:zone.name+' · '+matchCount,
      }));
    }
    document.querySelector('#room-result-count').textContent = visible.size+' 个网址';
  }
  document.addEventListener('li-directory-update',({detail})=>{
    snapshot=detail;
    renderRooms();
  });
  roomQuery.addEventListener('input',renderRooms);
  roomStars.addEventListener('click',()=>{
    const next=roomStars.getAttribute('aria-pressed')!=='true';
    roomStars.setAttribute('aria-pressed',String(next));
    renderRooms();
  });
  document.querySelector('[data-open-search]').addEventListener('click',()=>searchBar.showModal());
  document.querySelector('#manage-links').addEventListener('click',()=>manager.showModal());
  matches.addEventListener('click',event=>{
    const link=event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    searchBar.close();
  });
  homeSearch.addEventListener('submit',event=>{
    event.preventDefault();
    roomQuery.value=new FormData(homeSearch).get('q');
    roomStars.setAttribute('aria-pressed','false');
    renderRooms();
    searchBar.showModal();
    roomQuery.focus();
  });

  async function loadDirectory() {
    try {
      const response=await fetch('directory.html');
      if (!response.ok) throw new Error('Directory unavailable');
      const source=new DOMParser().parseFromString(await response.text(),'text/html');
      const content=source.querySelector('main');
      const footer=content.querySelector('footer');
      const controls=[...source.querySelectorAll('body > :is(dialog, #toast, #import-file)')];
      const hidden=document.createElement('div');
      hidden.hidden=true;
      hidden.append(...[...content.children].filter(node=>node!==footer));
      directoryContent.replaceChildren(hidden,footer,...controls);
      document.querySelector('#room-tools').append(footer);
      footer.querySelector('#add-site').addEventListener('click',()=>manager.close());
      // Management actions reuse the directory's storage, validation and dialogs.
      await import('./directory.js?v=3');
    } catch {
      directoryContent.textContent='网址暂时无法加载，请刷新重试。';
    }
  }
  void loadDirectory();

  const sceneObserver = new IntersectionObserver(entries=>{
    for (const entry of entries) {
      const id=entry.target.closest('.scene').id;
      links.querySelector('a[href="#'+id+'"]').toggleAttribute('data-active',entry.isIntersecting);
    }
  },{threshold:.55});
  const panels = [...scenes.querySelectorAll('.scene')];
  const preload = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const frame = roomFrames.get(entry.target.closest('.scene'));
      if (frame.progress < 0) frame.paint(.1);
      preload.unobserve(entry.target);
    }
  },{rootMargin:'560px'});
  for (const scene of panels) {
    sceneObserver.observe(scene.querySelector('.scene-screen'));
    preload.observe(scene.firstElementChild);
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1,Math.max(0,value));
  const easing = value => value * value * (3 - 2 * value);
  const compact = matchMedia('(max-height: 640px)');
  let frame = 0;
  function updateScenes() {
    frame = 0;
    const height = window.innerHeight;
    for (const scene of panels) {
      const cinema=scene.firstElementChild;
      const {top,bottom} = cinema.getBoundingClientRect();
      if (top > height * 1.3 || bottom < -height * .25) continue;
      const range = Math.max(1,cinema.offsetHeight - cinema.firstElementChild.offsetHeight);
      const staticView = reduced.matches || compact.matches;
      const progress = staticView ? .66 : clamp(-top / range);
      const inset = staticView ? 1 : easing(clamp((progress-.13)/.57));
      const reveal = staticView ? 1 : easing(clamp((progress-.3)/.38));
      const outro = staticView ? 0 : easing(clamp((progress-.76)/.24));
      const sweep = staticView ? 1 : easing(clamp((progress-.08)/.62));
      scene.style.setProperty('--sweep',sweep);
      scene.style.setProperty('--outro',outro);
      scene.toggleAttribute('data-static',staticView);
      scene.style.setProperty('--shot',inset);
      scene.style.setProperty('--copy',reveal);
      scene.toggleAttribute('data-copy',reveal>.1);
      if (scene.dataset.room==='lab') {
        const chapters=scene.querySelector('.chapter-strip').children;
        const step=Math.min(chapters.length-1,Math.floor(sweep*chapters.length));
        for (const [i,chapter] of Array.from(chapters).entries()) chapter.toggleAttribute('data-current',i===step);
      }
      scene.style.setProperty('--track',progress);
      scene.style.setProperty('--opening',staticView ? 0 : 1 - easing(clamp(progress/.43)));
      const room = roomFrames.get(scene);
      if (room.total !== undefined) {
        const counter=scene.querySelector('.scene-counter strong');
        const value=String(Math.round(room.total*sweep));
        if (counter.textContent!==value) counter.textContent=value;
      }
      const shot = Math.round(progress * 119)/119;
      if (shot !== room.progress) {
        room.progress = shot;
        room.paint(shot);
      }
    }
  }
  function scheduleScenes() {
    if (!frame) frame = requestAnimationFrame(updateScenes);
  }
  window.addEventListener('scroll',scheduleScenes,{passive:true});
  window.addEventListener('resize',scheduleScenes);
  new ResizeObserver(scheduleScenes).observe(scenes);
  reduced.addEventListener('change',scheduleScenes);
  const linkedScene = panels.find(scene => '#' + scene.id === location.hash);
  if (linkedScene) linkedScene.scrollIntoView({behavior:'instant'});
  else if (location.hash.startsWith('#scene-')) document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant'});
  scheduleScenes();
}

function sceneDecoration(id) {
  if (id==='about') return '<div class="room-route" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
  if (id==='works') return '<div class="room-scan" aria-hidden="true"></div>';
  if (id==='coffee') return '<div class="room-record" aria-hidden="true"></div>';
  if (id==='lab') return '<div class="room-shutter" aria-hidden="true"></div>';
  if (id==='court') return '<div class="scene-counter" aria-hidden="true"><strong>0</strong><span>个网址</span><i></i></div>';
  if (id==='pool') return '<div class="room-light" aria-hidden="true"></div>';
  return '';
}
