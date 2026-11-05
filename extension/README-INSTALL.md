# Install FolderDock

Follow [README.md](README.md) for the complete installation, usage and troubleshooting guide.

On Windows, close Adobe and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install.ps1
```

On macOS, run `bash tools/install.sh`. Restart Adobe and open **Window > Extensions > FolderDock**.

The archive is an unsigned developer build. Existing installations are backed up outside Adobe's extension discovery folder. Real-app acceptance checks for this build remain pending in [MANUAL-TEST.md](MANUAL-TEST.md).
