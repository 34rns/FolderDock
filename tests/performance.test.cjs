const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { panel } = require('./helpers.cjs');

test('Opening a saved library does not scan or start a filesystem watcher', async () => {
    const dispatched = [], watched = [];
    const node = { textContent: '', title: '', onclick: null };
    const c = panel(['js/main.js'], { addEventListener() {}, dispatchEvent: e => dispatched.push(e.type),
        CustomEvent: function (type) { this.type = type; },
        document: { hidden: false, addEventListener() {}, getElementById: () => node },
        FD: { fs: { watch: p => { watched.push(p); return { close() {} }; } },
            store: { load() {}, get: key => key === 'roots' ? [{ path: '/large-library' }] : { thumbSize: 140 } },
            ui: { grid: { init() {}, renderAssets() {}, setThumbSize() {} } },
            bridge: { call: () => Promise.resolve({ ok: true, data: { app: 'PPRO', version: '26' } }) } }
    });
    c.FD.main.init(); await Promise.resolve();
    assert.ok(!dispatched.includes('folderSelected'), 'Startup must wait for an explicit folder selection');
    assert.deepEqual(watched, []);
});

test('Sidecar matching indexes filenames instead of repeatedly searching whole folders', () => {
    const c = panel(['js/core/types.js', 'js/core/previews.js', 'js/core/scanner.js'], { FD: { fs: {} } });
    vm.runInContext(`
        var entries = [], lowerCalls = 0, lower = String.prototype.toLowerCase;
        for (var i = 0; i < 500; i++) ['.mogrt', '.jpg'].forEach(function (ext) {
            entries.push({ name: 'Title ' + i + ext, path: '/assets/Title ' + i + ext, size: 1, mtime: 1 });
        });
        FD.fs.list = function (dir) { return { ok: true, data: dir === '/assets' ? entries : [] }; };
        String.prototype.toLowerCase = function () { lowerCalls++; return lower.call(this); };
        var started = Date.now(), assets = FD.scanner.scan('/assets'), elapsed = Date.now() - started;
    `, c);
    assert.equal(c.assets.length, 500);
    console.log('Sidecar benchmark:', JSON.stringify({ assets: 500, milliseconds: c.elapsed, filenameNormalizations: c.lowerCalls }));
    assert.ok(c.lowerCalls < 25000, 'Filename work must grow linearly with folder size; observed ' + c.lowerCalls);
});

test('Recursive scanning uses asynchronous reads and can cancel inside a large folder', async () => {
    const entries = Array.from({ length: 10000 }, (_, i) => ({ name: i + '.png', path: '/assets/' + i + '.png', size: 1, mtime: 1 }));
    let cancelled = false, reads = 0;
    const c = panel(['js/core/types.js', 'js/core/previews.js', 'js/core/scanner.js'], { FD: { fs: {
        list() { throw Error('Synchronous filesystem reads block the panel'); },
        listAsync: async dir => { reads++; return { ok: true, data: dir === '/assets' ? entries : [] }; },
        canonicalAsync: async dir => dir
    } } });
    const pending = c.FD.scanner.scanTree('/assets', () => cancelled);
    setTimeout(() => { cancelled = true; }, 0);
    assert.equal((await pending).cancelled, true);
    assert.ok(reads <= 2, 'Read each directory at most once per scan');
});

test('Native asynchronous listing bounds concurrent metadata reads', async () => {
    let active = 0, maximum = 0;
    const fake = { readdir: (dir, done) => done(null, Array.from({ length: 40 }, (_, i) => i + '.png')),
        stat: (file, done) => { active++; maximum = Math.max(maximum, active); setTimeout(() => {
            active--; done(null, { isDirectory: () => false, size: 8, mtime: new Date(1) });
        }, 1); }, realpath: (dir, done) => done(null, dir) };
    const c = panel(['js/core/fs-async.js'], { require: name => name === 'fs' ? fake : require(name),
        FD: { fs: { isNative: () => true } } });
    const result = await c.FD.fs.listAsync('/assets');
    assert.equal(result.data.length, 40); assert.ok(maximum <= 8); assert.ok(maximum > 1);
});
test('Waveform work skips abandoned cards and prioritizes the selected preview', async () => {
    let finish, reads = [], visible = true;
    const c = panel(['js/core/waveforms.js'], { FD: { store: { get: () => ({ ffmpegPath: '' }) },
        audioDecode: { decode: (asset) => { reads.push(asset.path); return new Promise(resolve => { finish = resolve; }); } },
        fs: { readBinary() { throw Error('Decoder must control memory limits'); } }, ffmpeg: { ensure: async () => ({ ok: false }) }
    } });
    const a = c.FD.waveforms.load({ path: 'a.wav', size: 1 }, () => true);
    await new Promise(resolve => setTimeout(resolve, 30));
    const stale = c.FD.waveforms.load({ path: 'old.wav', size: 1 }, () => visible);
    const selected = c.FD.waveforms.load({ path: 'selected.wav', size: 1 }, () => true, true);
    visible = false; finish({ peaks: [1], duration: 1 }); await a;
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepEqual(reads, ['a.wav', 'selected.wav']);
    finish({ peaks: [1], duration: 1 }); await selected;
    assert.equal((await stale).skipped, true);
});
