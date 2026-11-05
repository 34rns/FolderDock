window.FD = window.FD || {};
FD.store = (function () {
    var state = FD.schema.library(), listeners = [], timer, filePath, writable = true, lastError = "";
    function report(error) {
        if (lastError !== error && FD.ui && FD.ui.toast) FD.ui.toast(error, "error");
        lastError = error; return { ok: false, error: error };
    }
    function location() {
        if (filePath) return filePath;
        var result = FD.fs.userDataDir();
        if (!result.ok) { report(result.error); return null; }
        filePath = result.data + "/FolderDock/library.json"; return filePath;
    }
    function emit(key) {
        listeners.slice().forEach(function (fn) { try { fn(state, key); } catch (e) { report(e.message); } });
    }
    function saveNow() {
        clearTimeout(timer); timer = null;
        var path = location(); if (!path) return report("Cannot locate the library data folder");
        if (!writable) return report("Library is read-only after a load error. Preserve the file before resetting the library.");
        var result = FD.fs.writeJSON(path, state);
        if (!result.ok) return report("Library could not be saved: " + result.error);
        lastError = ""; return result;
    }
    function save() { clearTimeout(timer); timer = setTimeout(saveNow, 300); }
    function load() {
        var path = location(); if (!path) { writable = false; return state; }
        var exists = FD.fs.exists(path);
        if (!exists.ok) { writable = false; report(exists.error); return state; }
        if (exists.data) {
            var result = FD.fs.readJSON(path), data = result.data;
            if (!result.ok || !data || Array.isArray(data) || data.version !== 1) {
                writable = false; report("Library could not be loaded; existing file preserved: " + (result.error || "Unsupported library format"));
            } else { state = FD.schema.library(data); writable = true; }
        } else saveNow();
        emit("*"); return state;
    }
    function set(key, value) {
        state[key] = value; emit(key); save();
    }
    function on(fn) {
        listeners.push(fn);
        return function () { var index = listeners.indexOf(fn); if (index >= 0) listeners.splice(index, 1); };
    }
    function addRoot(path, label) {
        path = FD.schema.path(path);
        if (state.roots.some(function (root) { return root.path === path; })) return;
        state.roots.push({ path: path, label: label || path.split("/").pop() || path }); emit("roots"); save();
    }
    function removeRoot(path) { set("roots", state.roots.filter(function (root) { return root.path !== path; })); }
    function toggleFavorite(path) {
        var index = state.favorites.indexOf(path);
        if (index < 0) state.favorites.push(path); else state.favorites.splice(index, 1);
        emit("favorites"); save();
    }
    function addRecent(path) {
        state.recents = [path].concat(state.recents.filter(function (value) { return value !== path; })).slice(0, 30);
        emit("recents"); save();
    }
    function addTag(path, tag) {
        tag = String(tag || "").trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, "-").slice(0, 40);
        if (!tag || (state.tags[path] || []).indexOf(tag) >= 0) return;
        state.tags[path] = (state.tags[path] || []).concat(tag); emit("tags"); save();
    }
    function removeTag(path, tag) {
        var tags = (state.tags[path] || []).filter(function (value) { return value !== tag; });
        if (tags.length) state.tags[path] = tags; else delete state.tags[path];
        emit("tags"); save();
    }
    function updateSettings(value) { state.settings = FD.schema.settings(Object.assign({}, state.settings, value)); emit("settings"); save(); }
    function resetLibrary() {
        var path = location(); if (!path) return report("Cannot locate the library data folder");
        if (FD.fs.exists(path).data) {
            var original = FD.fs.readText(path);
            if (!original.ok) return report("Cannot preserve the existing library: " + original.error);
            var backup = FD.fs.writeText(path + ".backup-" + Date.now(), original.data);
            if (!backup.ok) return report("Cannot back up the existing library: " + backup.error);
        }
        state = FD.schema.library({ settings: state.settings }); writable = true; emit("*");
        return saveNow();
    }
    return { load: load, save: save, saveNow: saveNow, getState: function () { return state; },
        get: function (key) { return state[key]; }, set: set, on: on, addRoot: addRoot, removeRoot: removeRoot,
        toggleFavorite: toggleFavorite, addRecent: addRecent, addTag: addTag, removeTag: removeTag,
        updateSettings: updateSettings, resetLibrary: resetLibrary };
})();
