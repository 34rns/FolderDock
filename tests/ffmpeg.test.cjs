const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { panel } = require('./helpers.cjs');
test('FFmpeg queue is opt-in, deduplicates jobs and processes one conversion at a time', async () => {
    let enabled = '', running = 0, maximum = 0, count = 0;
    const c = panel(['js/core/ffmpeg.js'], { FD: { store: { get: () => ({ ffmpegPath: enabled }) }, fs: {
        previewCache: asset => ({ ok: true, data: { path: asset.path + '.jpg', exists: false } }),
        convertPreview: () => { running++; count++; maximum = Math.max(maximum, running);
            return new Promise(resolve => setTimeout(() => { running--; resolve({ ok: true }); }, 10)); }
    } } });
    const a = { path: 'a.avi', kind: 'video' }, b = { path: 'b.avi', kind: 'video' };
    assert.equal((await c.FD.ffmpeg.ensure(a)).skipped, true); assert.equal(count, 0);
    enabled = 'ffmpeg'; const first = c.FD.ffmpeg.ensure(a);
    assert.equal(c.FD.ffmpeg.ensure(a), first);
    await Promise.all([first, c.FD.ffmpeg.ensure(b)]); assert.equal(maximum, 1); assert.equal(count, 2);
});
test('FFmpeg drops queued previews whose cards have disappeared', async () => {
    let finish, wanted = true, conversions = 0;
    const c = panel(['js/core/ffmpeg.js'], { FD: { store: { get: () => ({ ffmpegPath: 'local-ffmpeg' }) }, fs: {
        previewCache: asset => ({ ok: true, data: { path: asset.path + '.jpg', exists: false } }),
        convertPreview: () => { conversions++; return new Promise(resolve => { finish = resolve; }); }
    } } });
    const first = c.FD.ffmpeg.ensure({ path: 'first.avi', kind: 'video' }, 'jpg');
    const stale = c.FD.ffmpeg.ensure({ path: 'stale.avi', kind: 'video' }, 'jpg', () => wanted);
    wanted = false; finish({ ok: true }); await first;
    if (conversions > 1) finish({ ok: true });
    assert.equal(conversions, 1); assert.equal((await stale).skipped, true);
});
test('Installed FFmpeg makes cached JPG/MP4 previews without changing source assets', { skip: !process.env.FFMPEG_TEST_PATH }, async () => {
    const executable = process.env.FFMPEG_TEST_PATH;
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'folderdock-test-'));
    try {
        const assetFolder = path.join(directory, 'assets'); fs.mkdirSync(assetFolder);
        const source = path.join(assetFolder, "clip's #1.avi");
        const result = cp.spawnSync(executable, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=orange:s=64x48:d=1', '-c:v', 'rawvideo', source], { windowsHide: true });
        assert.equal(result.status, 0, String(result.stderr));
        const original = fs.readFileSync(source);
        const c = panel(['js/core/fs.js', 'js/core/fs-process.js'], { __adobe_cep__: {}, require,
            CSInterface: function () { this.getSystemPath = () => directory; }, SystemPath: { USER_DATA: 'user' } });
        const asset = { path: source, mtime: fs.statSync(source).mtimeMs, size: original.length };
        for (const format of ['jpg', 'mp4']) {
            const cached = c.FD.fs.previewCache(asset, format); assert.equal(cached.ok, true);
            const converted = await c.FD.fs.convertPreview(executable, source, cached.data.path, format);
            assert.equal(converted.ok, true, converted.error); assert.ok(fs.statSync(converted.data).size > 0);
            assert.equal(c.FD.fs.previewCache(asset, format).data.exists, true);
        }
        assert.deepEqual(fs.readFileSync(source), original); assert.deepEqual(fs.readdirSync(assetFolder), [path.basename(source)]);
        const audioSource = path.join(assetFolder, 'sound.aiff');
        cp.execFileSync(executable, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=10', audioSource], { windowsHide: true });
        const audio = { path: audioSource, mtime: fs.statSync(audioSource).mtimeMs, size: fs.statSync(audioSource).size };
        const audioCache = c.FD.fs.previewCache(audio, 'mp4');
        const convertedAudio = await c.FD.fs.convertPreview(executable, audioSource, audioCache.data.path, 'mp4', 'audio');
        assert.equal(convertedAudio.ok, true, convertedAudio.error); assert.ok(fs.statSync(convertedAudio.data).size > 0);
        const decoded = cp.execFileSync(executable, ['-nostdin', '-v', 'error', '-i', convertedAudio.data, '-ac', '1', '-ar', '8000', '-f', 'f32le', 'pipe:1'], { windowsHide: true });
        assert.ok(decoded.length / 4 / 8000 > 9.9, 'Audio previews must include the full file, not the first eight seconds');
        const waveCache = c.FD.fs.previewCache(audio, 'wave');
        const convertedWave = await c.FD.fs.convertPreview(executable, audioSource, waveCache.data.path, 'wave', 'audio');
        assert.equal(convertedWave.ok, true, convertedWave.error);
        assert.equal(fs.readFileSync(convertedWave.data).subarray(1, 4).toString(), 'PNG');
        const rejected = await c.FD.fs.convertPreview(executable, source, path.join(assetFolder, 'outside.jpg'), 'jpg');
        assert.equal(rejected.ok, false); assert.match(rejected.error, /destination/);
    } finally {
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(directory).startsWith('folderdock-test-'));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
