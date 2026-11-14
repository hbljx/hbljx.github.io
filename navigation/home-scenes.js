import { zones } from './zones.js?v=20261101-directory-merge';
import { drawZoneScene } from './pixel-island.js';

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
  const directory = document.querySelector('#directory');
  const directoryContent = document.querySelector('#directory-content');
  const homeSearch = document.querySelector('.site-search');
  const rooms = zones.filter(zone => details[zone.id]);
  const roomStats = new Map();

  for (const [index, zone] of rooms.entries()) {
    const [accent, glow, heading, summary] = details[zone.id];
    const marker = 'scene-' + zone.id;
    const link = Object.assign(document.createElement('a'), { href: '#' + marker, textContent: zone.name });
    links.append(link);

    const section = document.createElement('section');
    section.className = 'scene';
    section.id = marker;
    section.style.setProperty('--accent-room', accent);
    section.style.setProperty('--glow-room', glow);
    section.setAttribute('aria-labelledby', marker + '-title');
    const next = rooms[index+1];
    section.innerHTML = `
      <div class="scene-screen">
        <div class="scene-art"><canvas aria-hidden="true"></canvas></div>
        <div class="scene-info">
          <p class="kicker"><span></span> ${zone.en}</p>
          <h2 id="${marker}-title">${zone.name}<span>.</span></h2>
          <p class="scene-lead">${heading}</p><p class="scene-description">${summary}</p>
          <div class="scene-index"></div>
          <div class="scene-samples" aria-label="本区常用网址"></div>
          <div class="scene-actions">
            <a class="scene-enter" data-directory-zone="${zone.id}" href="#directory">浏览本区网址 <span aria-hidden="true">↗</span></a>
            <a class="scene-next" href="#${next ? 'scene-' + next.id : 'directory'}">${next ? '下一站 · '+ next.name : '查看全部网址'} ↓</a>
          </div>
        </div>
        <div class="pixel-wipe" aria-hidden="true">${'<i></i>'.repeat(12)}</div>
      </div>`;
    drawZoneScene(section.querySelector('canvas'),zone.id,accent);
    roomStats.set(zone.id, {stats:section.querySelector('.scene-index'),samples:section.querySelector('.scene-samples')});
    scenes.append(section);
  }

  document.addEventListener('li-directory-update',({detail})=>{
    for (const zone of rooms) {
      const {stats,samples} = roomStats.get(zone.id);
      const groups = detail.filter(group => zone.groups.includes(group.id) || (zone.id === 'about' && group.id === 'quickLinks'));
      const count = groups.reduce((total,group)=>total + group.items.length,0);
      stats.replaceChildren();
      const number = Object.assign(document.createElement('strong'), {textContent: count + ' 个网址'});
      const categories = Object.assign(document.createElement('span'), {textContent: groups.map(group=>group.title).join(' · ')});
      stats.append(number,categories);
      samples.replaceChildren();
      for(const item of groups.flatMap(group=>group.items).slice(0,3)){
        const sample = Object.assign(document.createElement('a'), {
          href:item.url, target:'_blank', rel:'noopener noreferrer', textContent:item.name + ' ↗',
        });
        samples.append(sample);
      }
    }
  });

  let controller;
  let loading;
  function loadDirectory() {
    loading ??= (async () => {
      const response = await fetch('directory.html');
      if (!response.ok) throw new Error('Directory unavailable');
      const source = new DOMParser().parseFromString(await response.text(),'text/html');
      const content = source.querySelector('main');
      const controls = source.querySelectorAll('body > :is(dialog, #toast, #import-file)');
      if (!content || controls.length !== 5) throw new Error('Directory markup incomplete');
      content.querySelectorAll('#home-return, .legacy-link').forEach(element=>element.remove());
      const wrapper = Object.assign(document.createElement('div'), {className:'directory-body'});
      wrapper.append(...content.children);
      directoryContent.replaceChildren(wrapper,...controls);
      controller = await import('./directory.js?v=2');
      return controller;
    })().catch(() => {
      directoryContent.innerHTML = '<p role="alert">网址目录暂时未能加载。<button type="button">重试</button></p>';
      directoryContent.querySelector('button').onclick = loadDirectory;
      loading = undefined;
    });
    return loading;
  }

  function openDirectory(zone = 'blog', query = '') {
    if (location.hash !== '#directory') history.pushState(history.state,'','#directory');
    directory.scrollIntoView({behavior:'instant'});
    document.querySelector('#directory-title').focus({preventScroll:true});
    if (controller) controller.showDirectory(zone,query);
    else loadDirectory().then(module=>module?.showDirectory(zone,query));
  }

  document.querySelector('#flat-home').addEventListener('click',event=>{
    const anchor = event.target.closest('a[href="#directory"]');
    if (!anchor || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    openDirectory(anchor.dataset.directoryZone);
  });
  document.querySelector('.site-header a[href="#directory"]').addEventListener('click',event=>{
    if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    openDirectory();
  });
  homeSearch.addEventListener('submit',event=>{
    event.preventDefault();
    openDirectory('blog',new FormData(homeSearch).get('q'));
  });
  const directoryObserver = new IntersectionObserver(([entry])=>{
    if (entry.isIntersecting) {
      directoryObserver.disconnect();
      loadDirectory();
    }
  },{rootMargin:'320px'});
  directoryObserver.observe(directory);
  // Load once after the initial render so counts reflect the same saved directory.
  if ('requestIdleCallback' in window) requestIdleCallback(loadDirectory,{timeout:1800});
  else setTimeout(loadDirectory,400);

  const sceneObserver = new IntersectionObserver(entries=>{
    for (const entry of entries) {
      links.querySelector('a[href="#'+entry.target.id+'"]').toggleAttribute('data-active',entry.isIntersecting);
    }
  },{threshold:.55});
  const panels = [...scenes.querySelectorAll('.scene')];
  panels.forEach(scene=>sceneObserver.observe(scene));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1,Math.max(0,value));
  let frame = 0;
  function updateScenes() {
    frame = 0;
    const height = window.innerHeight;
    for (const scene of panels) {
      const {top,bottom} = scene.getBoundingClientRect();
      const entry = reduced.matches ? 1 : 1 - clamp(top/(height*.83));
      const exit = reduced.matches ? 0 : 1 - clamp(bottom/(height*.48));
      scene.style.setProperty('--entry',entry);
      scene.style.setProperty('--exit',exit);
      scene.style.setProperty('--wipe',exit);
    }
  }
  function scheduleScenes() {
    if (!frame) frame = requestAnimationFrame(updateScenes);
  }
  window.addEventListener('scroll',scheduleScenes,{passive:true});
  window.addEventListener('resize',scheduleScenes);
  reduced.addEventListener('change',scheduleScenes);
  const linkedScene = panels.find(scene => '#' + scene.id === location.hash);
  if (linkedScene) linkedScene.scrollIntoView({behavior:'instant'});
  scheduleScenes();
}
