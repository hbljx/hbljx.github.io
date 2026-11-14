/* Editing stays in this browser until the user exports and uploads the page. */
(() => {
  "use strict";
  function initialize() {
    const get = id => document.getElementById(id);
    const root = document.documentElement;
    const toggle = get("manage-sites");
    if (!toggle) return;
    const feedback = get("manage-feedback");
    function message(text, error = false) {
      feedback.textContent = text;
      feedback.dataset.error = String(error);
    }
    let store;
    try {
      let storage;
      try { storage = window.localStorage; } catch { /* The store will explain unavailable storage. */ }
      store = LiNavStore.create(JSON.parse(get("navigation-data").textContent), storage);
    } catch (error) {
      message(`网址管理暂时无法使用：${error.message}`, true);
      toggle.disabled = true;
      return;
    }
    const render = LiNavRender;
    const dialog = get("site-editor");
    const editor = get("editor-form");
    const errorBox = get("editor-error");
    const confirmation = get("site-confirmation");
    function confirmAction(text) {
      get("confirmation-message").textContent = text;
      confirmation.returnValue = "cancel";
      return new Promise(resolve => {
        confirmation.addEventListener("close", () => resolve(confirmation.returnValue === "confirm"), { once: true });
        confirmation.showModal();
      });
    }
    let editingId = null;
    let returnFocusId = null;
    let managing = false;
    const allItems = data => [...data.quickLinks, ...data.groups.flatMap(group => group.items)];

    function updateCounts(container, data) {
      const items = allItems(data);
      for (const button of container.querySelectorAll("button[data-collection]")) {
        const count = button.querySelector("span");
        if (count) count.textContent = button.dataset.collection === "all" ? items.length : items.filter(item => item.collections.includes(button.dataset.collection)).length;
      }
    }
    function renderInto(container, data) {
      container.querySelector(".directory-main").innerHTML = render.sections(data);
      container.querySelector(".category-nav").innerHTML = render.categories(data);
      const nav = container.querySelector(".site-nav");
      const home = nav.querySelector('[aria-current="page"]').cloneNode(true);
      nav.replaceChildren(home);
      nav.insertAdjacentHTML("beforeend", render.quickLinks(data));
      updateCounts(container, data);
    }
    function refresh(options = {}) {
      renderInto(document, store.getData());
      get("undo-site").hidden = !store.canUndo();
      document.dispatchEvent(new CustomEvent("li:navigation-changed", { detail: { ...options, data: store.getData() } }));
    }
    function setManaging(value) {
      managing = value;
      root.classList.toggle("is-managing", value);
      toggle.setAttribute("aria-pressed", String(value));
      toggle.setAttribute("aria-expanded", String(value));
      toggle.textContent = value ? "完成管理" : "管理网址";
      get("manage-actions").hidden = !value;
    }
    function findItem(id) {
      const data = store.getData();
      for (const group of [{ id: "quickLinks", items: data.quickLinks }, ...data.groups]) {
        const item = group.items.find(item => item.id === id);
        if (item) return { ...item, groupId: group.id };
      }
      throw new Error("这个网址已不存在，请刷新后重试。");
    }
    function openEditor(id = null) {
      editingId = id;
      returnFocusId = id;
      const data = store.getData();
      const selected = root.dataset.collection === "bookmarks" ? "bookmarks" : "original";
      const item = id ? findItem(id) : { name: "", url: "", description: "", section: "", collections: [selected], groupId: data.groups.find(group => group.origin === selected)?.id || data.groups[0].id };
      editor.reset();
      errorBox.hidden = true;
      errorBox.textContent = "";
      get("editor-title").textContent = id ? "编辑网址" : "添加网址";
      for (const field of ["name", "url", "description", "section"]) get(`editor-${field}`).value = item[field] || "";
      const groupSelect = get("editor-group");
      groupSelect.replaceChildren();
      for (const group of [{ id: "quickLinks", title: "顶部快捷链接" }, ...data.groups]) {
        const option = document.createElement("option");
        option.value = group.id;
        option.textContent = group.title;
        groupSelect.append(option);
      }
      groupSelect.value = item.groupId;
      get("editor-section").disabled = item.groupId === "quickLinks";
      get("editor-original").checked = item.collections.includes("original");
      get("editor-bookmarks").checked = item.collections.includes("bookmarks");
      dialog.showModal();
      get("editor-name").focus();
    }
    function focusEntry(id) {
      const button = [...document.querySelectorAll("[data-site-edit]")].find(button => button.dataset.siteEdit === id && !button.closest(".site-entry").hidden);
      (button || get("quick-add") || get("add-site")).focus({ preventScroll: true });
    }
    toggle.addEventListener("click", () => setManaging(!managing));
    get("add-site").addEventListener("click", () => openEditor());
    for (const id of ["editor-close", "editor-cancel"]) get(id).addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => focusEntry(returnFocusId));
    get("editor-group").addEventListener("change", () => { get("editor-section").disabled = get("editor-group").value === "quickLinks"; });
    editor.addEventListener("submit", event => {
      event.preventDefault();
      try {
        const collections = ["original", "bookmarks"].filter(name => get(`editor-${name}`).checked);
        const id = store.save({ id: editingId || undefined, name: get("editor-name").value, url: get("editor-url").value, description: get("editor-description").value, section: get("editor-section").value, groupId: get("editor-group").value, collections });
        const current = root.dataset.collection;
        refresh({ collection: current === "all" || collections.includes(current) ? current : collections[0], clearSearch: true });
        returnFocusId = id;
        dialog.close();
        message("已保存到此浏览器。需要更新公开网站时，请导出首页后上传。");
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
    });
    document.addEventListener("click", async event => {
      const button = event.target.closest?.("[data-site-edit], [data-site-delete]");
      if (!button || !managing) return;
      try {
        if (button.dataset.siteEdit) { openEditor(button.dataset.siteEdit); return; }
        const item = findItem(button.dataset.siteDelete);
        if (!await confirmAction(`删除「${item.name}」？删除后可以撤销。`)) return;
        store.remove(item.id);
        refresh();
        get("undo-site").focus({ preventScroll: true });
        message(`已删除「${item.name}」，可点击“撤销上一步”恢复。`);
      } catch (error) { message(error.message, true); }
    });
    get("undo-site").addEventListener("click", () => {
      try { store.undo(); refresh(); toggle.focus({ preventScroll: true }); message("已撤销上一步修改。"); }
      catch (error) { message(error.message, true); }
    });
    get("reset-sites").addEventListener("click", async () => {
      if (!await confirmAction("恢复当前网站的默认收藏？这会清除本浏览器的修改；可先导出备份。")) return;
      try { store.reset(); refresh({ collection: "original", clearSearch: true }); message("已恢复网站默认收藏，可以撤销这一步。"); }
      catch (error) { message(error.message, true); }
    });
    function download(filename, text, mime) {
      const url = URL.createObjectURL(new Blob([text], { type: mime }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    get("export-sites").addEventListener("click", () => {
      try { download("navigation-data.json", store.exportData(), "application/json;charset=utf-8"); message("备份已生成。可导入其他浏览器，也可替换源码中的 assets/navigation-data.json。"); }
      catch (error) { message(`导出失败：${error.message}`, true); }
    });
    const importFile = get("import-sites-file");
    get("import-sites").addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async () => {
      const file = importFile.files[0];
      if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error("备份文件不能超过 5 MB。");
        const contents = await file.text();
        if (!await confirmAction("用这份备份替换当前浏览器的收藏？导入后可以撤销。")) return;
        store.importData(contents);
        refresh({ collection: "all", clearSearch: true });
        message("备份已导入并保存到此浏览器。");
      } catch (error) { message(error.message, true); }
      finally { importFile.value = ""; }
    });
    get("export-page").addEventListener("click", () => {
      try {
        const data = store.getData();
        const page = root.cloneNode(true);
        renderInto(page, data);
        page.className = "no-js";
        page.dataset.theme = "dark";
        page.querySelector("#appearance-dialog")?.removeAttribute("open");
        const suggestions = page.querySelector("#search-suggestions");
        if (suggestions) { suggestions.replaceChildren(); suggestions.hidden = true; }
        for (const id of ["pinned-grid", "recent-list"]) page.querySelector(`#${id}`)?.replaceChildren();
        page.querySelector("#desk-toast").hidden = true;
        page.querySelector("#pinned-section").hidden = false;
        page.querySelector("#recent-section").hidden = false;
        page.querySelector("#mobile-menu").setAttribute("aria-expanded", "false");
        page.querySelector("#app-sidebar").classList.remove("is-open");
        page.querySelector("#app-sidebar").removeAttribute("inert");
        page.querySelector("#app-sidebar").removeAttribute("aria-hidden");
        page.querySelector("#quick-manage").textContent = "管理网址";
        page.querySelector("#organize-pins").textContent = "整理";
        page.querySelector("#organize-pins").setAttribute("aria-pressed", "false");
        page.dataset.motion = "on";
        page.style.removeProperty("--scroll-progress");
        delete page.dataset.collection;
        page.querySelector("#navigation-data").textContent = JSON.stringify(data).replace(/</g, "\\u003c");
        page.querySelector("#site-editor").removeAttribute("open");
        page.querySelector("#site-confirmation").removeAttribute("open");
        page.querySelector("#confirmation-message").textContent = "";
        page.querySelector("#editor-form").reset();
        page.querySelector("#editor-group").replaceChildren();
        page.querySelector("#editor-error").textContent = "";
        page.querySelector("#editor-error").hidden = true;
        page.querySelector("#manage-feedback").textContent = "";
        page.querySelector("#manage-actions").hidden = true;
        page.querySelector("#undo-site").hidden = true;
        const manage = page.querySelector("#manage-sites");
        manage.textContent = "管理网址";
        manage.setAttribute("aria-pressed", "false");
        manage.setAttribute("aria-expanded", "false");
        page.querySelector("#directory").hidden = false;
        page.querySelector("#empty-state").hidden = true;
        page.querySelector("#search-clear").hidden = true;
        for (const button of page.querySelectorAll("button[data-collection]")) button.setAttribute("aria-pressed", String(button.dataset.collection === "original"));
        for (const button of page.querySelectorAll("[data-engine-id]")) button.setAttribute("aria-pressed", String(button.dataset.engineId === data.engines[0].id));
        const searchForm = page.querySelector("#search-form");
        searchForm.action = data.engines[0].action;
        searchForm.querySelector("input[type='search']").name = data.engines[0].param;
        searchForm.querySelector("input[type='search']").value = "";
        searchForm.querySelector("input[type='search']").setAttribute("value", "");
        searchForm.querySelector("input[type='search']").placeholder = data.engines[0].placeholder;
        searchForm.querySelector("input[type='search']").setAttribute("aria-label", "搜索关键词");
        searchForm.querySelector("input[type='search']").required = true;
        page.querySelector("#search-extras").replaceChildren();
        page.querySelector("[data-submit-label]").textContent = "搜索";
        page.querySelector("#search-feedback").textContent = `${data.groups.length} 个分类 · ${allItems(data).length} 个网址`;
        page.querySelector('meta[name="description"]').content = `Li+ 像素导航，${allItems(data).length} 个网址与个人书签。`;
        page.querySelectorAll(".pixel-click-particle, [data-pixel-transient]").forEach(node => node.remove());
        download("index.html", `<!DOCTYPE html>\n${page.outerHTML}\n`, "text/html;charset=utf-8");
        message("首页已生成。用下载的 index.html 替换仓库根目录同名文件，保留 assets 等素材目录。建议同时导出备份留存。");
      } catch (error) { message(`导出首页失败：${error.message}`, true); }
    });
    globalThis.LiNavManager = Object.freeze({ getData: () => store.getData(), edit: openEditor });
    refresh();
    if (store.getNotice()) message(store.getNotice(), true);
    else if (store.hasSavedChanges()) message("已载入此浏览器保存的收藏。");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
