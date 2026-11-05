# Contributing

The source repository and full contribution guide are at [34rns/FolderDock](https://github.com/34rns/FolderDock/blob/main/CONTRIBUTING.md). Extension code is in `extension/`. Do not add bundled media, presets, network services, frameworks or a build step.

Panel files are classic scripts under the global `FD` namespace. Route disk/process operations through `FD.fs` and Adobe calls through `FD.bridge`. Host `.jsx` files must use ES3 and return the documented JSON envelope. Never suppress a failed operation and report success.

Keep modules small, use theme variables, insert filenames with `textContent`, and preserve library data on read/write errors. Extend the dependency-free regression suite when fixing meaningful behavior.

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/lint.ps1
node --test tests/*.test.cjs
```

Run `node --check` on changed panel scripts. The repository also includes optional browser smoke and large-grid checks; see the full contribution guide for prerequisites. UI and simulated-host tests do not replace the Adobe checks in [MANUAL-TEST.md](MANUAL-TEST.md). Include exact versions, errors and verification results in the issue or pull request. Mark uncertain Adobe behavior pending rather than claiming it works.
