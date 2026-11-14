/* Li+ navigation: static links remain usable without JavaScript. */
(() => {
  "use strict";
  document.documentElement.classList.remove("no-js");

  function initialize() {
    const root = document.documentElement;
    const themeButton = document.getElementById("theme-toggle");
    const themeLabel = themeButton?.querySelector("[data-theme-label]");

    function setTheme(theme, remember = false) {
      const dark = theme === "dark";
      root.dataset.theme = dark ? "dark" : "light";
      themeButton?.setAttribute("aria-pressed", String(dark));
      themeButton?.setAttribute("aria-label", dark ? "切换为日间模式" : "切换为夜间模式");
      if (themeLabel) themeLabel.textContent = dark ? "日间" : "夜间";
      if (remember) {
        try { localStorage.setItem("li-plus-theme", root.dataset.theme); } catch { /* Private browsing may disallow storage. */ }
      }
    }

    let rememberedTheme = "dark";
    try { rememberedTheme = localStorage.getItem("li-plus-theme") === "light" ? "light" : "dark"; } catch { /* Use the night-sky default. */ }
    setTheme(rememberedTheme);
    themeButton?.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark", true));

    const clock = document.getElementById("live-clock");
    const date = document.getElementById("live-date");
    let displayedDate = "";
    function updateClock() {
      const now = new Date();
      if (clock) {
        clock.textContent = now.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        clock.setAttribute("datetime", now.toISOString());
      }
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (date && displayedDate !== dateKey) {
        date.textContent = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
        date.setAttribute("datetime", dateKey);
        displayedDate = dateKey;
      }
    }
    updateClock();
    if (clock || date) window.setInterval(updateClock, clock ? 1000 : 60000);

    const form = document.getElementById("search-form");
    const input = document.getElementById("search-input");
    if (!form || !input) return;

    const engineButtons = [...document.querySelectorAll("#engine-tabs [data-engine-id]")];
    const extras = document.getElementById("search-extras");
    const submit = document.getElementById("search-submit");
    const submitLabel = submit?.querySelector("[data-submit-label]") || submit;
    const clearButton = document.getElementById("search-clear");
    const feedback = document.getElementById("search-feedback");
    const suggestions = document.getElementById("search-suggestions");
    let suggestionLinks = [];
    let suggestionIndex = -1;
    const emptyState = document.getElementById("empty-state");
    const directory = document.getElementById("directory");
    let items = [...document.querySelectorAll("[data-search-item]")];
    let groups = [...document.querySelectorAll("[data-search-group]")];
    let categoryLinks = [...document.querySelectorAll("[data-category-link]")];
    const collectionButtons = [...document.querySelectorAll("button[data-collection]")];
    let subgroups = [...document.querySelectorAll("[data-bookmark-subgroup]")];
    const collectionNames = { all: "全部收藏", bookmarks: "我的书签", original: "常用网站" };
    let activeCollection = "original";
    const normalize = value => String(value || "").normalize("NFKC").toLocaleLowerCase("zh-CN").trim();
    const indexItems = () => items.map(element => ({ element, pinned: element.hasAttribute("data-search-pinned"), collections: (element.dataset.collections || "original").split(" "), text: normalize(element.dataset.search || element.textContent) }));
    let searchableItems = indexItems();
    let matchingItems = searchableItems;
    let engines = [];
    try {
      const data = JSON.parse(document.getElementById("search-engines")?.textContent || "[]");
      if (Array.isArray(data)) engines = data.filter(engine => engine && typeof engine.id === "string" && typeof engine.param === "string" && /^https:\/\//.test(engine.action));
    } catch { /* The native default search still works if the data is unavailable. */ }
    let activeEngine = "search_1";

    function closeSuggestions() {
      if (suggestions) suggestions.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      suggestionIndex = -1;
    }

    function selectSuggestion(index) {
      suggestionIndex = index;
      suggestionLinks.forEach((link, current) => {
        const selected = current === index;
        link.setAttribute("aria-selected", String(selected));
        link.classList.toggle("is-selected", selected);
      });
      const selected = suggestionLinks[index];
      if (selected) {
        input.setAttribute("aria-activedescendant", selected.id);
        selected.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else input.removeAttribute("aria-activedescendant");
    }

    function renderSuggestions(query, terms) {
      if (!suggestions) return;
      suggestions.replaceChildren();
      suggestionLinks = [];
      suggestionIndex = -1;
      input.removeAttribute("aria-activedescendant");
      if (!query || activeEngine !== "local") { closeSuggestions(); return; }
      const summary = document.createElement("p");
      summary.className = "search-suggestion-summary";
      summary.textContent = `${collectionNames[activeCollection]} · ${matchingItems.length ? `找到 ${matchingItems.length} 个入口` : "没有匹配的网址"}`;
      suggestions.append(summary);
      const list = document.createElement("div");
      list.id = "search-suggestion-list";
      list.className = "search-suggestion-list";
      list.setAttribute("role", "listbox");
      list.setAttribute("aria-label", "匹配的网址");
      for (const item of matchingItems.slice(0, 8)) {
        const source = item.element;
        const href = source.getAttribute?.("href") || source.href || "";
        if (!/^https?:\/\//i.test(href)) continue;
        let url;
        try { url = new URL(href); } catch { continue; }
        if (url.username || url.password) continue;
        const link = document.createElement("a");
        link.id = `search-option-${suggestionLinks.length}`;
        link.className = "search-suggestion";
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.tabIndex = -1;
        link.setAttribute("role", "option");
        link.setAttribute("aria-selected", "false");
        const sourceImage = source.querySelector("img");
        if (sourceImage) {
          const icon = sourceImage.cloneNode(false);
          icon.className = "search-suggestion-icon";
          icon.alt = "";
          icon.width = 32;
          icon.height = 32;
          link.append(icon);
        }
        const copy = document.createElement("span");
        copy.className = "search-suggestion-copy";
        const name = document.createElement("strong");
        name.className = "search-suggestion-name";
        name.textContent = source.querySelector("strong")?.textContent || source.querySelector("span:not([aria-hidden])")?.textContent || source.textContent.trim();
        const host = document.createElement("span");
        host.className = "search-suggestion-domain";
        host.textContent = url.hostname.replace(/^www\./, "");
        copy.append(name, host);
        link.append(copy);
        link.addEventListener("click", () => {
          if (typeof CustomEvent === "function") document.dispatchEvent?.(new CustomEvent("li:site-opened", { detail: { id: source.dataset.siteId } }));
          closeSuggestions();
        });
        list.append(link);
        suggestionLinks.push(link);
      }
      suggestions.append(list);
      if (!matchingItems.length && activeCollection !== "all") {
        const otherMatches = searchableItems.filter(item => !item.collections.includes(activeCollection) && terms.every(term => item.text.includes(term)));
        if (otherMatches.length) {
          const allButton = document.createElement("button");
          allButton.type = "button";
          allButton.className = "search-all-collections";
          allButton.textContent = `其他收藏中找到 ${otherMatches.length} 项，搜索全部收藏`;
          allButton.addEventListener("click", () => { setCollection("all"); input.focus({ preventScroll: true }); });
          suggestions.append(allButton);
        }
      }
      const hint = document.createElement("p");
      hint.className = "search-suggestion-hint";
      hint.textContent = matchingItems.length ? "↑↓ 选择 · Enter 打开 · Esc 关闭" : "试试更短的名称、分类或域名";
      suggestions.append(hint);
      suggestions.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function updateResults() {
      const query = activeEngine === "local" ? normalize(input.value) : "";
      const terms = query.split(/\s+/).filter(Boolean);
      matchingItems = [];
      for (const item of searchableItems) {
        const inCollection = activeCollection === "all" || item.collections.includes(activeCollection);
        const matches = inCollection && terms.every(term => item.text.includes(term));
        item.element.hidden = !item.pinned && !matches;
        const entry = item.element.closest?.(".site-entry");
        if (entry) entry.hidden = item.element.hidden;
        item.element.classList.toggle("search-match", Boolean(query) && item.pinned && matches);
        if (matches) matchingItems.push(item);
      }
      for (const group of [...subgroups, ...groups]) {
        const count = [...group.querySelectorAll("[data-search-item]")].filter(item => !item.hidden).length;
        group.hidden = count === 0;
        const label = group.querySelector("[data-group-count]");
        if (label) label.textContent = String(count).padStart(2, "0");
      }
      for (const link of categoryLinks) {
        const group = document.getElementById(link.hash.slice(1));
        link.hidden = Boolean(group?.hidden);
        const count = link.querySelector("[data-category-count]");
        if (count && group) count.textContent = group.querySelector("[data-group-count]")?.textContent || "0";
      }
      if (directory) directory.hidden = !items.some(item => !item.hidden && directory.contains(item));
      if (clearButton) clearButton.hidden = input.value.length === 0;
      const pinnedMatches = matchingItems.filter(item => item.pinned).length;
      if (emptyState) emptyState.hidden = matchingItems.length > 0;
      if (feedback) feedback.textContent = query ? `${collectionNames[activeCollection]} · 找到 ${matchingItems.length} 个入口${pinnedMatches ? `，其中 ${pinnedMatches} 个在顶部导航` : ""}` : `${collectionNames[activeCollection]} · ${matchingItems.length} 个网址 · ${groups.filter(group => !group.hidden).length} 个分类`;
      root.classList.toggle("is-filtering", Boolean(query) || activeCollection !== "all");
      renderSuggestions(query, terms);
      if (typeof CustomEvent === "function") document.dispatchEvent?.(new CustomEvent("li:search-updated", { detail: { query, collection: activeCollection, engine: activeEngine } }));
      return matchingItems.length;
    }

    function setEngine(id) {
      const engine = engines.find(item => item.id === id);
      if (id !== "local" && !engine) return;
      activeEngine = id;
      for (const button of engineButtons) button.setAttribute("aria-pressed", String(button.dataset.engineId === id));
      if (extras) extras.replaceChildren();
      if (id === "local") {
        input.required = false;
        input.removeAttribute("name");
        input.placeholder = "搜索网址、分类或域名…";
        input.setAttribute("aria-label", "搜索当前收藏范围的网址");
        if (submitLabel) submitLabel.textContent = "查找";
      } else {
        input.required = true;
        form.action = engine.action;
        form.method = "get";
        input.name = engine.param;
        input.placeholder = engine.placeholder || `使用 ${engine.name} 搜索`;
        input.setAttribute("aria-label", `在 ${engine.name} 搜索`);
        if (submitLabel) submitLabel.textContent = "搜索";
        if (engine.extra && extras) {
          for (const [name, value] of Object.entries(engine.extra)) {
            const field = document.createElement("input");
            field.type = "hidden";
            field.name = name;
            field.value = String(value);
            extras.append(field);
          }
        }
      }
      updateResults();
    }

    for (const button of engineButtons) {
      const id = button.dataset.engineId;
      if (id !== "local" && !engines.some(engine => engine.id === id)) button.disabled = true;
      button.addEventListener("click", () => {
        setEngine(id);
        input.focus({ preventScroll: true });
      });
    }

    function clearSearch() {
      input.value = "";
      updateResults();
      input.focus({ preventScroll: true });
    }
    function setCollection(name) {
      if (!Object.hasOwn(collectionNames, name)) return;
      activeCollection = name;
      root.dataset.collection = name;
      for (const button of collectionButtons) button.setAttribute("aria-pressed", String(button.dataset.collection === name));
      updateResults();
    }
    for (const button of collectionButtons) button.addEventListener("click", () => setCollection(button.dataset.collection));
    for (const button of document.querySelectorAll("[data-reset-search]")) button.addEventListener("click", () => { setCollection("all"); clearSearch(); });
    for (const button of document.querySelectorAll("[data-clear-search]")) button.addEventListener("click", clearSearch);
    input.addEventListener("input", updateResults);
    input.addEventListener("search", updateResults);
    if (suggestions) {
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-haspopup", "listbox");
      input.setAttribute("aria-controls", "search-suggestion-list");
      input.setAttribute("aria-expanded", "false");
      input.addEventListener("focus", () => { if (input.value.trim()) updateResults(); });
      input.addEventListener("keydown", event => {
        if (event.isComposing || activeEngine !== "local") return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (suggestions.hidden) updateResults();
          if (!suggestionLinks.length) return;
          event.preventDefault();
          const next = event.key === "ArrowDown" ? (suggestionIndex + 1) % suggestionLinks.length : (suggestionIndex < 0 ? suggestionLinks.length - 1 : (suggestionIndex - 1 + suggestionLinks.length) % suggestionLinks.length);
          selectSuggestion(next);
        }
      });
      document.addEventListener("pointerdown", event => {
        if (!suggestions.contains(event.target) && !form.contains(event.target)) closeSuggestions();
      });
      document.addEventListener("focusin", event => {
        if (!suggestions.contains(event.target) && !form.contains(event.target)) closeSuggestions();
      });
    }
    form.addEventListener("submit", event => {
      if (activeEngine === "local") {
        event.preventDefault();
        const chosen = suggestionLinks[Math.max(0, suggestionIndex)];
        if (input.value.trim() && chosen) { chosen.click(); return; }
        updateResults();
        if (input.value.trim()) {
          const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
          const pinnedMatch = matchingItems.find(item => item.pinned);
          if (pinnedMatch) {
            pinnedMatch.element.focus({ preventScroll: true });
            pinnedMatch.element.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
          } else if (directory && matchingItems.some(item => directory.contains(item.element))) {
            directory.scrollIntoView({ behavior, block: "start" });
          }
        }
      } else if (!input.value.trim()) {
        event.preventDefault();
        input.focus();
      } else {
        input.value = input.value.trim();
      }
    });
    document.addEventListener("keydown", event => {
      const target = event.target;
      const editing = target instanceof Element && (target.matches("input, textarea, select") || target.closest("[contenteditable]:not([contenteditable='false'])"));
      const commandSearch = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k";
      if (commandSearch || (event.key === "/" && !editing && !event.ctrlKey && !event.metaKey && !event.altKey)) {
        event.preventDefault();
        input.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        input.focus({ preventScroll: true });
      }
      if (event.key === "Escape" && document.activeElement === input && input.value) {
        event.preventDefault();
        if (suggestions && !suggestions.hidden) closeSuggestions();
        else clearSearch();
      }
    });
    setEngine("local");
    setCollection(activeCollection);

    let observer;
    function observeCategories() {
      observer?.disconnect();
      if (!("IntersectionObserver" in window) || !categoryLinks.length) return;
      const sections = categoryLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
      const visibleSections = new Set();
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && !entry.target.hidden) visibleSections.add(entry.target.id);
          else visibleSections.delete(entry.target.id);
        }
        const first = sections.find(section => visibleSections.has(section.id));
        for (const link of categoryLinks) {
          if (first && link.hash === `#${first.id}`) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        }
      }, { rootMargin: "-100px 0px -45% 0px", threshold: 0 });
      for (const section of sections) observer.observe(section);
    }
    observeCategories();
    document.addEventListener("li:navigation-changed", event => {
      items = [...document.querySelectorAll("[data-search-item]")];
      groups = [...document.querySelectorAll("[data-search-group]")];
      categoryLinks = [...document.querySelectorAll("[data-category-link]")];
      subgroups = [...document.querySelectorAll("[data-bookmark-subgroup]")];
      searchableItems = indexItems();
      if (event.detail?.clearSearch) input.value = "";
      setCollection(event.detail?.collection || activeCollection);
      observeCategories();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
