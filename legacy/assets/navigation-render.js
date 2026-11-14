/* Shared static and browser renderer. Data is escaped before entering markup. */
(() => {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const tones = ["mint", "orange", "blue", "purple"];
  const iconNames = new Set(["plus", "search", "arrow", "grid", "clock", "sun", "moon", "voice", "image", "seat", "car", "folder", "book", "heart", "star", "code", "briefcase", "cloud", "key", "close"]);
  const svg = (name, className = "pixel-icon") => `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><use href="#px-${iconNames.has(name) ? name : "folder"}"/></svg>`;

  function websiteURL(value) {
    let url;
    try { url = new URL(String(value || "")); } catch { throw new Error("网址格式不正确，无法显示。"); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("网址只支持不含登录凭据的 HTTP 或 HTTPS 链接。");
    return url;
  }

  function iconURL(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    const raw = value.trim();
    if (/^https:\/\//i.test(raw)) {
      try { return websiteURL(raw).href; } catch { return ""; }
    }
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch { return ""; }
    if (/^[./\\]/.test(decoded) || /[:\\?#\u0000-\u001f\u007f]/.test(decoded) || decoded.split("/").some(part => part === ".." || part === ".")) return "";
    try {
      const parsed = new URL(raw, "https://navigation-local.invalid/");
      return parsed.origin === "https://navigation-local.invalid" ? raw : "";
    } catch { return ""; }
  }

  function requireID(item) {
    if (!item || typeof item.id !== "string" || !item.id.trim()) throw new Error("网址缺少稳定 ID，请先使用 LiNavStore 规范化数据。");
    return item.id;
  }

  function renderItem(item, group = null) {
    const id = requireID(item);
    const url = websiteURL(item.url);
    const pinned = group === null;
    const compact = false;
    const bookmark = group?.origin === "bookmarks";
    const collections = Array.isArray(item.collections) ? item.collections.filter(value => value === "original" || value === "bookmarks") : ["original"];
    const search = [group?.title, group?.originalFolder, item.name, item.description, item.section, ...(Array.isArray(item.aliases) ? item.aliases : []), item.url].filter(Boolean).join(" ");
    const attrs = `href="${esc(url.href)}" target="_blank" rel="noopener noreferrer" data-search-item data-site-id="${esc(id)}"${pinned ? " data-search-pinned" : ""} data-collections="${esc(collections.join(" "))}" data-search="${esc(search)}" title="${esc(`${item.description || item.name}（在新标签页打开）`)}"`;
    let link;
    if (pinned) {
      link = `<a ${attrs}>${esc(item.name)}</a>`;
    } else if (compact) {
      link = `<a class="compact-link" ${attrs}><span>${esc(item.name)}</span><span aria-hidden="true">↗</span></a>`;
    } else {
      const icon = iconURL(item.icon);
      const mark = icon ? `<img src="${esc(icon)}" alt="" loading="lazy" width="30" height="30">` : `<span class="site-letter" aria-hidden="true">${esc([...String(item.name || "")][0]?.toUpperCase() || "+")}</span>`;
      const host = url.hostname.replace(/^www\./, "");
      link = `<a class="directory-card${bookmark ? " bookmark-card" : ""}" ${attrs}><span class="site-mark">${mark}</span><span class="site-content"><strong>${esc(item.name)}</strong><span class="${bookmark ? "site-domain" : "site-description"}">${esc(bookmark ? host : item.description || host)}</span></span>${svg("arrow", "link-arrow")}</a>`;
    }
    const actions = `<div class="site-edit-actions enhanced-only"><button type="button" data-site-edit="${esc(id)}" aria-label="${esc(`编辑：${item.name}`)}">编辑</button><button type="button" data-site-delete="${esc(id)}" aria-label="${esc(`删除：${item.name}`)}">删除</button></div>`;
    return `<div class="site-entry${pinned ? " site-entry--pinned" : compact ? " site-entry--compact" : ""}" data-entry-id="${esc(id)}">${link}${actions}</div>`;
  }

  function section(group, index) {
    const subsectionNames = [...new Set(group.items.map(item => item.section || ""))];
    const withSubheadings = group.items.some(item => item.section);
    const subgroups = subsectionNames.map(name => `<div class="bookmark-subgroup" data-bookmark-subgroup>${withSubheadings ? `<h3 class="bookmark-subheading">${esc(name || "常用收藏")}</h3>` : ""}<div class="${"link-grid"}">${group.items.filter(item => (item.section || "") === name).map(item => renderItem(item, group)).join("\n")}</div></div>`).join("\n");
    return `<section class="directory-section${group.kind === "more" ? " more-section" : ""}" id="${esc(group.id)}" aria-labelledby="title-${esc(group.id)}" data-search-group>
  <div class="section-heading"><h2 id="title-${esc(group.id)}"><span class="section-icon tone-${tones[index % tones.length]}">${svg(group.icon || "folder")}</span>${esc(group.title)}</h2></div>
  ${subgroups}
</section>`;
  }

  globalThis.LiNavRender = Object.freeze({
    sections(data) { return data.groups.map(section).join("\n"); },
    categories(data) {
      return data.groups.map(group => `<a href="#${esc(group.id)}" data-category-link>${svg(group.icon || "folder")}<span>${esc(group.title)}</span></a>`).join("");
    },
    quickLinks(data) { return data.quickLinks.map(item => renderItem(item)).join(""); }
  });
})();
