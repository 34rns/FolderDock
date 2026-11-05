window.FD = window.FD || {};
FD.catalog = (function () {
    function filter(assets, state) {
        state = state || {};
        var words = String(state.query || "").toLowerCase().split(/\s+/).filter(Boolean);
        var tags = FD.store.get("tags") || {};
        var result = assets.filter(function (asset) {
            if (state.kind && state.kind !== "all" && asset.kind !== state.kind) return false;
            var name = (asset.name + "." + asset.ext).toLowerCase();
            return words.every(function (word) {
                if (word.charAt(0) === "#") return (tags[asset.path] || []).indexOf(word.slice(1)) !== -1;
                return name.indexOf(word) !== -1;
            });
        });
        if (state.sort === "recent") return result;
        return result.sort(function (a, b) {
            var value = 0;
            if (state.sort === "modified") value = b.mtime - a.mtime;
            if (state.sort === "size") value = b.size - a.size;
            if (state.sort === "type") value = a.ext.localeCompare(b.ext);
            return value || a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }
    async function resolve(paths, cancelled) {
        var folders = Object.create(null), assets = [];
        for (var i = 0; i < paths.length; i++) {
            if (cancelled && cancelled()) return [];
            var path = paths[i];
            var slash = path.lastIndexOf("/"), dir = path.slice(0, slash + 1);
            if (!folders[dir]) folders[dir] = (await FD.scanner.scanAsync(dir.replace(/\/$/, ""), cancelled)).assets;
            var found = folders[dir].filter(function (asset) { return asset.path === path; })[0];
            if (found) { assets.push(found); continue; }
            var filename = path.slice(slash + 1), dot = filename.lastIndexOf(".");
            var exists = await FD.fs.existsAsync(path);
            assets.push({ id: path, path: path, name: dot > 0 ? filename.slice(0, dot) : filename,
                ext: dot > 0 ? filename.slice(dot + 1).toLowerCase() : "", kind: FD.types.getKind(filename),
                size: 0, mtime: 0, previewPath: null, missing: !exists.data });
        }
        return assets;
    }
    return { filter: filter, resolve: resolve };
})();
