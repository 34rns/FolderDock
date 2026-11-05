# Changelog

## 1.0.2 — 2026-11-05

First public preview, focused on keeping large local libraries responsive.

### Performance

- Wait for an explicit folder selection before starting a scan or watcher.
- Read directory metadata asynchronously with at most eight operations in flight; cancel abandoned scans.
- Index preview filenames once per directory instead of repeatedly searching whole lists.
- Render the visible grid rows with a small buffer, preserving full scrolling and keyboard selection.
- Bound waveform and thumbnail queues; discard offscreen work and prioritize selected audio.
- Limit browser waveform decoding to five minutes and 32 MB per source. Larger audio uses optional local FFmpeg.
- Run one FFmpeg job at a time, with one thread per processing stage and reduced process priority where available.
- Pause media and folder watching while hidden, and coalesce file-change refreshes.

### Distribution and checks

- Added installation documentation, demo screenshots, contribution guidance, public lint, and cross-platform CI.
- Passed 38 local regressions, real FFmpeg conversion checks, a 216-asset browser smoke check, and a 20,000-asset grid stress check.
- Fresh Adobe verification and macOS installer execution remain pending. This release is an unsigned preview.

## 1.0.1 — 2026-11-05

Local preview preceding public publication.

- Added recursive browsing and matching thumbnails from mirrored preview folders.
- Preserved selection during unchanged refreshes and rapid folder changes.
- Made audio browsing silent, with explicit playback and full-file waveforms.
- Routed media placement to empty Premiere tracks or new After Effects layers.
- Applied FFX presets to isolated, composition-sized solids.
- Refined the compact folder tree and narrow-panel layout.

## 1.0.0 — 2026-11-05

Initial local preview: folder browsing, filtering, tags, favorites, previews, Adobe host integration, optional local FFmpeg, and platform installers.
