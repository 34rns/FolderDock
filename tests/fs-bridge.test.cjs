const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { panel } = require('./helpers.cjs');
test('File URLs encode reserved characters while preserving drive, Unix and UNC forms', () => {
    const c = panel(['js/core/fs.js']);
    assert.equal(c.FD.fs.fileURL('C:\\a #1\\it\'s%.png'), 'file:///C:/a%20%231/it\'s%25.png');
    assert.equal(c.FD.fs.fileURL('/Users/me/a b.png'), 'file:///Users/me/a%20b.png');
    assert.equal(c.FD.fs.fileURL('\\\\server\\share\\a#b.png'), 'file://server/share/a%23b.png');
});
test('Native storage creates directories, writes atomically and preserves originals on rename failure', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'folderdock-test-'));
    try {
        let failRename = false;
        const native = Object.assign({}, fs, { renameSync(a, b) { if (failRename) throw Error('rename blocked'); fs.renameSync(a, b); } });
        const c = panel(['js/core/fs.js'], { __adobe_cep__: {}, require: id => id === 'fs' ? native : require(id),
            CSInterface: function () { this.getSystemPath = () => directory; }, SystemPath: { USER_DATA: 'user' } });
        const file = path.join(directory, 'FolderDock', 'library.json');
        assert.equal(c.FD.fs.writeJSON(file, { version: 1 }).ok, true);
        failRename = true; assert.equal(c.FD.fs.writeJSON(file, { version: 2 }).ok, false);
        assert.equal(JSON.parse(fs.readFileSync(file)).version, 1);
        assert.equal(fs.readdirSync(path.dirname(file)).length, 1);
        assert.equal(c.FD.fs.list(path.dirname(file)).data[0].isDir, false);
    } finally {
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(directory).startsWith('folderdock-test-'));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
test('Bridge escapes paths and Unicode separators without evaluating payload code', async () => {
    const payload = { path: 'C:/it\'s "name"\u2028\\file.mp4', mode: 'project' };
    let received;
    const host = { FD: { importFile(value) { received = JSON.parse(value); return JSON.stringify({ ok: true, data: { imported: true } }); } } };
    const c = panel(['js/core/bridge.js'], { __adobe_cep__: {}, CSInterface: function () {
        this.evalScript = (source, cb) => cb(vm.runInNewContext(source, host));
    } });
    assert.equal((await c.FD.bridge.call('importFile', payload)).ok, true); assert.deepEqual(received, payload);
    assert.equal((await c.FD.bridge.call('importFile);injected(', payload)).ok, false);
});
test('A broken Adobe bridge never silently uses the mock host', async () => {
    let called = false;
    const c = panel(['js/core/bridge.js'], { __adobe_cep__: {}, FD: { mockHost: { call() { called = true; return Promise.resolve({ ok: true }); } } } });
    assert.equal((await c.FD.bridge.call('hostInfo')).ok, false); assert.equal(called, false);
});
