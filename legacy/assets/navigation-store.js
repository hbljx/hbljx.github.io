/* Local navigation data. No network access and no HTML evaluation. */
(() => {
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
  globalThis.LiNavStore = Object.freeze({ create, STORAGE_KEY });
})();
