window.FD = window.FD || {};
(function () {
    FD.fs.chooseFolder = function () { return Promise.resolve(FD.fs.pickFolder()); };
    if (FD.fs.isNative()) return;
    var directories = Object.create(null), files = Object.create(null), urls = Object.create(null);
    var originalExists = FD.fs.exists, originalURL = FD.fs.fileURL;
    FD.fs.list = function (dir) {
        dir = FD.schema.path(dir);
        return directories[dir] ? { ok: true, data: directories[dir] } : { ok: false, error: "Choose this folder again for the browser session" };
    };
    FD.fs.exists = function (path) {
        return directories[FD.schema.path(path)] || files[path] ? { ok: true, data: true } : originalExists(path);
    };
    FD.fs.fileURL = function (path) { return urls[path] || originalURL(path); };
    FD.fs.readBinary = function (path) {
        return new Promise(function (resolve, reject) {
            var file = files[path];
            if (!file || file.size > 33554432) { reject(Error("Audio unavailable or too large for browser decoding")); return; }
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(Error("Cannot read audio file")); };
            reader.readAsArrayBuffer(file);
        });
    };
    FD.fs.chooseFolder = function () {
        return new Promise(function (resolve) {
            var input = document.createElement("input"); input.type = "file"; input.multiple = true;
            input.setAttribute("webkitdirectory", ""); input.hidden = true; input.id = "browser-folder-picker";
            document.body.appendChild(input);
            function finish(result) { input.remove(); resolve(result); }
            input.oncancel = function () { finish({ ok: true, data: null }); };
            input.onchange = function () {
                if (!input.files.length) { finish({ ok: true, data: null }); return; }
                var root = "/browser/" + input.files[0].webkitRelativePath.split("/")[0];
                Object.keys(directories).forEach(function (path) { if (path === root || path.indexOf(root + "/") === 0) delete directories[path]; });
                Object.keys(files).forEach(function (path) {
                    if (path.indexOf(root + "/") === 0) { URL.revokeObjectURL(urls[path]); delete urls[path]; delete files[path]; }
                });
                Array.prototype.forEach.call(input.files, function (file) {
                    var path = "/browser/" + file.webkitRelativePath, parts = path.split("/");
                    for (var i = 3; i < parts.length; i++) {
                        var parent = parts.slice(0, i).join("/"), child = parts.slice(0, i + 1).join("/");
                        if (!directories[parent]) directories[parent] = [];
                        if (!directories[parent].some(function (item) { return item.path === child; })) {
                            directories[parent].push({ name: parts[i], path: child, isDir: i < parts.length - 1, size: file.size, mtime: file.lastModified });
                        }
                    }
                    files[path] = file; urls[path] = URL.createObjectURL(file);
                });
                finish({ ok: true, data: root });
            };
            input.click();
        });
    };
})();
