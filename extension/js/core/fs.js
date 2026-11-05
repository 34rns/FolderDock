window.FD = window.FD || {};
FD.fs = (function () {
    var nativeHost = typeof window.__adobe_cep__ !== "undefined";
    var node = null, cep = nativeHost && window.cep ? window.cep.fs : null, memory = Object.create(null);
    try { if (nativeHost && typeof require === "function") node = { fs: require("fs"), path: require("path") }; } catch (e) {}
    function ok(data) { return { ok: true, data: data }; }
    function fail(error) { return { ok: false, error: error.message || String(error) }; }
    function normalize(path) { return String(path).replace(/\\/g, "/"); }
    function userDataDir() {
        if (!nativeHost) return ok("/mock-user-data");
        try {
            var path = new CSInterface().getSystemPath(SystemPath.USER_DATA);
            if (!path) throw Error("Adobe did not provide its user-data folder");
            return ok(normalize(path));
        } catch (e) { return fail(e); }
    }
    function pickFolder() {
        try {
            if (cep && (cep.showOpenDialogEx || cep.showOpenDialog)) {
                var dialog = cep.showOpenDialogEx || cep.showOpenDialog;
                var result = dialog.call(cep, false, true, "Choose an asset folder", "", []);
                if (result.err) return fail("Folder picker error: " + result.err);
                return ok(result.data && result.data.length ? normalize(result.data[0]) : null);
            }
            var path = prompt("Enter the full path of your asset folder:");
            return ok(path ? normalize(path.trim()) : null);
        } catch (e) { return fail(e); }
    }
    function exists(path) {
        try {
            if (node) return ok(node.fs.existsSync(path));
            if (cep) return ok(cep.stat(path).err === 0);
            return ok(Object.prototype.hasOwnProperty.call(memory, path));
        } catch (e) { return fail(e); }
    }
    function list(dir) {
        try {
            var items = [], warnings = [];
            if (node) {
                node.fs.readdirSync(dir).forEach(function (name) {
                    try {
                        var path = node.path.join(dir, name), stat = node.fs.statSync(path);
                        items.push({ name: name, path: normalize(path), isDir: stat.isDirectory(), size: stat.size, mtime: stat.mtime.getTime() });
                    } catch (e) { warnings.push(name); }
                });
            } else if (cep) {
                var result = cep.readdir(dir); if (result.err) return fail("Cannot read folder (CEP " + result.err + ")");
                result.data.forEach(function (name) {
                    var path = normalize(dir).replace(/\/$/, "") + "/" + name, result = cep.stat(path);
                    if (result.err) { warnings.push(name); return; }
                    var stat = result.data || result, isDir = typeof stat.isDirectory === "function" ? stat.isDirectory() : stat.isDirectory;
                    var modified = stat.mtime || stat.modificationTime || stat.modifyTime || 0;
                    items.push({ name: name, path: path, isDir: !!isDir, size: stat.size || 0,
                        mtime: typeof modified === "number" && modified < 1000000000000 ? modified * 1000 : Number(modified) || 0 });
                });
            } else return fail("Choose a local folder for this browser session");
            return { ok: true, data: items, warnings: warnings };
        } catch (e) { return fail(e); }
    }
    function readText(path) {
        try {
            if (node) return ok(node.fs.readFileSync(path, "utf8"));
            if (cep) { var result = cep.readFile(path, "UTF8"); return result.err ? fail("Read error: " + result.err) : ok(result.data); }
            return Object.prototype.hasOwnProperty.call(memory, path) ? ok(memory[path]) : fail("File not found");
        } catch (e) { return fail(e); }
    }
    function mkdir(dir) {
        if (node.fs.existsSync(dir)) return;
        var parent = node.path.dirname(dir); if (parent !== dir) mkdir(parent);
        node.fs.mkdirSync(dir);
    }
    function writeText(path, text) {
        var temporary;
        try {
            if (node) {
                mkdir(node.path.dirname(path)); temporary = path + ".tmp-" + Date.now();
                node.fs.writeFileSync(temporary, text, "utf8"); node.fs.renameSync(temporary, path); return ok(true);
            }
            if (cep) {
                var dir = normalize(path).replace(/\/[^/]*$/, "");
                if (cep.stat(dir).err) { var made = cep.makedir(dir); if (made.err) return fail("Cannot create data folder: " + made.err); }
                var result = cep.writeFile(path, text, "UTF8"); return result.err ? fail("Write error: " + result.err) : ok(true);
            }
            memory[path] = text; return ok(true);
        } catch (e) {
            try { if (temporary && node.fs.existsSync(temporary)) node.fs.unlinkSync(temporary); } catch (ignored) {}
            return fail(e);
        }
    }
    function readJSON(path) {
        var result = readText(path); if (!result.ok) return result;
        try { return ok(JSON.parse(result.data)); } catch (e) { return fail(e); }
    }
    function writeJSON(path, value) {
        try { return writeText(path, JSON.stringify(value, null, 2)); } catch (e) { return fail(e); }
    }
    function watch(dir, callback) {
        try {
            if (node) {
                var watcher = node.fs.watch(dir, { persistent: false, recursive: true }, function (event, name) { callback(event, name); });
                watcher.on("error", function (error) { callback("error", error.message); });
                return { close: function () { watcher.close(); } };
            }
        } catch (e) { setTimeout(function () { callback("error", e.message); }, 0); }
        return { close: function () {} };
    }
    function fileURL(path) {
        path = normalize(path);
        var encoded = path.split("/").map(encodeURIComponent).join("/").replace(/^([a-z])%3A/i, "$1:");
        return (path.indexOf("//") === 0 ? "file:" : path.charAt(0) === "/" ? "file://" : "file:///") + encoded;
    }
    return { canonical: function (path) { try { return node ? node.fs.realpathSync(path) : path; } catch (e) { return path; } },
        isNative: function () { return nativeHost; }, normalize: normalize,
        userDataDir: userDataDir, pickFolder: pickFolder, exists: exists, list: list, readText: readText,
        writeText: writeText, readJSON: readJSON, writeJSON: writeJSON, watch: watch, fileURL: fileURL };
})();
