const test = require('node:test');
const assert = require('node:assert/strict');
const { panel } = require('./helpers.cjs');
function setup(data, options = {}) {
    const written = [], messages = [], memory = {};
    const file = '/data/FolderDock/library.json';
    if (data !== undefined) memory[file] = data;
    const fs = { userDataDir: () => ({ ok: true, data: '/data' }),
        exists: path => ({ ok: true, data: path in memory }),
        readJSON(path) { try { return { ok: true, data: JSON.parse(memory[path]) }; } catch (_) { return { ok: false, error: 'invalid JSON' }; } },
        readText: path => ({ ok: true, data: memory[path] }),
        writeText(path, text) { memory[path] = text; written.push(path); return { ok: true }; },
        writeJSON(path, value) { if (options.writeError) return { ok: false, error: 'Disk full' };
            memory[path] = JSON.stringify(value); written.push(path); return { ok: true }; } };
    const c = panel(['js/core/store-schema.js', 'js/core/store.js'], { FD: { fs, ui: { toast: value => messages.push(value) } } });
    c.FD.store.load(); return { store: c.FD.store, memory, file, written, messages };
}
test('Library initializes, deduplicates roots/favorites and retains only 30 recent items', () => {
    const s = setup(); s.store.addRoot('C:\\media\\'); s.store.addRoot('C:/media');
    assert.equal(s.store.get('roots').length, 1);
    s.store.toggleFavorite('a'); s.store.toggleFavorite('a'); assert.equal(s.store.get('favorites').length, 0);
    for (let i = 0; i < 35; i++) s.store.addRecent(String(i));
    s.store.addRecent('32'); assert.equal(s.store.get('recents').length, 30); assert.equal(s.store.get('recents')[0], '32');
    s.store.addTag('a', ' #Warm Look '); s.store.addTag('a', 'warm-look');
    assert.deepEqual(Array.from(s.store.get('tags').a), ['warm-look']);
    s.store.removeTag('a', 'warm-look'); assert.equal(s.store.get('tags').a, undefined);
    assert.equal(s.store.saveNow().ok, true);
    assert.equal(JSON.parse(s.memory[s.file]).roots[0].path, 'C:/media');
});
test('Malformed and future-version libraries are preserved rather than overwritten', () => {
    for (const original of ['{broken', '{"version":99,"roots":["important"]}']) {
        const s = setup(original); s.store.addRoot('/new'); assert.equal(s.store.saveNow().ok, false);
        assert.equal(s.memory[s.file], original); assert.equal(s.written.length, 0);
        assert.equal(s.store.resetLibrary().ok, true);
        const backup = s.written.find(path => path.includes('.backup-'));
        assert.equal(s.memory[backup], original);
    }
});
test('Library sanitizes settings and surfaces failed saves', () => {
    const s = setup(JSON.stringify({ version: 1, roots: [null, { path: '/ok' }], tags: [], settings: { thumbSize: -10, accent: 'red', defaultAction: 'bad' } }), { writeError: true });
    assert.equal(s.store.get('roots').length, 1); assert.equal(s.store.get('settings').thumbSize, 140);
    assert.equal(s.store.get('settings').accent, '#ff8a3d');
    assert.equal(s.store.saveNow().ok, false); assert.match(s.messages.join(' '), /Disk full/);
});
test('Scanner resolves uppercase sidecars and excludes only the matched preview', () => {
    const entries = ['Title.MOGRT', 'Title.PNG', 'Video.mp4', 'README'].map(name => ({ name, path: 'C:\\Assets\\' + name, size: 20, mtime: 1 }));
    const c = panel(['js/core/types.js', 'js/core/previews.js', 'js/core/scanner.js'], { FD: { fs: { list: () => ({ ok: true, data: entries }) } } });
    const assets = c.FD.scanner.scan('C:/Assets'); assert.equal(assets.length, 3);
    assert.equal(assets.find(a => a.ext === 'mogrt').previewPath, 'C:/Assets/Title.PNG');
    assert.equal(assets.find(a => a.name === 'README').ext, '');
});
test('Search combines names and tags; size sorting and kind filtering use displayed assets', () => {
    const c = panel(['js/core/catalog.js'], { FD: { store: { get: () => ({ a: ['warm'] }) } } });
    const assets = [{ path: 'a', name: 'Clip 2', ext: 'mp4', kind: 'video', size: 2 }, { path: 'b', name: 'Clip 10', ext: 'png', kind: 'image', size: 10 }];
    assert.equal(c.FD.catalog.filter(assets, { query: '#warm clip' })[0].path, 'a');
    assert.equal(c.FD.catalog.filter(assets, { kind: 'image' })[0].path, 'b');
    assert.equal(c.FD.catalog.filter(assets, { sort: 'size' })[0].path, 'b');
});
