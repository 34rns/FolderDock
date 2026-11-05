const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const executablePath = [chromium.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
    const browser = await chromium.launch({ executablePath, headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 780 } });
        await page.goto(pathToFileURL(path.join(root, 'extension/index.html')).href);
        const result = await page.evaluate(async () => {
            const assets = Array.from({ length: 20000 }, (_, i) => ({ path: '/library/' + i + '.txt', name: 'Asset ' + i, ext: 'txt', kind: 'other', size: 1 }));
            const begin = performance.now(); FD.ui.grid.renderAssets(assets);
            await new Promise(resolve => setTimeout(resolve, 300));
            const initialCards = document.querySelectorAll('.asset-card').length;
            const selected = 19999; FD.ui.grid.selectIndex(selected);
            await new Promise(resolve => setTimeout(resolve, 100));
            return { assets: assets.length, initialCards, finalCards: document.querySelectorAll('.asset-card').length,
                lastVisible: !!document.querySelector('[data-index="19999"]'), selected: FD.ui.grid.getSelected().name,
                renderMilliseconds: performance.now() - begin - 400 };
        });
        assert.ok(result.initialCards < 150 && result.finalCards < 150, 'Large libraries must keep a bounded number of cards: ' + JSON.stringify(result));
        assert.equal(result.selected, 'Asset 19999'); assert.equal(result.lastVisible, true);
        fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
        fs.writeFileSync(path.join(root, 'reports/performance-ui.json'), JSON.stringify(result, null, 2));
        console.log('UI PERFORMANCE PASS', result);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
