# FolderDock

A local folder-based asset browser for Premiere Pro and After Effects. Add your own folders, preview files, then import or insert at the playhead. No accounts, telemetry, network services, subscriptions, or bundled assets.

## Install on Windows

Close the Adobe apps. Extract the release ZIP, open PowerShell in the extracted FolderDock folder, and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install.ps1
```

This copies the **contents of this extension folder** into `%APPDATA%\Adobe\CEP\extensions\FolderDock` and enables unsigned panels for CSXS 11, 12 and 13 in your current-user registry. An existing installation is preserved under `%LOCALAPPDATA%\FolderDock\installation-backups`, outside Adobe's extension discovery folder. Run with `-WhatIf` to preview changes. Restart Adobe, then open **Window > Extensions > FolderDock** (some versions label the menu **Extensions (Legacy)**).

## Install on macOS

Close Adobe and run `bash tools/install.sh` from this folder. It installs to `~/Library/Application Support/Adobe/CEP/extensions/FolderDock`, preserves previous installations in the sibling `CEP/FolderDock-backups` folder, and enables unsigned panels for CSXS 11–13. Restart Adobe afterward. macOS installation is provided but has not been tested on a Mac in this completion pass.

## Use

1. Add a folder with **+**, then select it. Startup leaves saved folders idle until you choose one. Selecting a parent shows assets from all its subfolders. Expand the arrow to navigate individual folders. Preview-support folders supply thumbnails and stay hidden from the tree. Asset files are never changed by FolderDock.
2. Search by filename or `#tag`, filter by type, and choose the sort order. Click a card to preview it. Arrow keys move between cards; Home/End jump to the first/last result; Enter or double-click runs the default action.
3. **Import** and **Insert at playhead** both place media in an active sequence/composition. Premiere uses empty, unlocked tracks without rippling existing clips. Add an empty track when instructed; linked audio requires empty tracks at the end of the audio stack. AE imports create new layers, and FFX presets create new composition-sized solids. Adobe project documents use **Import project**. Premiere `.prfpset` files require Adobe's manual preset import command.
4. Use the star for favorites, add tags in the preview, and right-click for file and library actions. Removing a library folder does not delete it from disk.
5. Audio never plays on hover or selection. Cards and the preview show full-file waveforms; use the preview's **Play/Pause** button and seek slider. Video hover previews are silent and can be disabled in Settings. Native panel-to-timeline drag/drop is not supported by CEP; use the buttons.

Matching sidecars include `asset.ext.jpg` and `asset.jpg`, including mirrored paths under `_Mister Horse Previews`, `previews` and `thumbnails`. Unplayable video can show its matching thumbnail. Project/preset files without an actual preview show a placeholder.

An existing FFmpeg executable can optionally make short silent MP4 video previews, full-length AAC audio previews, full-file waveform images, or JPG thumbnails. It is never downloaded automatically. Blank FFmpeg settings keep conversion off. Automatic card waveforms are limited to 8 MB; select larger files to request one. Browser waveform decoding is sequential and limited to five minutes and 32 MB per source; longer, larger, or unsupported audio needs local FFmpeg for waveforms. All generated previews stay in FolderDock's cache.

## Lightweight browsing

Version 1.0.2 scans folders asynchronously and renders only the visible grid rows plus a small buffer. Preview jobs are bounded and drop unused work. Folder watching and media pause while the panel is hidden. File changes are grouped over two seconds before refreshing. Optional FFmpeg runs one job at a time, with one thread per decoding, filtering, and encoding stage and reduced priority where available. Large folders and slow drives still take time to scan; choose a smaller subfolder when appropriate.

Library metadata lives at the Adobe user-data path under `FolderDock/library.json`; converted previews live in `FolderDock/cache`. Copy `library.json` to back up roots, tags, favorites and preferences. Browser preview mode uses temporary session data and simulated imports.

## Verification status

Version 1.0.2 passed 38 local regressions, real FFmpeg conversions, browser interaction checks with 216 assets, and a 20,000-asset grid stress check. Earlier development recorded basic Adobe 2026 checks, but the current build changes both UI and host integrations and requires a fresh Adobe test pass. Automated checks use simulated host objects and do not establish Adobe compatibility. See [MANUAL-TEST.md](MANUAL-TEST.md) for the exact acceptance checklist.

## Signed ZXP distribution

The ZIP is an unsigned developer build. To distribute a signed ZXP, obtain Adobe's **ZXPSignCmd** from the official [CEP Resources repository](https://github.com/Adobe-CEP/CEP-Resources), then use an appropriate certificate:

```text
ZXPSignCmd -sign FolderDock FolderDock.zxp certificate.p12 <certificate-password>
ZXPSignCmd -verify FolderDock.zxp -verbose
```

Keep certificates and passwords outside the repository and release archive. A self-signed developer package is not a trusted production certificate. Verify the package with the intended ZXP installer and target Adobe version. Confirm CEP support in each target release; this is a CEP extension, not UXP.

## Troubleshooting

| Symptom | Check |
|---|---|
| Panel missing | Install the extension contents, including `CSXS/manifest.xml`, under the CEP extensions path; enable PlayerDebugMode and restart Adobe. |
| EvalScript / host error | Reinstall the whole extension, restart Adobe, then copy the exact toast/error text and Adobe version. Do not mix old host files with new panel files. |
| Cannot insert | Open a sequence/comp. Add an empty, unlocked Premiere track; audio tracks must be at the end of the audio stack. FFX creates its own solid and needs no selected layer. |
| No preview | Codec may be unsupported. Try a same-name PNG/JPG/GIF/MP4/WebM sidecar or optional FFmpeg. Import can still work. |
| Folder missing | Reconnect the drive or remove and re-add the library root. |
| Changes do not appear | Use Refresh. Browser folder access is a snapshot and may require choosing the folder again. |
| Library cannot save/load | Read the toast; check permissions and preserve the existing library file before recovering/resetting. |

The `.debug` file defines local CEP debugging ports. Read it for the port corresponding to your host, then use compatible Chromium/CEP devtools. Diagnostics never upload files.

FolderDock code is MIT licensed. Adobe's CSInterface and the public-domain JSON helper retain their own notices; see `THIRD_PARTY_NOTICES.md`.
