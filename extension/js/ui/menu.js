window.FD = window.FD || {};
FD.ui.menu = (function () {
    var menu = null, returnFocus = null;
    function close(restore) {
        if (menu) { menu.remove(); menu = null; }
        if (restore && returnFocus && document.body.contains(returnFocus)) returnFocus.focus();
    }
    function feedback(result) { if (!result.ok) FD.ui.toast(result.error, "error"); }
    function open(event, asset, root) {
        event.preventDefault(); close(false); returnFocus = event.target.closest("button,.asset-card") || event.target;
        menu = FD.ui.el("div", "context-menu"); menu.setAttribute("role", "menu");
        function action(label, fn) {
            var button = FD.ui.el("button", "", label); button.setAttribute("role", "menuitem");
            button.onclick = function () { close(false); fn(); }; menu.appendChild(button);
        }
        if (asset) {
            action("Import", function () { FD.main.importAsset(asset, "project"); });
            action("Insert at playhead", function () { FD.main.importAsset(asset, "timeline"); });
            action(FD.store.get("favorites").indexOf(asset.path) < 0 ? "Add favorite" : "Remove favorite", function () {
                FD.store.toggleFavorite(asset.path);
            });
            action("Edit tags", function () {
                FD.ui.preview.showAsset(asset); var input = document.getElementById("tag-input"); if (input) input.focus();
            });
        }
        var path = asset ? asset.path : root.path;
        action("Reveal in Explorer / Finder", function () { FD.fs.reveal(path).then(feedback); });
        action("Copy path", function () { FD.fs.copyPath(path).then(function (r) {
            feedback(r); if (r.ok) FD.ui.toast("Path copied", "success");
        }); });
        if (root && root.removable) action("Remove folder from library", function () {
            FD.store.removeRoot(root.path);
            if (FD.state.currentFolder === root.path || String(FD.state.currentFolder || "").indexOf(root.path + "/") === 0) {
                window.dispatchEvent(new CustomEvent("collectionSelected", { detail: { name: "favorites" } }));
            }
        });
        document.body.appendChild(menu);
        var rect = returnFocus.getBoundingClientRect();
        var x = event.clientX || rect.left, y = event.clientY || rect.bottom;
        menu.style.left = Math.max(0, Math.min(x, window.innerWidth - menu.offsetWidth)) + "px";
        menu.style.top = Math.max(0, Math.min(y, window.innerHeight - menu.offsetHeight)) + "px";
        menu.firstChild.focus();
        menu.onkeydown = function (e) {
            var buttons = Array.prototype.slice.call(menu.children), index = buttons.indexOf(document.activeElement);
            if (e.key === "Escape") { close(true); e.preventDefault(); }
            else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                buttons[(index + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length].focus(); e.preventDefault();
            } else if (e.key === "Tab") close(false);
        };
    }
    function init() {
        document.addEventListener("contextmenu", function (event) {
            var card = event.target.closest(".asset-card"), root = event.target.closest(".folder-row");
            if (card) { FD.ui.grid.selectIndex(Number(card.dataset.index), false); open(event, card._asset); }
            else if (root) open(event, null, { path: root.dataset.path, removable: root.dataset.root === "true" });
        });
        document.addEventListener("mousedown", function (event) { if (menu && !menu.contains(event.target)) close(false); });
        window.addEventListener("blur", function () { close(false); });
        window.addEventListener("resize", function () { close(false); });
    }
    return { init: init, close: close };
})();
