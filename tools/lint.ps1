# Check ES3 host compatibility, classic panel scripts, and module size.
$root = Split-Path -Parent $PSScriptRoot
$ext = Join-Path $root 'extension'
if (-not (Test-Path $ext)) { Write-Host "extension folder not found: $ext"; exit 1 }
$bad = @()

$jsx = Get-ChildItem $ext -Filter *.jsx -File -Recurse | Where-Object { $_.FullName -notmatch '[\\/]lib[\\/]' }
foreach ($f in $jsx) {
  $n = 0
  foreach ($line in (Get-Content $f.FullName -Encoding UTF8)) {
    $n++
    if ($line -match '^\s*//') { continue }
    if ($line -match '\b(let|const)\s+[A-Za-z_$]' -or $line -match '=>' -or $line -match '`' -or $line -match '\.(map|forEach|filter|trim)\(') {
      $bad += "ES3 violation  $($f.Name):$n   $($line.Trim())"
    }
  }
}

$js = Get-ChildItem (Join-Path $ext 'js'), (Join-Path $ext 'dev') -Filter *.js -File -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '[\\/]lib[\\/]' }
foreach ($f in $js) {
  $n = 0
  foreach ($line in (Get-Content $f.FullName -Encoding UTF8)) {
    $n++
    if ($line -match '^\s*(import\s|export\s)') { $bad += "Module syntax   $($f.Name):$n   $($line.Trim())" }
    if ($line -match 'localStorage\.|fetch\(|XMLHttpRequest') { $bad += "Forbidden call  $($f.Name):$n   $($line.Trim())" }
  }
}

$all = @($jsx) + @($js)
foreach ($f in $all) {
  $count = (Get-Content $f.FullName).Count
  if ($count -gt 170) { $bad += "File too long   $($f.Name) has $count lines (max ~150)" }
}

if ($bad.Count -eq 0) { Write-Host 'LINT OK'; exit 0 }
$bad | ForEach-Object { Write-Host $_ }
Write-Host "LINT FAILED: $($bad.Count) problem(s). Fix them."
exit 1
