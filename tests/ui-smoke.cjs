const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const cp = require('node:child_process');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const output = path.join(root, 'reports'); fs.mkdirSync(output, { recursive: true });
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'folderdock-ui-'));
const assets = path.join(directory, "My assets #1's"); fs.mkdirSync(assets);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jYk0AAAAASUVORK5CYII=', 'base64');
fs.writeFileSync(path.join(assets, 'Scene #1.png'), png); fs.writeFileSync(path.join(assets, 'Scene 2.png'), png);
fs.writeFileSync(path.join(assets, 'Notes.txt'), 'Browser test fixture');
fs.mkdirSync(path.join(assets, 'Nested')); fs.writeFileSync(path.join(assets, 'Nested', 'Nested still.png'), png);
let assetCount = 5;
const wav = Buffer.alloc(44 + 16000 * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
for (let i = 0; i < 16000; i++) wav.writeInt16LE(Math.round(Math.sin(i * .35) * (i < 8000 ? 1000 : 20000)), 44 + i * 2);
fs.writeFileSync(path.join(assets, 'Sound.wav'), wav);
if (process.env.FFMPEG_TEST_PATH) {
    cp.execFileSync(process.env.FFMPEG_TEST_PATH, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
        'color=c=orange:s=160x90:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(assets, 'Motion clip.mp4')], { windowsHide: true });
    assetCount++;
}
(async () => {
    let browser;
    try {
        const candidates = [chromium.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
            'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
        const executablePath = candidates.find(file => fs.existsSync(file));
        if (!executablePath) throw Error('No existing Chromium browser found; no browser was downloaded');
        browser = await chromium.launch({ executablePath, headless: true });
        const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
        page.setDefaultTimeout(10000); const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(pathToFileURL(path.join(root, 'extension', 'index.html')).href);
        await page.getByRole('heading', { name: 'Make room for your assets' }).waitFor();
        async function choose() {
            const chosen = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Add folder', exact: true }).click();
            await (await chosen).setFiles(assets);
        }
        async function count(value) { await page.waitForFunction(n => FD.ui.grid.getCount() === n && document.querySelector('#grid-region').getAttribute('aria-busy') !== 'true', value); }
        await choose(); await count(assetCount);
        const sound = page.locator('.asset-card').filter({ hasText: 'Sound' });
        await sound.hover(); await page.waitForTimeout(300);
        assert.equal(await page.locator('.hover-preview audio').count(), 0, 'Audio must never play on hover');
        await sound.click(); await page.locator('#preview-region .waveform[data-ready=true]').waitFor();
        await sound.locator('.waveform[data-ready=true]').waitFor();
        assert.equal(await page.locator('#preview-region audio').evaluate(el => el.paused), true);
        await page.getByRole('button', { name: 'Play audio', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('#preview-region audio').currentTime > 0);
        await page.getByRole('button', { name: 'Pause audio', exact: true }).click();
        const waveform = await page.evaluate(async () => FD.waveforms.load(FD.ui.grid.getSelected()));
        assert.ok(waveform.duration > 1.9 && waveform.duration < 2.1);
        assert.ok(waveform.peaks[100] > waveform.peaks[10] * 10, 'Waveform must represent the end of the real file');
        await page.evaluate(() => { window.savedAudio = document.querySelector('#preview-region audio'); FD.ui.grid.refresh(); });
        await page.waitForFunction(() => document.querySelector('#grid-region').getAttribute('aria-busy') === 'false');
        assert.equal(await page.evaluate(() => savedAudio === document.querySelector('#preview-region audio')), true);
        await page.screenshot({ path: path.join(output, 'folderdock-audio.png') });
        await page.evaluate(() => {
            const scan = FD.scanner.scanTree;
            FD.scanner.scanTree = async function () {
                const result = await scan.apply(this, arguments);
                result.assets.find(a => a.name === 'Notes').mtime++;
                return new Promise(resolve => { window.finishScan = () => { FD.scanner.scanTree = scan; resolve(result); }; });
            };
            FD.ui.grid.refresh();
        });
        await page.waitForFunction(() => !!window.finishScan);
        await page.locator('.asset-card').filter({ hasText: 'Scene #1' }).click();
        await page.evaluate(() => window.finishScan());
        await page.waitForFunction(() => document.querySelector('#grid-region').getAttribute('aria-busy') === 'false');
        assert.equal(await page.evaluate(() => FD.ui.grid.getSelected().name), 'Scene #1', 'Refresh must retain the latest click');
        if (process.env.FFMPEG_TEST_PATH) {
            const video = page.locator('.asset-card').filter({ hasText: 'Motion clip' });
            await video.hover(); await video.locator('.hover-preview video').waitFor();
            await page.waitForFunction(() => document.querySelector('.hover-preview video').readyState >= 2);
            await video.click(); await page.locator('#preview-region video[controls]').waitFor();
            await page.locator('#search-input').hover(); await page.waitForFunction(() => !document.querySelector('.hover-preview'));
        }
        const card = page.locator('.asset-card').filter({ hasText: 'Scene #1' }); await card.click();
        await page.locator('#preview-region img').waitFor();
        await page.waitForFunction(() => document.querySelector('#preview-region img').naturalWidth > 0);
        await card.getByRole('button', { name: 'Favorite Scene #1' }).click();
        await page.getByRole('button', { name: 'All favorites (1)' }).waitFor();
        await page.getByRole('textbox', { name: 'New tag' }).fill('Warm Look');
        await page.getByRole('textbox', { name: 'New tag' }).press('Enter');
        await page.getByRole('button', { name: '#warm-look ×' }).waitFor();
        const search = page.getByRole('searchbox'); await search.fill('#warm-look'); await count(1);
        await search.press('Enter'); await page.getByRole('button', { name: 'Recent imports (0)' }).waitFor();
        await page.getByRole('button', { name: 'Import', exact: true }).click();
        await page.getByRole('button', { name: 'Recent imports (1)' }).waitFor();
        await search.fill(''); await count(assetCount);
        await page.locator('#sort-select').selectOption('type');
        await card.click({ button: 'right' }); await page.getByRole('menuitem', { name: 'Edit tags' }).click();
        assert.equal(await page.locator('#tag-input').evaluate(el => el === document.activeElement), true);
        while (await page.locator('.toast').count()) await page.locator('.toast').first().click();
        await page.screenshot({ path: path.join(output, 'folderdock-panel.png') });
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        assert.equal(await page.locator('#setting-thumbSize').inputValue(), '140');
        await page.locator('#setting-accent').fill('#44bb99');
        await page.locator('#setting-previewOnHover').uncheck();
        await page.screenshot({ path: path.join(output, 'folderdock-settings.png') });
        await page.getByRole('button', { name: 'Save settings' }).click();
        while (await page.locator('.toast').count()) await page.locator('.toast').first().click();
        assert.equal(await page.evaluate(() => FD.store.get('settings').previewOnHover), false);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()), '#44bb99');
        await page.setViewportSize({ width: 320, height: 520 });
        await page.screenshot({ path: path.join(output, 'folderdock-narrow.png') });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.setViewportSize({ width: 1000, height: 720 });
        await page.getByRole('button', { name: "Expand My assets #1's", exact: true }).click();
        await page.getByRole('button', { name: 'Nested', exact: true }).click(); await count(1);
        await page.getByRole('button', { name: "My assets #1's", exact: true }).click(); await count(assetCount);
        await page.getByRole('button', { name: 'All favorites (1)' }).click(); await count(1);
        await page.locator('.favorite-toggle').click(); await count(0);
        await page.getByRole('button', { name: 'Recent imports (1)' }).click(); await count(1);
        for (let i = 0; i < 210; i++) fs.writeFileSync(path.join(assets, 'Still ' + i + '.png'), png);
        await choose(); await count(assetCount + 210);
        await page.locator('#grid-region').focus(); await page.keyboard.press('End');
        assert.ok(await page.locator('.asset-card').count() < 150);
        assert.ok((await page.locator('.preview-name').textContent()).length > 0);
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'ui-results.json'), JSON.stringify({ passed: true, browser: browser.version(),
            checks: ['recursive parent-folder browsing', 'image/video previews and hover cleanup', 'silent audio hover and selection', 'full-file waveforms on cards and preview', 'explicit audio play/pause', 'unchanged refresh preserves player', 'latest click survives an active scan', 'favorites', 'tags/search', 'safe Enter handling', 'mock import/recents', 'context menu', 'settings', '320px layout', 'nested folders', (assetCount + 210) + '-card folder'], errors }, null, 2));
        console.log('UI SMOKE PASS: folder selection, image/video previews, favorites/tags, imports, menus/settings, nested folders, narrow layout and ' + (assetCount + 210) + '-card folder');
    } finally {
        if (browser) await browser.close();
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(directory).startsWith('folderdock-ui-'));
        fs.rmSync(directory, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
