#!/usr/bin/env bash
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo 'This installer is for macOS. On Windows use install.ps1.' >&2
    exit 1
fi
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
target="$HOME/Library/Application Support/Adobe/CEP/extensions/FolderDock"
[[ -f "$source_dir/CSXS/manifest.xml" ]] || { echo 'Incomplete extension folder.' >&2; exit 1; }
[[ "$source_dir" != "$target" ]] || { echo 'Run the installer from an extracted release folder.' >&2; exit 1; }
mkdir -p -- "$(dirname -- "$target")"
if [[ -e "$target" ]]; then
    backup_dir="$HOME/Library/Application Support/Adobe/CEP/FolderDock-backups"
    mkdir -p -- "$backup_dir"
    backup="$backup_dir/FolderDock-$(date +%Y%m%d-%H%M%S)"
    [[ ! -e "$backup" ]] || { echo 'Backup already exists; try again.' >&2; exit 1; }
    mv -- "$target" "$backup"
    echo "Previous installation preserved: $backup"
fi
cp -R -- "$source_dir" "$target"
for version in 11 12 13; do
    defaults write "com.adobe.CSXS.$version" PlayerDebugMode -string 1
done
echo 'FolderDock installed. Restart Adobe, then open Window > Extensions > FolderDock.'
