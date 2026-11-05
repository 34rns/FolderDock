window.FD = window.FD || {};
FD.ui.tags = (function () {
    var host, asset;
    function refresh() {
        if (!host || !asset) return;
        var list = host.querySelector(".tag-list");
        list.textContent = "";
        (FD.store.get("tags")[asset.path] || []).forEach(function (tag) {
            var chip = FD.ui.el("button", "tag-chip", "#" + tag + " ×");
            chip.title = "Remove tag " + tag;
            chip.onclick = function () { FD.store.removeTag(asset.path, tag); };
            list.appendChild(chip);
        });
    }
    function render(container, selected) {
        host = container; asset = selected;
        host.textContent = "";
        host.appendChild(FD.ui.el("div", "tag-list"));
        var form = FD.ui.el("form", "tag-form"), input = FD.ui.el("input", "");
        input.id = "tag-input"; input.placeholder = "Add a tag"; input.maxLength = 40;
        input.setAttribute("aria-label", "New tag");
        var add = FD.ui.el("button", "", "Add tag"); add.type = "submit";
        form.onsubmit = function (event) {
            event.preventDefault();
            FD.store.addTag(asset.path, input.value);
            input.value = ""; input.focus();
        };
        form.appendChild(input); form.appendChild(add); host.appendChild(form); refresh();
    }
    function init() {
        FD.store.on(function (state, key) { if (key === "tags") refresh(); });
    }
    return { init: init, render: render };
})();
