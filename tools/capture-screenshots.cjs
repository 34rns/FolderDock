const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..'), output = path.join(root, 'docs/screenshots');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'folderdock-docs-'));
const library = path.join(temporary, 'FolderDock demo');
const visual = path.join(library, 'Motion studies'), sound = path.join(library, 'Sound design');
[output, visual, sound].forEach(p => fs.mkdirSync(p, { recursive: true }));
const designs = [
    ['Orbit rings', '#111a23', '#ffa44c', 'rings'], ['Wave field', '#172220', '#a4dcc9', 'waves'],
    ['Signal stack', '#21202a', '#c1adf3', 'bars'], ['Soft glow', '#272021', '#ffba9c', 'orb'],
    ['Contour lines', '#172329', '#a0d7e4', 'waves'], ['Glass arc', '#22251e', '#d3dfa4', 'rings'],
    ['Light bands', '#262020', '#f6a783', 'bars'], ['Lunar halo', '#19212b', '#bacbe9', 'orb']
];
function drawing(name, bg, ink, kind, index) {
    let shapes = '';
    if (kind === 'rings') for (let i = 0; i < 9; i++) shapes += `<ellipse cx="300" cy="160" rx="${25+i*13}" ry="${40+i*10}" transform="rotate(-25 300 160)" fill="none" stroke="${ink}" stroke-width="${i===5?9:2}" opacity="${.3+i*.07}"/>`;
    if (kind === 'waves') for (let i = 0; i < 16; i++) shapes += `<path d="M-30 ${95+i*11} C140 ${-110+i*13} 280 ${370-i*7} 540 ${60+i*12}" fill="none" stroke="${ink}" stroke-width="2" opacity=".7"/>`;
    if (kind === 'bars') for (let i = 0; i < 11; i++) shapes += `<rect x="${120+i*25}" y="${65+Math.sin(i*.7)*35}" width="15" height="${110+Math.cos(i*.7)*45}" rx="7" fill="${ink}" opacity="${.25+i*.065}"/>`;
    if (kind === 'orb') shapes = `<defs><radialGradient id="orb"><stop stop-color="${ink}"/><stop offset=".4" stop-color="${ink}" stop-opacity=".7"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient></defs><circle cx="295" cy="135" r="160" fill="url(#orb)"/><circle cx="295" cy="135" r="98" stroke="${ink}" stroke-width="1" fill="none"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="${bg}"/>${shapes}<text x="24" y="34" font-family="Segoe UI, sans-serif" font-size="12" fill="${ink}" opacity=".8">Motion study / ${String(index+1).padStart(2,'0')}</text><text x="24" y="274" font-family="Segoe UI, sans-serif" font-size="26" font-weight="600" fill="${ink}">${name}</text></svg>`;
}
function audio(index) {
    const samples = 24000, wav = Buffer.alloc(44 + samples * 2);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8); wav.writeUInt32LE(16,16);
    wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(8000,24); wav.writeUInt32LE(16000,28);
    wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(samples*2,40);
    for (let i=0; i<samples; i++) {
        const t=i/samples, envelope=index%3===0?Math.exp(-t*5):index%3===1?Math.sin(t*Math.PI)**2:Math.max(0,Math.sin(t*Math.PI*4));
        wav.writeInt16LE(Math.round(Math.sin(i*(.12+index*.055))*envelope*26000),44+i*2);
    }
    return wav;
}
(async () => {
    let browser;
    try {
        const executablePath = [chromium.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
        browser = await chromium.launch({ executablePath, headless: true });
        const art = await browser.newPage({ viewport: { width: 480, height: 300 } });
        for (const [i, design] of designs.entries()) {
            await art.setContent('<style>body{margin:0}</style>'+drawing(...design,i));
            await art.screenshot({ path: path.join(visual,design[0]+'.png') });
        }
        await art.close();
        ['Soft impact','Air sweep','Pulse sequence','Low hit','Gentle rise','Texture pulse'].forEach((name,i)=>fs.writeFileSync(path.join(sound,name+'.wav'),audio(i)));
        const page = await browser.newPage({ viewport: { width: 1280, height: 840 }, deviceScaleFactor: 1 });
        const errors=[]; page.on('pageerror',e=>errors.push(e.message));
        await page.goto(pathToFileURL(path.join(root,'extension/index.html')).href);
        const chosen=page.waitForEvent('filechooser'); await page.getByRole('button',{name:'Add folder',exact:true}).click();
        await (await chosen).setFiles(library);
        await page.waitForFunction(()=>FD.ui.grid.getCount()===14);
        await page.evaluate(()=>FD.store.updateSettings({thumbSize:180}));
        await page.getByRole('button',{name:'Expand FolderDock demo',exact:true}).click();
        await page.getByRole('button',{name:'Motion studies',exact:true}).waitFor();
        await page.locator('.chip[data-kind=image]').click();
        await page.locator('.asset-card').filter({hasText:'Orbit rings'}).click();
        await page.waitForFunction(()=>document.querySelector('#preview-region img')?.naturalWidth>0);
        await page.evaluate(()=>{const asset=FD.ui.grid.getSelected();FD.store.toggleFavorite(asset.path);FD.store.addTag(asset.path,'motion');});
        await page.mouse.move(5,5);
        await page.screenshot({path:path.join(output,'library.png')});
        await page.locator('.chip[data-kind=audio]').click();
        await page.locator('.asset-card').filter({hasText:'Air sweep'}).click();
        await page.locator('#preview-region .waveform[data-ready=true]').waitFor();
        await page.waitForFunction(()=>document.querySelectorAll('.asset-thumb .waveform[data-ready=true]').length===6);
        await page.mouse.move(5,5);
        await page.screenshot({path:path.join(output,'audio.png')});
        assert.deepEqual(errors,[]);
        console.log('Captured library and audio screenshots from the actual panel using temporary generated media.');
    } finally {
        if(browser) await browser.close();
        assert.equal(path.dirname(path.resolve(temporary)),path.resolve(os.tmpdir()));
        assert.ok(path.basename(temporary).startsWith('folderdock-docs-'));
        fs.rmSync(temporary,{recursive:true,force:true});
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
