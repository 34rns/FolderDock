window.FD = window.FD || {};
FD.ui.settings = (function () {
    var overlay = null, previousFocus;
    function apply(settings) {
        document.documentElement.style.setProperty("--accent", settings.accent);
        FD.ui.grid.setThumbSize(settings.thumbSize);
    }
    function close() {
        if (overlay) { overlay.remove(); overlay = null; }
        if (previousFocus) previousFocus.focus();
    }
    function open() {
        if (overlay) return;
        previousFocus = document.activeElement;
        var settings = FD.store.get("settings"), fields = {};
        overlay = FD.ui.el("div", "modal-overlay");
        var dialog = FD.ui.el("form", "settings-dialog");
        dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "settings-heading");
        var heading = FD.ui.el("h2", "", "Settings"); heading.id = "settings-heading"; dialog.appendChild(heading);
        function field(key, text, type) {
            var label = FD.ui.el("label", "setting-field", text), input = document.createElement("input");
            input.type = type; input.id = "setting-" + key;
            if (type === "checkbox") input.checked = settings[key]; else input.value = settings[key];
            label.appendChild(input); dialog.appendChild(label); fields[key] = input; return input;
        }
        field("accent", "Accent color", "color");
        var size = field("thumbSize", "Thumbnail size", "range"); size.min = "90"; size.max = "220"; size.step = "10";
        size.value = settings.thumbSize;
        var sizeLabel = FD.ui.el("span", "empty-note", size.value + " px"); size.parentNode.appendChild(sizeLabel);
        size.oninput = function () { sizeLabel.textContent = size.value + " px"; };
        dialog.appendChild(FD.ui.el("p", "empty-note", "Import, Insert, double-click and Enter place media on an empty track or new layer at the playhead."));
        field("previewOnHover", "Play video previews on hover", "checkbox");
        var ffmpeg = field("ffmpegPath", "FFmpeg executable (optional)", "text");
        ffmpeg.placeholder = "Leave empty to keep conversion off"; ffmpeg.spellcheck = false;
        dialog.appendChild(FD.ui.el("p", "empty-note", "Use an existing FFmpeg executable. Converted previews stay in FolderDock’s data folder."));
        var buttons = FD.ui.el("div", "dialog-actions"), cancel = FD.ui.el("button", "", "Cancel");
        cancel.onclick = close;
        var save = FD.ui.el("button", "primary", "Save settings"); save.type = "submit";
        buttons.appendChild(cancel); buttons.appendChild(save); dialog.appendChild(buttons);
        var reset = FD.ui.el("button", "reset-library", "Reset library");
        reset.onclick = function () {
            if (!confirm("Remove all library folders, favorites, recent imports and tags? Your files stay on disk.")) return;
            if (!FD.store.resetLibrary().ok) return;
            window.dispatchEvent(new CustomEvent("collectionSelected", { detail: { name: "favorites" } }));
            FD.ui.toast("Library reset. Your files are unchanged.", "info"); close();
        };
        dialog.appendChild(reset);
        dialog.onsubmit = function (event) {
            event.preventDefault(); var path = ffmpeg.value.trim();
            if (path && (!/^([a-z]:[\\/]|\/|\\\\)/i.test(path) || !FD.fs.exists(path).data)) {
                FD.ui.toast("Select the full path to an existing FFmpeg executable", "error"); ffmpeg.focus(); return;
            }
            FD.store.updateSettings({ accent: fields.accent.value, thumbSize: Number(size.value),
                defaultAction: "timeline", previewOnHover: fields.previewOnHover.checked, ffmpegPath: path });
            if (FD.store.saveNow().ok) { close(); FD.ui.toast("Settings saved", "success"); }
        };
        overlay.onmousedown = function (event) { if (event.target === overlay) close(); };
        overlay.onkeydown = function (event) {
            if (event.key === "Escape") { event.preventDefault(); close(); return; }
            if (event.key !== "Tab") return;
            var focusable = dialog.querySelectorAll("input,select,button"), first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
            else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
        };
        overlay.appendChild(dialog); document.body.appendChild(overlay); fields.accent.focus();
    }
    function init() {
        apply(FD.store.get("settings"));
        FD.store.on(function (state, key) { if (key === "settings" || key === "*") apply(state.settings); });
        document.getElementById("btn-settings").onclick = open;
    }
    return { init: init, open: open, close: close };
})();
