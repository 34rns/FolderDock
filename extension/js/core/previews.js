window.FD = window.FD || {};
FD.previews = (function () {
    function supportDirectory(name) { return /^(_mister horse previews|[_.]?previews?|thumbnails)$/i.test(name); }
    function resolver() {
        var directories = Object.create(null), indexes = Object.create(null), mirrors = Object.create(null), results = Object.create(null);
        function remember(path, result) {
            var index = Object.create(null), support = [];
            var entries = result.ok ? result.data.map(function (item) {
                var entry = Object.assign({}, item, { path: item.path.replace(/\\/g, "/") });
                if (!entry.isDir) index[entry.name.toLowerCase()] = entry;
                else if (supportDirectory(entry.name)) support.push(entry);
                return entry;
            }) : [];
            directories[path] = entries; indexes[path] = index; mirrors[path] = support; results[path] = result;
            return entries;
        }
        function list(path) {
            if (!directories[path]) remember(path, FD.fs.list(path));
            return directories[path];
        }
        async function load(path) {
            if (!directories[path]) remember(path, await (FD.fs.listAsync ? FD.fs.listAsync(path) : Promise.resolve(FD.fs.list(path))));
            return results[path];
        }
        function parent(path) {
            if (path === "/" || /^[a-z]:\/$/i.test(path) || /^\/\/[^/]+\/[^/]+\/?$/.test(path)) return null;
            var slash = path.lastIndexOf("/");
            return slash === 0 ? "/" : slash === 2 && path.charAt(1) === ":" ? path.slice(0, 3) : slash < 0 ? null : path.slice(0, slash);
        }
        function relative(dir, ancestor) { return dir === ancestor ? "" : dir.slice(ancestor.length + (ancestor.slice(-1) === "/" ? 0 : 1)); }
        async function prepare(dir, cancelled) {
            var first = await load(dir), ancestor = dir;
            while (ancestor && !(cancelled && cancelled())) {
                await load(ancestor);
                var suffix = relative(dir, ancestor);
                for (var i = 0; i < mirrors[ancestor].length; i++) await load(mirrors[ancestor][i].path + (suffix ? "/" + suffix : ""));
                ancestor = parent(ancestor);
            }
            return first;
        }
        function match(dir, asset) {
            list(dir);
            var names = [asset.filename || asset.name + "." + asset.ext, asset.name];
            var extensions = asset.kind === "video" ? ["png", "jpg", "jpeg", "webp", "gif"] : ["mp4", "webm", "gif", "png", "jpg", "jpeg", "webp"];
            for (var n = 0; n < names.length; n++) for (var e = 0; e < extensions.length; e++) {
                var wanted = (names[n] + "." + extensions[e]).toLowerCase();
                var entry = indexes[dir][wanted];
                if (entry && entry.path !== asset.path) return entry;
            }
            return null;
        }
        function find(asset) {
            if (asset.kind === "audio" || (asset.kind === "image" && playable(asset))) return null;
            var dir = parent(asset.path), found = match(dir, asset);
            if (found) return found;
            var ancestor = dir;
            while (ancestor) {
                list(ancestor);
                var suffix = relative(dir, ancestor), support = mirrors[ancestor];
                for (var i = 0; i < support.length; i++) {
                    var mirror = support[i].path + (suffix ? "/" + suffix : "");
                    found = match(mirror, asset); if (found) return found;
                }
                ancestor = parent(ancestor);
            }
            return null;
        }
        return { find: find, list: list, prepare: prepare };
    }
    function playable(asset) {
        return /^(mp4|mov|m4v|webm|avi|mxf|png|jpg|jpeg|gif|webp|svg)$/.test(asset.ext);
    }
    return { resolver: resolver, supportDirectory: supportDirectory, playable: playable };
})();
