# Contributing to FolderDock

Bug reports and focused improvements are welcome. Include the application version, operating system, file type, steps to reproduce, and exact error text. Share a minimal non-private example only when needed.

## Project structure

| Path | Purpose |
| --- | --- |
| `extension/js/core/` | Local files, scanning, library storage, previews, and host bridge |
| `extension/js/ui/` | Folder tree, windowed grid, preview controls, and settings |
| `extension/host/` | Premiere Pro and After Effects ExtendScript |
| `extension/css/` | Shared theme and responsive layout |
| `tests/` | Dependency-free regressions and optional browser checks |
| `tools/` | Lint, screenshots, and ZIP packaging |

Use classic scripts under the global `FD` namespace. Route disk and process work through `FD.fs`, and Adobe calls through `FD.bridge`. Host `.jsx` files must remain ES3-compatible. Keep modules small, reuse theme variables, preserve source assets and library data, and surface failures accurately.

Do not add telemetry, accounts, bundled asset packs, frameworks, or a mandatory build step. Keep dependency and background-processing costs low. Add behavioral regression coverage when a fix warrants it; tests should reproduce the failure rather than mirror the implementation.

## Checks

Use Node.js 24 and PowerShell 7 (CI), or a compatible modern local Node and Windows PowerShell. No package installation is needed for the core suite.

```powershell
node --test tests/*.test.cjs
pwsh -NoProfile -File tools/lint.ps1
```

On Windows PowerShell, substitute `powershell` for `pwsh`. Run `node --check` on changed panel scripts. Set `FFMPEG_TEST_PATH` to your existing FFmpeg executable to include real conversion tests; otherwise that optional test is skipped.

For UI changes, use an existing Playwright installation and Chromium-compatible browser:

```powershell
node tests/ui-smoke.cjs
node tests/ui-performance.cjs
```

If Playwright is outside the project, set `NODE_PATH` to its containing `node_modules` directory. Browser scripts use an existing browser and never install one. Reports are written to the ignored `reports/` directory. Browser mode uses temporary data and simulated imports; it cannot verify Adobe behavior.

Check changed host interactions against [the Adobe checklist](extension/MANUAL-TEST.md). Record actual app versions and observations in your issue or pull request. Clearly distinguish simulated checks from real Adobe tests.

## Screenshots and packaging

`node tools/capture-screenshots.cjs` creates procedural demo media temporarily, captures the actual UI, and removes its temporary folder. Only the screenshots go into `docs/screenshots/`; never include private asset libraries.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/package.ps1
```

Packaging writes an unsigned ZIP to the ignored `releases/` directory and refuses to overwrite an existing archive. Keep version numbers aligned with `extension/CSXS/manifest.xml`, the package filename, and release documentation. See [signing guidance](extension/README.md#signed-zxp-distribution) before distributing a signed ZXP.
