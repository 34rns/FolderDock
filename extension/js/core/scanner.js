window.FD = window.FD || {};
FD.scanner = (function () {
    function assetFor(item, resolver, hidden) {
        var dot = item.name.lastIndexOf("."), path = item.path.replace(/\\/g, "/");
        var asset = { id: path, path: path, name: dot > 0 ? item.name.slice(0, dot) : item.name,
            ext: dot > 0 ? item.name.slice(dot + 1).toLowerCase() : "", filename: item.name,
            kind: FD.types.getKind(item.name), size: item.size || 0, mtime: item.mtime || 0, previewPath: null };
        var preview = resolver.find(asset);
        if (preview) {
            asset.thumbPath = preview.path; asset.previewMtime = preview.mtime || 0;
            asset.previewPath = FD.previews.playable(asset) ? path : preview.path; hidden[preview.path] = true;
        } else if (FD.previews.playable(asset)) asset.previewPath = path;
        return asset;
    }
    function isAsset(item) { return !item.isDir && !/\.(pek|cfa|tmp|tmpd|db)$/i.test(item.name) && item.name.charAt(0) !== "."; }
    function files(dir, resolver) {
        var items = resolver.list(dir), hidden = Object.create(null);
        var assets = items.filter(isAsset).map(function (item) { return assetFor(item, resolver, hidden); });
        return assets.filter(function (asset) { return !hidden[asset.path]; });
    }
    function scan(dir) {
        return files(dir.replace(/\\/g, "/").replace(/\/$/, ""), FD.previews.resolver());
    }
    async function scanAsync(dir, cancelled, resolver) {
        resolver = resolver || FD.previews.resolver();
        var result = await resolver.prepare(dir, cancelled), assets = [], hidden = Object.create(null);
        if (!result.ok) return { assets: [], warnings: [dir] };
        var items = resolver.list(dir);
        for (var i = 0; i < items.length; i++) {
            if (i % 100 === 0) {
                await new Promise(function (resolve) { setTimeout(resolve, 4); });
                if (cancelled && cancelled()) return { assets: [], cancelled: true };
            }
            if (isAsset(items[i])) assets.push(assetFor(items[i], resolver, hidden));
        }
        return { assets: assets.filter(function (asset) { return !hidden[asset.path]; }), warnings: [] };
    }
    async function scanTree(dir, cancelled) {
        var resolver = FD.previews.resolver(), pending = [dir], head = 0, assets = [], visited = Object.create(null), warnings = [];
        while (head < pending.length) {
            if (cancelled && cancelled()) return { assets: [], cancelled: true };
            var current = pending[head++];
            var key = FD.fs.canonicalAsync ? await FD.fs.canonicalAsync(current) : FD.fs.canonical ? FD.fs.canonical(current) : current;
            if (visited[key]) continue;
            visited[key] = true;
            var result = await scanAsync(current, cancelled, resolver);
            if (result.cancelled) return result;
            if (result.warnings.length) { warnings.push(current); continue; }
            result.assets.forEach(function (asset) { assets.push(asset); });
            resolver.list(current).forEach(function (item) {
                if (item.isDir && !FD.previews.supportDirectory(item.name) && item.name.charAt(0) !== ".") pending.push(item.path);
            });
        }
        return { assets: assets, warnings: warnings };
    }
    function signature(assets) {
        return assets.map(function (asset) { return [asset.path, asset.size, asset.mtime, asset.previewPath, asset.thumbPath, asset.previewMtime].join("|"); }).join("\n");
    }
    return { scan: scan, scanAsync: scanAsync, scanTree: scanTree, signature: signature };
})();
