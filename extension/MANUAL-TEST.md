# FolderDock acceptance checklist

Version 1.0.2, 2026-11-05. Fresh Adobe tests remain pending for this preview.

## Completed automated checks

- 38 regressions passed, including empty/occupied tracks, isolated FFX solids, recursive/mirrored previews, binary reads, storage, import behavior, idle startup, indexed lookup, asynchronous cancellation and bounded preview work.
- Real FFmpeg generated JPG/MP4, a full 10-second AIFF-to-AAC preview and a waveform PNG, without changing sources.
- Browser passed with 216 assets: silent audio hover/selection, real full-file waveforms, Play/Pause, unchanged-refresh player preservation, latest-click retention during a changed scan, normal library actions and desktop/320px layouts. No page exceptions; screenshots reviewed.
- Large-grid browser check: 20,000 assets, 36 initial / 32 final rendered cards, final-item keyboard selection retained.
- Local read-only scan: 1,029 assets in 2,151 ms, no warnings, maximum timer delay beyond a 10 ms interval of 11 ms. This is not an Adobe startup benchmark.
- Project lint and panel JavaScript syntax checks passed. Installer behavior should be checked on each target platform.

These checks do not run Adobe's actual scripting engine. Earlier project notes record Adobe 2026 panel/hover/Premiere tests, but this build changes host behavior and needs a fresh pass.

## Preparation

1. Install the entire new extension and restart Adobe so old panel and host files cannot mix.
2. Use a scratch project and your own MP4, WAV, image, MOGRT and FFX files as appropriate. No test assets are included in the extension.
3. Record exact application versions and operating system. Keep the panel wide enough to inspect messages; the minimum supported geometry is 320 × 360.

## Premiere Pro — awaiting real-app test

- [ ] Panel opens and identifies Premiere Pro correctly.
- [ ] Both media buttons place the correct file at the playhead on empty, unlocked tracks. Existing clips keep their positions and contents.
- [ ] Occupied-but-unlocked and locked destinations are skipped. No empty destination gives instructions to add a track.
- [ ] Linked video/audio uses separate empty destinations. Test stereo, multichannel and insufficient audio capacity.
- [ ] WAV uses an empty audio track at the end of the stack. A video inside a folder with `.wav` in its name still uses a video track.
- [ ] No active sequence and all appropriate tracks locked produce clear errors without unexpected imports.
- [ ] A MOGRT inserts at the playhead; a failed MOGRT import reports an error.
- [ ] `.prfpset` shows manual Effects-panel import instructions; FFX/AEP files direct the user to After Effects.
- [ ] Identically named files in different folders import the selected path; FolderDock never inserts an unrelated final bin item.

## After Effects — awaiting real-app test

- [ ] Panel opens and identifies After Effects correctly, including when `app.name` is unavailable.
- [ ] Both media buttons create a new layer at the playhead through `ImportOptions(file)`.
- [ ] Insert adds a layer to the composition that was active before import, with start time at the composition playhead.
- [ ] Insert without an active composition reports a clear error before importing.
- [ ] FFX creates a new composition-sized solid at the playhead, applies only there, and leaves existing layers unchanged.
- [ ] FFX works with no selection. Failed presets remove their new solid and restore prior selections. Test incompatible/text-specific presets too.
- [ ] Undo reverses a completed FolderDock operation in one group; failures do not leave an open undo group.

## Both applications — awaiting real-app test

- [ ] Opening the panel with saved roots does not begin a library scan. Selecting a folder starts browsing.
- [ ] A large library stays responsive during scanning and scrolling; changing folders cancels the older result. Home/End can reach the first/last asset.
- [ ] Hiding the panel pauses media and watching. Showing it resumes watching and rechecks the selected folder.
- [ ] Large audio cards defer waveforms until selected. Audio above five minutes or 32 MB uses optional FFmpeg, with a clear fallback if unavailable.
- [ ] Parent folders show all descendants; mirrored previews resolve and support folders do not clutter the tree.
- [ ] Filename search and `#tag` search work; star/favorites, recent imports and tag add/remove work.
- [ ] Audio stays silent on hover/selection. Cards and preview show real full-file waveforms; Play/Pause and seeking work. Video hover cleanup works.
- [ ] Verify folders/files containing spaces, apostrophes, Unicode and `#`; test a UNC path if your workflow uses one.
- [ ] Double-click/Enter place media at the playhead; project documents retain project import. Enter while typing never imports.
- [ ] Right-click actions work; Copy path and Reveal open/copy the expected path.
- [ ] Nested file changes refresh without clearing selection. A newer click during an active scan remains selected. Unchanged refresh preserves playback.
- [ ] Missing folders have a recovery message. Removing a root changes only the library, leaving files on disk.
- [ ] Accent, thumbnail size and video-hover preferences survive restart. Changing preview settings retries failed previews.
- [ ] With FFmpeg blank, no conversion runs. With an existing executable selected, unsupported formats get local cached previews.
- [ ] A confirmed Reset library preserves a timestamped library backup and clears only library metadata.
- [ ] Narrow docking, keyboard focus, Escape in menus/settings, and long filenames remain usable.

## Send back after testing

App/version, OS, which checks passed, and for each failure: the selected file type, action, exact toast/devtools error, and a screenshot if useful. Do not send private media files. Report results through [GitHub issues](https://github.com/34rns/FolderDock/issues), distinguishing actual Adobe checks from simulations.

macOS installer execution and ZXP signing remain unverified. The ZIP is an unsigned developer build. Premiere track creation remains manual; FolderDock uses documented placement APIs only. Unsupported/large audio requires optional local FFmpeg for waveforms.
