window.FD = window.FD || {};
(function () {
    var cp = null, platform = "", shell = null;
    try { if (typeof require === "function") { cp = require("child_process"); platform = require("os").platform(); } } catch (e) {}
    try { if (window.cep) shell = window.cep.util; } catch (e) {}
    FD.fs.reveal = function (path) {
        var found = FD.fs.exists(path);
        if (!found.ok || !found.data) return Promise.resolve({ ok: false, error: "File or folder is missing" });
        return new Promise(function (resolve) {
            if (!cp) { resolve({ ok: false, error: "Reveal is available inside Adobe with Node enabled" }); return; }
            var command = platform === "win32" ? "explorer.exe" : "open";
            var args = platform === "win32" ? ["/select,", path.replace(/\//g, "\\")] : ["-R", path];
            cp.execFile(command, args, { windowsHide: true }, function (error) {
                // Explorer may return 1 after successfully delegating to an existing window.
                resolve(error && !(platform === "win32" && error.code === 1) ?
                    { ok: false, error: error.message } : { ok: true });
            });
        });
    };
    FD.fs.copyPath = function (path) {
        function fallback() {
            var input = document.createElement("textarea"); input.value = path;
            input.style.position = "fixed"; input.style.opacity = "0";
            document.body.appendChild(input); input.select();
            var ok = false;
            try { ok = document.execCommand("copy"); } catch (e) {}
            document.body.removeChild(input);
            return { ok: ok, error: ok ? undefined : "Clipboard unavailable; select and copy the path in the preview" };
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(path).then(function () { return { ok: true }; }, fallback);
        }
        return Promise.resolve(fallback());
    };
})();
