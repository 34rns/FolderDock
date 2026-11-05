const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read, include } = require('./helpers.cjs');
function setup() {
    const calls = { imports: 0, inserts: [] };
    const item = { type: 1, getMediaPath: () => 'C:/assets/clip.mp4' };
    const root = { children: { 0: item, numItems: 1 } };
    function track(locked, name) { return { clips: { numItems: 0 }, isLocked: () => locked,
        insertClip() { throw Error('Ripple insertion is forbidden'); },
        overwriteClip(value, time) { calls.inserts.push({ value, time, name }); return true; } }; }
    const sequence = { getPlayerPosition: () => ({ ticks: '1000', seconds: 3 }),
        videoTracks: { 0: track(true, 'v0'), 1: track(false, 'v1'), numTracks: 2 },
        audioTracks: { 0: track(false, 'a0'), numTracks: 1 }, importMGT: () => ({ graphic: true }),
        overwriteClip(value, time, video, audio) { calls.inserts.push({ value, time, name: 'v' + video, audio }); return true; } };
    const app = { project: { rootItem: root, activeSequence: sequence, getInsertionBin: () => root,
        importFiles(paths) { calls.imports++; item.getMediaPath = () => paths[0]; return true; } } };
    function File(name) { this.fsName = name.replace(/\\/g, '/'); this.exists = !name.includes('missing'); }
    const context = vm.createContext({ app, File, JSON, FD_parsePayload: value => value,
        FD_ok: data => JSON.stringify({ ok: true, data }), FD_fail: error => JSON.stringify({ ok: false, error }) });
    vm.runInContext(read('host/ppro.jsx'), context);
    return { app, calls, root, item, sequence, run: (path, mode) => JSON.parse(context.FD_pproImportFile({ path, mode })) };
}
test('Premiere placement uses the matching item without rippling existing clips', () => {
    const s = setup(); assert.equal(s.run('C:/assets/clip.mp4', 'project').data.placed, false);
    assert.equal(s.run('C:/assets/clip.mp4', 'timeline').ok, true);
    assert.equal(s.calls.inserts[0].name, 'v1'); assert.equal(s.calls.inserts[0].value, s.item);
    assert.equal(s.calls.inserts[0].time, '3');
});
test('Premiere classifies only the final audio extension', () => {
    const s = setup(); s.run('C:/audio.wav/clip.mp4', 'timeline'); s.run('C:/assets/sound.WAV', 'timeline');
    assert.deepEqual(s.calls.inserts.map(value => value.name), ['v1', 'a0']);
});
test('Missing sequences and locked tracks fail before importing', () => {
    const s = setup(); s.app.project.activeSequence = null;
    assert.equal(s.run('C:/assets/clip.mp4', 'timeline').ok, false); assert.equal(s.calls.imports, 0);
    s.app.project.activeSequence = s.sequence; s.sequence.videoTracks[1].isLocked = () => true;
    assert.equal(s.run('C:/assets/clip.mp4', 'timeline').ok, false); assert.equal(s.calls.imports, 0);
});
test('Premiere never substitutes an unrelated final project item', () => {
    const s = setup(); s.app.project.importFiles = () => true;
    assert.equal(s.run('C:/assets/different.mp4', 'timeline').ok, false); assert.equal(s.calls.inserts.length, 0);
});
test('MOGRT and clip insertion report host rejection', () => {
    const s = setup(); assert.equal(s.run('C:/assets/title.mogrt', 'preset').ok, true);
    s.sequence.importMGT = () => null; assert.equal(s.run('C:/assets/title.mogrt', 'preset').ok, false);
    s.sequence.overwriteClip = () => false;
    assert.equal(s.run('C:/assets/clip.mp4', 'timeline').ok, false);
});
test('Premiere skips occupied tracks and routes linked audio to a separate empty track', () => {
    const s = setup(); s.sequence.videoTracks[0].isLocked = () => false;
    s.sequence.videoTracks[0].clips.numItems = 1;
    s.sequence.audioTracks[1] = { clips: { numItems: 0 }, isLocked: () => false };
    s.sequence.audioTracks.numTracks = 2; s.sequence.audioTracks[0].clips.numItems = 1;
    assert.equal(s.run('C:/assets/clip.mp4', 'timeline').ok, true);
    assert.equal(s.calls.inserts[0].name, 'v1'); assert.equal(s.calls.inserts[0].audio, 1);
});
test('Premiere refuses occupied or uninspectable destinations before import', () => {
    for (const unknown of [false, true]) {
        const s = setup(); s.sequence.videoTracks[1].clips = unknown ? undefined : { numItems: 1 };
        assert.equal(s.run('C:/assets/clip.mp4', 'timeline').ok, false);
        assert.equal(s.calls.imports, 0); assert.equal(s.calls.inserts.length, 0);
    }
    const s = setup(); s.sequence.audioTracks[0].clips.numItems = 1;
    assert.equal(s.run('C:/assets/title.mogrt', 'preset').ok, false);
});
test('Unsupported presets provide instructions and invalid modes do nothing', () => {
    const s = setup(); assert.match(s.run('C:/look.prfpset', 'project').error, /manually/);
    assert.match(s.run('C:/look.ffx', 'preset').error, /After Effects/);
    assert.equal(s.run('C:/clip.mp4', 'delete').ok, false); assert.equal(s.calls.imports, 0);
});
test('Host routing detects AE without app.name and uses bundled JSON on ES3 hosts', () => {
    const context = vm.createContext({ app: { version: '26.0', project: {} }, ImportOptions: function () {}, CompItem: function () {}, JSON: undefined });
    context.$ = { global: context };
    vm.runInContext(include('host/host.jsx'), context);
    assert.equal(JSON.parse(context.FD.hostInfo('{}')).data.app, 'AEFT');
    const text = 'C:\\user\\quote"\nclip.mp4';
    assert.equal(JSON.parse(context.FD_fail(text)).error, text);
    assert.equal(JSON.parse(context.FD.importFile('{broken')).ok, false);
});
