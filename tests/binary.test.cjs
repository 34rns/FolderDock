const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { panel } = require('./helpers.cjs');
test('Native waveform reads preserve exact bytes and report missing files', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'folderdock-binary-'));
    try {
        const file = path.join(directory, 'tiny.wav'), bytes = Buffer.from([0, 255, 17, 33]); fs.writeFileSync(file, bytes);
        const c = panel(['js/core/fs.js', 'js/core/fs-binary.js'], { require, __adobe_cep__: {} });
        assert.deepEqual(Buffer.from(await c.FD.fs.readBinary(file)), bytes);
        await assert.rejects(c.FD.fs.readBinary(file + '.missing'));
        assert.deepEqual(fs.readFileSync(file), bytes);
    } finally {
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(directory).startsWith('folderdock-binary-'));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
