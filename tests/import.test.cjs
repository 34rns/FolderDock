const test = require('node:test');
const assert = require('node:assert/strict');
const { panel } = require('./helpers.cjs');
function setup() {
    const calls = [], recents = [], messages = []; let resolve;
    const c = panel(['js/main.js'], { addEventListener() {}, document: { body: { classList: { add() {}, remove() {} } } },
        FD: { store: { get: () => ({ defaultAction: 'timeline' }), addRecent: path => recents.push(path) },
            ui: { toast: text => messages.push(text) }, bridge: { call(fn, payload) {
                calls.push(payload); return new Promise(done => { resolve = done; });
            } } } });
    return { main: c.FD.main, calls, recents, messages, finish: value => resolve(value) };
}
test('Shared imports honor default mode, prevent concurrent duplicates and record only success', async () => {
    const s = setup(), asset = { path: 'a.mp4', name: 'a', ext: 'mp4' };
    const pending = s.main.importAsset(asset); assert.equal(s.calls[0].mode, 'timeline');
    assert.equal((await s.main.importAsset(asset)).ok, false); assert.equal(s.calls.length, 1);
    s.finish({ ok: true, data: { imported: true, placed: true } }); await pending;
    assert.deepEqual(s.recents, ['a.mp4']);
    const failed = s.main.importAsset(asset, 'project'); s.finish({ ok: false, error: 'No sequence' });
    assert.equal((await failed).ok, false); assert.equal(s.recents.length, 1);
});
test('FFX and MOGRT route to preset mode and empty host success is not reported as import success', async () => {
    const s = setup(); const pending = s.main.importAsset({ path: 'style.ffx', ext: 'ffx' }, 'project');
    assert.equal(s.calls[0].mode, 'preset'); s.finish({ ok: true, data: {} });
    assert.equal((await pending).ok, false); assert.equal(s.recents.length, 0);
});
test('Both media buttons place a layer but project documents retain project import', async () => {
    for (const mode of ['project', 'timeline']) {
        const s = setup(); const pending = s.main.importAsset({ path: 'sound.wav', ext: 'wav', kind: 'audio' }, mode);
        assert.equal(s.calls[0].mode, 'timeline'); s.finish({ ok: true, data: { placed: true } }); await pending;
    }
    const s = setup(); const pending = s.main.importAsset({ path: 'project.aep', ext: 'aep', kind: 'project' }, 'project');
    assert.equal(s.calls[0].mode, 'project'); s.finish({ ok: true, data: { imported: true } }); await pending;
});
