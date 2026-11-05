window.FD = window.FD || {};
FD.ui.sidebar = (function () {
    var expanded = Object.create(null);
    function choose(path) { window.dispatchEvent(new CustomEvent("folderSelected", { detail: { path: path } })); }
    function highlight(path) {
        document.querySelectorAll(".folder-label").forEach(function (button) {
            var active = button.dataset.path === path;
            button.classList.toggle("active", active); button.closest(".folder-row").classList.toggle("active", active);
            if (active) button.setAttribute("aria-current", "location"); else button.removeAttribute("aria-current");
        });
    }
    function folder(path, label, root) {
        var branch = FD.ui.el("div", "folder-branch"), row = FD.ui.el("div", "folder-row" + (root ? " root-row" : ""));
        row.dataset.path = path; if (root) row.dataset.root = "true";
        var expand = FD.ui.el("button", "folder-expand", "▸");
        expand.setAttribute("aria-label", "Expand " + label); expand.setAttribute("aria-expanded", "false");
        var button = FD.ui.el("button", "sidebar-item folder-label");
        var icon = FD.ui.el("span", "folder-icon"); icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = '<svg viewBox="0 0 20 16"><path d="M1 3V1h7l2 2h9v12H1Z" fill="currentColor"/></svg>';
        button.appendChild(icon); button.appendChild(FD.ui.el("span", "folder-name", label));
        button.dataset.path = path; button.title = label + "\n" + path; button.onclick = function () { choose(path); };
        row.appendChild(expand); row.appendChild(button); branch.appendChild(row);
        var children = FD.ui.el("div", "folder-children"); children.hidden = true; branch.appendChild(children);
        async function unfold() {
            children.hidden = false; expanded[path] = true;
            expand.textContent = "▾"; expand.setAttribute("aria-expanded", "true"); children.textContent = "";
            var result = await FD.fs.listAsync(path);
            if (!document.body.contains(branch) || !expanded[path]) return;
            if (!result.ok) { FD.ui.toast(result.error, "error"); return; }
            var dirs = result.data.filter(function (item) {
                return item.isDir && !FD.previews.supportDirectory(item.name) && item.name.charAt(0) !== ".";
            }).sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
            dirs.forEach(function (item) { children.appendChild(folder(item.path, item.name, false)); });
            if (!dirs.length) { expand.style.visibility = "hidden"; children.hidden = true; delete expanded[path]; }
        }
        expand.onclick = function () {
            if (children.hidden) unfold();
            else { children.hidden = true; delete expanded[path]; expand.textContent = "▸"; expand.setAttribute("aria-expanded", "false"); }
        };
        button.onkeydown = function (event) {
            if (event.key === "ArrowRight") { if (children.hidden) unfold(); event.preventDefault(); }
            if (event.key === "ArrowLeft" && !children.hidden) { expand.click(); event.preventDefault(); }
        };
        if (expanded[path]) unfold();
        return branch;
    }
    function renderRoots() {
        var host = document.getElementById("folders-list"); host.textContent = "";
        var roots = FD.store.get("roots");
        if (!roots.length) host.appendChild(FD.ui.el("p", "empty-note", "Add a folder to start"));
        roots.forEach(function (root) { host.appendChild(folder(root.path, root.label, true)); });
        highlight(FD.state && FD.state.currentFolder);
    }
    function renderCollection(name, label, id) {
        var host = document.getElementById(id); host.textContent = "";
        var button = FD.ui.el("button", "sidebar-item collection-item");
        button.appendChild(FD.ui.el("span", "", label));
        button.appendChild(FD.ui.el("span", "collection-count", " (" + FD.store.get(name).length + ")"));
        button.onclick = function () {
            highlight(null); window.dispatchEvent(new CustomEvent("collectionSelected", { detail: { name: name } }));
        };
        host.appendChild(button);
    }
    function init() {
        window.addEventListener("folderSelected", function (event) { highlight(event.detail.path); });
        document.getElementById("btn-add-folder").onclick = function () {
            FD.fs.chooseFolder().then(function (result) {
                if (!result.ok) { FD.ui.toast(result.error, "error"); return; }
                if (!result.data) return;
                var path = result.data.replace(/\\/g, "/");
                FD.store.addRoot(path); choose(path);
            });
        };
        FD.store.on(function (state, key) {
            if (key === "*" || key === "roots") renderRoots();
            if (key === "*" || key === "favorites") renderCollection("favorites", "All favorites", "favorites-list");
            if (key === "*" || key === "recents") renderCollection("recents", "Recent imports", "recents-list");
        });
        renderRoots(); renderCollection("favorites", "All favorites", "favorites-list"); renderCollection("recents", "Recent imports", "recents-list");
    }
    return { init: init, renderRoots: renderRoots };
})();
