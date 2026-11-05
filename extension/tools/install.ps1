[CmdletBinding(SupportsShouldProcess = $true)]
param([string]$Destination = (Join-Path $env:APPDATA 'Adobe\CEP\extensions\FolderDock'))
$ErrorActionPreference = 'Stop'
$source = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$target = [IO.Path]::GetFullPath($Destination)
if (-not (Test-Path -LiteralPath (Join-Path $source 'CSXS\manifest.xml'))) { throw 'Run this installer from the complete extension folder.' }
if ($target -eq $source -or $target.StartsWith($source + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'The destination must be outside the source folder.' }
$parent = Split-Path -Parent $target
if (-not $parent -or $target -eq [IO.Path]::GetPathRoot($target)) { throw 'Choose a named extension directory, not a drive root.' }
if ($PSCmdlet.ShouldProcess($target, 'Install FolderDock; preserve any existing installation as a backup')) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    if (Test-Path -LiteralPath $target) {
        $backupDirectory = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'FolderDock\installation-backups'
        New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
        $backup = Join-Path $backupDirectory ('FolderDock-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
        if (Test-Path -LiteralPath $backup) { throw 'Backup path already exists; try again.' }
        Move-Item -LiteralPath $target -Destination $backup
        Write-Host "Previous installation preserved: $backup"
    }
    Copy-Item -LiteralPath $source -Destination $target -Recurse
}
foreach ($version in 11,12,13) {
    $key = "HKCU:\Software\Adobe\CSXS.$version"
    if ($PSCmdlet.ShouldProcess($key, 'Enable unsigned CEP extensions (PlayerDebugMode=1)')) {
        New-Item -Path $key -Force | Out-Null
        New-ItemProperty -LiteralPath $key -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
    }
}
if (-not $WhatIfPreference) { Write-Host 'FolderDock installed. Restart Premiere Pro / After Effects, then open Window > Extensions > FolderDock.' }
