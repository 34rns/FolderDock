[CmdletBinding()]
param([string]$Name = 'FolderDock-1.0.2-preview.zip')
$ErrorActionPreference = 'Stop'
if ($Name -notmatch '^FolderDock-[A-Za-z0-9._-]+\.zip$') { throw 'Choose a simple FolderDock ZIP filename.' }
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'extension'
$release = Join-Path $root 'releases'
New-Item -ItemType Directory -Path $release -Force | Out-Null
$destination = Join-Path $release $Name
if (Test-Path -LiteralPath $destination) { throw "Release already exists: $destination" }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($destination, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in (Get-ChildItem -LiteralPath $source -File -Recurse -Force)) {
        $relative = $file.FullName.Substring($source.Length).TrimStart('\','/').Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, "FolderDock/$relative", [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose() }
$check = [IO.Compression.ZipFile]::OpenRead($destination)
try {
    $names = @($check.Entries | ForEach-Object { $_.FullName })
    foreach ($required in 'FolderDock/.debug','FolderDock/CSXS/manifest.xml','FolderDock/index.html','FolderDock/host/host.jsx','FolderDock/tools/install.ps1','FolderDock/MANUAL-TEST.md') {
        if ($names -notcontains $required) { throw "Release is missing $required" }
    }
    Write-Host "Packaged $($names.Count) files: $destination"
} finally { $check.Dispose() }
Get-FileHash -LiteralPath $destination -Algorithm SHA256
