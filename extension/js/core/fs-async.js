window.FD = window.FD || {};
(function () {
    var node = null;
    try { if (FD.fs.isNative() && typeof require === "function") node = { fs: require("fs"), path: require("path") }; } catch (e) {}
    FD.fs.listAsync = function (dir) {
        return new Promise(function (resolve) {
            if (!node) { setTimeout(function () { resolve(FD.fs.list(dir)); }, 0); return; }
            node.fs.readdir(dir, function (error, names) {
                if (error) { resolve({ ok: false, error: error.message }); return; }
                var entries = new Array(names.length), warnings = [], next = 0, running = 0, completed = 0;
                if (!names.length) { resolve({ ok: true, data: [], warnings: [] }); return; }
                function pump() {
                    while (running < 8 && next < names.length) inspect(next++);
                }
                function inspect(index) {
                    var name = names[index], file = node.path.join(dir, name); running++;
                    node.fs.stat(file, function (error, stat) {
                        if (error) warnings.push(name);
                        else entries[index] = { name: name, path: file.replace(/\\/g, "/"), isDir: stat.isDirectory(),
                            size: stat.size, mtime: stat.mtime.getTime() };
                        running--; completed++;
                        if (completed === names.length) resolve({ ok: true, data: entries.filter(Boolean), warnings: warnings });
                        else pump();
                    });
                }
                pump();
            });
        });
    };
    FD.fs.canonicalAsync = function (dir) {
        return new Promise(function (resolve) {
            if (!node) { resolve(dir); return; }
            node.fs.realpath(dir, function (error, value) { resolve(error ? dir : value); });
        });
    };
    FD.fs.existsAsync = function (file) {
        return new Promise(function (resolve) {
            if (!node) { resolve(FD.fs.exists(file)); return; }
            node.fs.stat(file, function (error) { resolve({ ok: true, data: !error }); });
        });
    };
})();
