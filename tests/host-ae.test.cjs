const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../extension/host/ae.jsx', 'utf8');
function setup() {
    const calls = { begin: 0, end: 0, imported: 0, preset: 0 };
    function CompItem() {
        this.time = 12.5;
        this.width = 1920; this.height = 1080; this.pixelAspect = 1; this.duration = 30;
        this.selectedLayers = [{ selected: true }, { selected: true }];
        this.layers = { add(item) { calls.layerItem = item; return calls.layer = {}; },
            addSolid(color, name, width, height, aspect, duration) {
                calls.solid = { color, name, width, height, aspect, duration };
                return calls.layer = { selected: true, remove() { calls.removed = true; }, applyPreset() {
                    assert.ok(comp.selectedLayers.every(layer => !layer.selected));
                    if (calls.failPreset) throw Error('bad preset'); calls.preset++;
                } };
            } };
    }
    const comp = new CompItem();
    const app = {
        project: { activeItem: comp, importFile(options) {
            assert.ok(options instanceof ImportOptions);
            calls.imported++;
            this.activeItem = { footage: true };
            return { file: options.file };
        } },
        beginUndoGroup() { calls.begin++; }, endUndoGroup() { calls.end++; }
    };
    function ImportOptions(file) { this.file = file; }
    function File(path) { this.path = path; this.exists = !path.includes('missing'); }
    const context = vm.createContext({ app, File, ImportOptions, CompItem,
        FD_parsePayload: p => typeof p === 'string' ? JSON.parse(p) : p,
        FD_ok: data => JSON.stringify({ ok: true, data }),
        FD_fail: error => JSON.stringify({ ok: false, error }) });
    vm.runInContext(source, context);
    return { app, comp, calls, run: (path, mode) => JSON.parse(context.FD_aeImportFile({ path, mode })) };
}
test('AE project import uses ImportOptions without a nonexistent canImport property', () => {
    const s = setup();
    assert.equal(s.run('C:/assets/clip.mp4', 'project').ok, true);
    assert.equal(s.calls.imported, 1);
    assert.equal(s.calls.begin, s.calls.end);
});
test('AE inserts into the original composition at its playhead even when import changes activeItem', () => {
    const s = setup();
    assert.equal(s.run('C:/assets/clip.mp4', 'timeline').data.placed, true);
    assert.equal(s.calls.layer.startTime, 12.5);
});
test('AE rejects missing composition before mutating the project', () => {
    const s = setup(); s.app.project.activeItem = null;
    assert.equal(s.run('C:/assets/clip.mp4', 'timeline').ok, false);
    assert.equal(s.calls.imported, 0); assert.equal(s.calls.begin, 0);
});
test('AE applies presets only to a new solid and preserves existing layers', () => {
    const s = setup();
    assert.equal(s.run('C:/assets/style.ffx', 'preset').ok, true);
    assert.equal(s.calls.preset, 1); assert.equal(s.calls.end, 1);
    assert.equal(s.calls.solid.width, 1920); assert.equal(s.calls.solid.height, 1080);
    assert.equal(s.calls.layer.startTime, 12.5);
    assert.ok(s.comp.selectedLayers.every(layer => layer.selected));
});
test('AE reports preset errors and closes its undo group', () => {
    const s = setup(); s.calls.failPreset = true;
    assert.match(s.run('C:/assets/style.ffx', 'preset').error, /bad preset/);
    assert.equal(s.calls.end, 1);
    assert.equal(s.calls.removed, true); assert.ok(s.comp.selectedLayers.every(layer => layer.selected));
});
test('AE rejects invalid imports but creates a preset layer without a selection', () => {
    const s = setup();
    assert.equal(s.run('C:/missing.mp4', 'project').ok, false);
    assert.equal(s.run('C:/style.mogrt', 'preset').ok, false);
    assert.equal(s.run('C:/clip.mp4', 'unknown').ok, false);
    s.comp.selectedLayers = [];
    assert.equal(s.calls.begin, 0);
    assert.equal(s.run('C:/style.ffx', 'preset').ok, true);
});
