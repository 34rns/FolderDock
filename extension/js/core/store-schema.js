window.FD = window.FD || {};
FD.schema = (function () {
    function path(value) { return String(value || "").replace(/\\/g, "/").replace(/([^:])\/+$/, "$1"); }
    function paths(values, limit) {
        var seen = Object.create(null);
        return (Array.isArray(values) ? values : []).filter(function (value) { return typeof value === "string" && value.length; })
            .map(path).filter(function (value) { if (seen[value]) return false; seen[value] = true; return true; }).slice(0, limit || Infinity);
    }
    function settings(value) {
        value = value || {};
        var size = Number(value.thumbSize);
        return { thumbSize: isFinite(size) && size > 0 ? Math.max(90, Math.min(220, Math.round(size / 10) * 10)) : 140,
            accent: /^#[0-9a-f]{6}$/i.test(value.accent || "") ? value.accent : "#ff8a3d",
            defaultAction: value.defaultAction === "timeline" ? "timeline" : "project",
            ffmpegPath: typeof value.ffmpegPath === "string" ? value.ffmpegPath.trim() : "", previewOnHover: value.previewOnHover !== false };
    }
    function library(data) {
        data = data || {};
        var seen = Object.create(null);
        var roots = (Array.isArray(data.roots) ? data.roots : []).filter(function (root) {
            return root && typeof root.path === "string" && root.path;
        }).map(function (root) {
            return { path: path(root.path), label: typeof root.label === "string" && root.label ? root.label : path(root.path).split("/").pop() || root.path };
        }).filter(function (root) { if (seen[root.path]) return false; seen[root.path] = true; return true; });
        var tags = Object.create(null);
        if (data.tags && typeof data.tags === "object" && !Array.isArray(data.tags)) Object.keys(data.tags).forEach(function (key) {
            tags[path(key)] = paths(data.tags[key]).map(function (tag) { return tag.toLowerCase(); });
        });
        return { version: 1, roots: roots, favorites: paths(data.favorites), recents: paths(data.recents, 30), tags: tags, settings: settings(data.settings) };
    }
    return { path: path, settings: settings, library: library };
})();
