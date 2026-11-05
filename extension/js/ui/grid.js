window.FD = window.FD || {};
FD.ui.grid = (function () {
    var all = [], visible = [], selected = -1, container, generation = 0, scanToken = 0;
    function init() {
        container = document.getElementById("grid-region"); container.tabIndex = 0;
        container.setAttribute("aria-label", "Assets");
        window.addEventListener("folderSelected", function (e) { loadFolder(e.detail.path); });
        window.addEventListener("collectionSelected", function (e) { loadCollection(e.detail.name); });
        window.addEventListener("filterChanged", applyFilter);
        container.addEventListener("keydown", keydown);
        FD.store.on(function (state, key) {
            if ((key === "favorites" || key === "recents") && FD.state.currentCollection === key) loadCollection(key);
            else if (key === "tags" || key === "settings") applyFilter();
            else if (key === "favorites") container.querySelectorAll(".favorite-toggle").forEach(function (button) {
                var saved = state.favorites.indexOf(button.dataset.path) !== -1;
                button.textContent = saved ? "★" : "☆"; button.setAttribute("aria-pressed", String(saved));
            });
        });
        FD.state = FD.state || {};
    }
    function setThumbSize(size) { document.documentElement.style.setProperty("--thumb-size", size + "px"); }
    function loadFolder(dir, refresh) {
        FD.state = { currentFolder: dir, currentCollection: null };
        var token = ++scanToken;
        if (!refresh) {
            all = []; visible = []; selected = -1;
            generation++; FD.ui.thumbs.reset(); container.textContent = "Scanning folder and subfolders…";
            window.dispatchEvent(new CustomEvent("assetSelected", { detail: { asset: null } }));
        }
        container.setAttribute("aria-busy", "true");
        setTimeout(async function () {
            if (token !== scanToken) return;
            var exists = await FD.fs.existsAsync(dir);
            if (token !== scanToken) return;
            if (!exists.ok || !exists.data) {
                all = []; visible = []; selected = -1; generation++; FD.ui.thumbs.reset();
                container.textContent = "Folder unavailable. Reconnect the drive, choose another folder, or remove this folder from the library.";
                container.setAttribute("aria-busy", "false");
                window.dispatchEvent(new CustomEvent("assetSelected", { detail: { asset: null } }));
                return;
            }
            FD.scanner.scanTree(dir, function () { return token !== scanToken || document.hidden; }).then(function (result) {
                if (token !== scanToken) return;
                container.setAttribute("aria-busy", "false");
                if (result.cancelled) return;
                if (refresh && FD.scanner.signature(all) === FD.scanner.signature(result.assets)) return;
                var retained = refresh && visible[selected] && visible[selected].path;
                all = result.assets; selected = -1; applyFilter(retained || null);
                if (result.warnings.length) FD.ui.toast("Some subfolders could not be read", "warning");
            }).catch(function () {
                if (token !== scanToken) return;
                container.setAttribute("aria-busy", "false");
                if (!refresh) container.textContent = "Cannot scan this folder. Try refreshing or choose another folder.";
                FD.ui.toast("Folder scan failed. Try refreshing the folder.", "error");
            });
        }, 10);
    }
    async function loadCollection(name) {
        var retain = FD.state.currentCollection === name, token = ++scanToken;
        FD.state = { currentFolder: null, currentCollection: name };
        container.setAttribute("aria-busy", "true");
        var result = await FD.catalog.resolve(FD.store.get(name) || [], function () { return token !== scanToken || document.hidden; });
        if (token !== scanToken) return;
        container.setAttribute("aria-busy", "false");
        var retained = retain && visible[selected] && visible[selected].path;
        all = result; selected = -1; applyFilter(retained || null);
    }
    function applyFilter(retained) {
        var previous = typeof retained === "string" ? retained : visible[selected] && visible[selected].path;
        var state = FD.ui.toolbar.getState();
        var filtered = FD.catalog.filter(all, state);
        renderAssets(filtered, previous);
    }
    function renderAssets(assets, selectedPath) {
        FD.ui.thumbs.reset();
        var scroll = container.scrollTop;
        visible = assets || []; selected = -1;
        var version = ++generation; container.textContent = "";
        container.setAttribute("aria-label", "Assets, " + visible.length + " files");
        if (!visible.length) {
            var empty = FD.ui.el("div", "onboarding empty-note");
            if (!FD.state.currentFolder && !FD.state.currentCollection) {
                var saved = FD.store.get("roots").length;
                empty.appendChild(FD.ui.el("h2", "", saved ? "Choose a folder to get started" : "Make room for your assets"));
                empty.appendChild(FD.ui.el("p", "", saved ? "Select a folder in your library to browse its files." : "Add your own folders to browse, preview and import files into Premiere Pro or After Effects."));
                var add = FD.ui.el("button", "primary", "Add a folder");
                add.onclick = function () { document.getElementById("btn-add-folder").click(); }; empty.appendChild(add);
            } else empty.textContent = "No matching assets. Add files to this folder or clear the filters.";
            container.appendChild(empty);
        }
        visible.some(function (asset, index) {
            if (asset.path !== selectedPath) return false;
            selected = index; return true;
        });
        if (visible.length) FD.ui.gridWindow.mount(container, visible, card, scroll);
        if (selected >= 0) selectIndex(selected, false);
        if (selected < 0) window.dispatchEvent(new CustomEvent("assetSelected", { detail: { asset: null } }));
        window.dispatchEvent(new CustomEvent("gridUpdated"));
    }
    function card(asset, index) {
        var el = FD.ui.el("div", "asset-card"); el.dataset.path = asset.path; el.dataset.index = index;
        el.classList.toggle("selected", index === selected);
        el._asset = asset; el.tabIndex = 0; el.setAttribute("role", "group");
        el.setAttribute("aria-label", asset.name + "." + asset.ext); el.title = asset.path;
        var thumb = FD.ui.el("div", "asset-thumb");
        FD.ui.thumbs.applyThumbnail(thumb, asset); el.appendChild(thumb);
        var meta = FD.ui.el("div", "card-meta");
        meta.appendChild(FD.ui.el("span", "card-name", asset.name));
        meta.appendChild(FD.ui.el("span", "type-badge", asset.missing ? "Missing" : asset.ext));
        var favorite = FD.ui.el("button", "favorite-toggle", FD.store.get("favorites").indexOf(asset.path) < 0 ? "☆" : "★");
        favorite.dataset.path = asset.path; favorite.title = "Toggle favorite";
        favorite.setAttribute("aria-label", "Favorite " + asset.name);
        favorite.setAttribute("aria-pressed", String(FD.store.get("favorites").indexOf(asset.path) >= 0));
        favorite.onclick = function (e) { e.stopPropagation(); FD.store.toggleFavorite(asset.path); };
        meta.appendChild(favorite); el.appendChild(meta);
        el.onclick = function () { selectIndex(index); };
        el.ondblclick = function (e) {
            if (!e.target.closest("button")) window.dispatchEvent(new CustomEvent("assetActivated", { detail: { asset: asset } }));
        };
        return el;
    }
    function selectIndex(index, scroll) {
        if (index < 0 || index >= visible.length) return;
        selected = index;
        if (scroll !== false) FD.ui.gridWindow.reveal(index);
        container.querySelectorAll(".asset-card").forEach(function (el) {
            el.classList.toggle("selected", Number(el.dataset.index) === index);
        });
        var el = container.querySelector('[data-index="' + index + '"]');
        if (el && scroll !== false) { el.focus(); el.scrollIntoView({ block: "nearest" }); }
        window.dispatchEvent(new CustomEvent("assetSelected", { detail: { asset: visible[index] } }));
    }
    function keydown(e) {
        if (!visible.length || e.target.closest("input, textarea, button, select, [contenteditable=true]")) return;
        var columns = FD.ui.gridWindow.columns();
        var steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
        if (steps[e.key]) {
            selectIndex(Math.max(0, Math.min(visible.length - 1, (selected < 0 ? 0 : selected + steps[e.key]))));
            e.preventDefault();
        } else if (e.key === "Home" || e.key === "End") {
            e.preventDefault(); selectIndex(e.key === "Home" ? 0 : visible.length - 1);
        } else if (e.key === "Enter" && selected >= 0) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("assetActivated", { detail: { asset: visible[selected] } }));
        }
    }
    return { init: init, loadFolder: loadFolder, loadCollection: loadCollection, renderAssets: renderAssets,
        selectIndex: selectIndex, setThumbSize: setThumbSize, getSelected: function () { return visible[selected] || null; }, getCount: function () { return visible.length; },
        refresh: function () { if (FD.state.currentFolder) loadFolder(FD.state.currentFolder, true);
            else if (FD.state.currentCollection) loadCollection(FD.state.currentCollection); } };
})();
