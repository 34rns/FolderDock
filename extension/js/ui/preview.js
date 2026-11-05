window.FD = window.FD || {};
FD.ui.preview = (function () {
    var container, currentAsset;
    function init() {
        container = document.getElementById("preview-region");
        window.addEventListener("assetSelected", function (event) { showAsset(event.detail.asset); });
        FD.ui.tags.init(); FD.ui.media.init();
        FD.store.on(function (state, key) { if (key === "settings" && currentAsset) showAsset(currentAsset, true); });
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) FD.ui.media.release(container);
            else if (currentAsset) showAsset(currentAsset, true);
        });
        window.addEventListener("beforeunload", function () { FD.ui.media.release(container); });
    }
    function formatSize(bytes) {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
        return bytes + " B";
    }
    function showAsset(asset, force) {
        if (!container) return;
        if (!force && currentAsset && asset && currentAsset.path === asset.path && currentAsset.mtime === asset.mtime &&
            currentAsset.size === asset.size && currentAsset.missing === asset.missing && currentAsset.thumbPath === asset.thumbPath &&
            currentAsset.previewPath === asset.previewPath && currentAsset.previewMtime === asset.previewMtime) return;
        currentAsset = asset; FD.ui.media.release(container); container.textContent = "";
        if (!asset) { container.appendChild(FD.ui.el("p", "empty-note", "Select an asset to preview it")); return; }
        container.appendChild(FD.ui.media.create(asset, true));
        var details = FD.ui.el("div", "preview-details");
        details.appendChild(FD.ui.el("strong", "preview-name", asset.name + (asset.ext ? "." + asset.ext : "")));
        var path = FD.ui.el("div", "preview-path", asset.path); path.title = asset.path; details.appendChild(path);
        details.appendChild(FD.ui.el("div", "empty-note", formatSize(asset.size) + " · " + asset.kind));
        var actions = FD.ui.el("div", "preview-actions");
        var preset = asset.ext === "ffx" || asset.ext === "mogrt";
        var add = FD.ui.el("button", "", preset ? "Apply / Insert" : asset.kind === "project" ? "Import project" : "Import");
        add.id = "btn-preview-import"; add.onclick = function () { FD.main.importAsset(currentAsset, "project"); };
        var insert = FD.ui.el("button", "primary", "Insert at playhead");
        insert.id = "btn-preview-insert"; insert.onclick = function () { FD.main.importAsset(currentAsset, "timeline"); };
        actions.appendChild(add); if (!preset && asset.kind !== "project") actions.appendChild(insert); details.appendChild(actions);
        var tags = FD.ui.el("div", "asset-tags"); details.appendChild(tags);
        FD.ui.tags.render(tags, asset); container.appendChild(details);
    }
    return { init: init, showAsset: showAsset, getAsset: function () { return currentAsset; } };
})();
