window.FD = window.FD || {};
FD.main = (function () {
    var started = false, importing = false, watcher = null, refreshTimer = null;
    function stopWatch() {
        if (watcher) watcher.close(); watcher = null;
        if (refreshTimer) clearTimeout(refreshTimer); refreshTimer = null;
    }
    function watchFolder(path) {
        stopWatch();
        watcher = FD.fs.watch(path, function (event, error) {
            if (event === "error") { FD.ui.toast("Auto-refresh unavailable: " + error, "warning"); return; }
            if (error && /\.(pek|cfa|tmp|tmpd|db|ims)$/i.test(String(error))) return;
            if (refreshTimer) return;
            refreshTimer = setTimeout(function () { refreshTimer = null; if (!document.hidden) FD.ui.grid.refresh(); }, 2000);
        });
    }
    function importAsset(asset, mode) {
        if (!asset || !asset.path) {
            FD.ui.toast("Select an asset first", "warning");
            return Promise.resolve({ ok: false, error: "No asset selected" });
        }
        if (importing) {
            FD.ui.toast("An import is already running", "info");
            return Promise.resolve({ ok: false, error: "Import in progress" });
        }
        mode = mode || FD.store.get("settings").defaultAction;
        if (mode === "project") mode = "timeline";
        if (asset.kind === "project" || /^(aep|aepx|prproj)$/.test(asset.ext)) mode = "project";
        if (asset.ext === "ffx" || asset.ext === "mogrt") mode = "preset";
        importing = true;
        document.body.classList.add("importing");
        return FD.bridge.call("importFile", { path: asset.path, mode: mode }).then(function (res) {
            if (res && res.ok && res.data && (res.data.imported || res.data.placed)) {
                FD.store.addRecent(asset.path);
                FD.ui.toast(res.data.note || "Imported: " + asset.name, "success");
            } else {
                res = { ok: false, error: (res && res.error) || "The host did not import this asset" };
                FD.ui.toast(res.error, "error");
            }
            return res;
        }).catch(function (error) {
            FD.ui.toast(error.message || String(error), "error");
            return { ok: false, error: error.message || String(error) };
        }).then(function (res) {
            importing = false;
            document.body.classList.remove("importing");
            return res;
        });
    }
    function init() {
        if (started) return;
        started = true;
        FD.store.load();
        ["toolbar", "sidebar", "grid", "preview", "menu", "settings"].forEach(function (name) {
            if (FD.ui[name] && FD.ui[name].init) FD.ui[name].init();
        });
        FD.ui.grid.setThumbSize(FD.store.get("settings").thumbSize);
        window.addEventListener("assetActivated", function (event) {
            importAsset(event.detail && event.detail.asset);
        });
        window.addEventListener("folderSelected", function (event) { watchFolder(event.detail.path); });
        window.addEventListener("collectionSelected", stopWatch);
        document.getElementById("btn-refresh").onclick = function () { FD.ui.grid.refresh(); };
        window.addEventListener("beforeunload", function () { stopWatch(); FD.store.saveNow(); });
        var roots = FD.store.get("roots");
        window.addEventListener("folderSelected", function (event) {
            var label = document.getElementById("view-label"); label.textContent = event.detail.path; label.title = event.detail.path;
        });
        window.addEventListener("collectionSelected", function (event) {
            document.getElementById("view-label").textContent = event.detail.name === "favorites" ? "Favorites" : "Recent imports";
        });
        FD.ui.grid.renderAssets([]);
        if (roots.length) document.getElementById("view-label").textContent = "Choose a folder to browse";
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) stopWatch();
            else if (FD.state.currentFolder) { watchFolder(FD.state.currentFolder); FD.ui.grid.refresh(); }
        });
        FD.bridge.call("hostInfo", {}).then(function (res) {
            if (!res || !res.ok) {
                document.getElementById("host-status").textContent = "Adobe connection unavailable";
                FD.ui.toast((res && res.error) || "Host unavailable", "error"); return;
            }
            FD.host = res.data;
            document.getElementById("host-status").textContent = typeof window.__adobe_cep__ === "undefined" ?
                "Browser preview · simulated imports" : (res.data.app === "AEFT" ? "After Effects " : "Premiere Pro ") + res.data.version;
            window.dispatchEvent(new CustomEvent("hostReady", { detail: res.data }));
        });
    }
    return { init: init, importAsset: importAsset };
})();
window.addEventListener("DOMContentLoaded", FD.main.init);
