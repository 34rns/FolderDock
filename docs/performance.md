# Performance in 1.0.2

FolderDock shares resources with Adobe. This release reduces avoidable startup, rendering, and preview work while retaining recursive browsing.

## What changed

| Area | Behavior |
| --- | --- |
| Panel startup | Loads preferences and saved roots; scans and file watching wait for folder selection. |
| Directory reads | Asynchronous metadata reads, with at most eight in flight per listing. Scans yield regularly and cancel when abandoned. |
| Preview lookup | Caches directory listings and filename indexes for each scan. |
| Asset grid | Keeps visible rows and a small overscan buffer in the document; the complete catalog remains searchable in memory. |
| File watching | Watches the selected folder, coalesces changes over two seconds, and stops while the panel is hidden. |
| Media queues | One waveform decode, thumbnail decode, and FFmpeg job at a time; queued work is bounded and abandoned consumers are dropped. |
| FFmpeg | One decoder, filter, and encoder thread each. Uses below-normal priority where supported and terminates its own unused preview work. |

The panel still needs memory for its catalog. Large folders, network drives, codecs, and Adobe's own workload affect results. The optional FFmpeg thread limits apply per stage, not to the total number of process threads.

## Audio limits

- Automatic card waveforms are limited to sources up to 8 MB; select larger files to request their waveform.
- Browser waveform decoding requires metadata of at most five minutes and a source of at most 32 MB, using an 8 kHz audio context. Peak summarization yields in chunks.
- Longer, larger, or unsupported audio uses optional local FFmpeg. Without it, playback can still work for browser-supported formats while the waveform is unavailable.
- Audio starts only through explicit playback controls. Generated waveforms cover the full file.

## Local measurements

Measured on Windows on 2026-11-05. Browser checks used an installed Brave/Chromium browser. These results describe the test fixtures; they do not predict Adobe launch time or every machine's performance.

| Check | Result |
| --- | --- |
| Grid with 20,000 assets | 36 cards initially, 32 at the end; the final asset remained selectable and visible. |
| Indexed preview matching, 500 templates and sidecars | Filename normalizations fell from 5,758,500 to 9,000. Instrumented elapsed time fell from about 6,047 ms to 22–23 ms. |
| Read-only local library scan, 1,029 assets | 2,151 ms, no warnings; maximum timer delay beyond a 10 ms interval was 11 ms. |
| Browser interaction suite | 216 assets, audio playback, waveforms, selection preservation, desktop and narrow layouts passed. |
| Local regression suite with FFmpeg | 38 passed; no failures or skips. |

The matching benchmark instruments filename normalization and is best read as an algorithmic work comparison. Absolute times are environment-dependent. The real-library measurement excludes user paths and files from this repository.

## Reproduce and verify

Run `node --test tests/performance.test.cjs` and, with existing Playwright/browser dependencies, `node tests/ui-performance.cjs`. See [contribution guidance](../CONTRIBUTING.md).

For Adobe startup comparisons, restart after installing, use the same project and saved workspace, and compare several runs with and without the panel. Confirm that opening FolderDock does not scan until a folder is selected. Check responsiveness while scanning, scrolling, changing folders, and hiding the panel. **This release has not yet completed those fresh Adobe checks.**
