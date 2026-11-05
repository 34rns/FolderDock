const test = require('node:test');
const assert = require('node:assert/strict');
const { panel } = require('./helpers.cjs');
function scanner() {
    const folders = {
        'C:/Assets': ['Pack/', '_Mister Horse Previews/'],
        'C:/Assets/Pack': ['Nested/', 'Title.MOGRT', 'Clip.mp4', 'Clip.jpg', 'Loose.png', 'cache.pek'],
        'C:/Assets/Pack/Nested': ['Deep.ffx', 'Back/'],
        'C:/Assets/_Mister Horse Previews': ['Pack/'],
        'C:/Assets/_Mister Horse Previews/Pack': ['Title.MOGRT.jpg'],
        'C:/Assets/Pack/Nested/Back': []
    };
    const c = panel(['js/core/types.js', 'js/core/previews.js', 'js/core/scanner.js'], { FD: { fs: {
        canonical: path => path.endsWith('/Back') ? 'C:/Assets' : path,
        list: path => folders[path] ? { ok: true, data: folders[path].map(name => ({
            name: name.replace(/\/$/, ''), path: path + '/' + name.replace(/\/$/, ''), isDir: name.endsWith('/'), size: 2, mtime: 1
        })) } : { ok: false, error: 'Missing' }
    } } });
    return c.FD.scanner;
}
test('Parent scans include descendants once, exclude support files and resolve mirrored MOGRT previews', async () => {
    const result = await scanner().scanTree('C:/Assets');
    assert.deepEqual(Array.from(result.assets, a => a.filename).sort(), ['Clip.mp4', 'Deep.ffx', 'Loose.png', 'Title.MOGRT']);
    assert.equal(result.assets.find(a => a.ext === 'mogrt').previewPath, 'C:/Assets/_Mister Horse Previews/Pack/Title.MOGRT.jpg');
    const video = result.assets.find(a => a.ext === 'mp4');
    assert.equal(video.previewPath, 'C:/Assets/Pack/Clip.mp4'); assert.equal(video.thumbPath, 'C:/Assets/Pack/Clip.jpg');
});
test('Cancelled scans stop and unreadable folders are reported', async () => {
    assert.equal((await scanner().scanTree('C:/Assets', () => true)).cancelled, true);
    assert.deepEqual(Array.from((await scanner().scanTree('C:/missing')).warnings), ['C:/missing']);
});
