<#
Imports a locally downloaded source bundle into this existing git checkout.
The script does not push by default. Inspect staged changes before publishing.
Example:
  ./scripts/import-source-bundle.ps1 -ZipPath C:\Downloads\zhuru_wave_source_bundle.zip
#>
param(
  [Parameter(Mandatory = $true)][string]$ZipPath
)

$ErrorActionPreference = "Stop"
$repoRoot = (git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) { throw "Run inside a Git working tree." }
$zipResolved = (Resolve-Path -LiteralPath $ZipPath).Path
$temp = Join-Path $env:TEMP ("zhuru_bundle_" + [guid]::NewGuid().ToString("N"))

try {
  New-Item -ItemType Directory -Path $temp -Force | Out-Null
  Expand-Archive -LiteralPath $zipResolved -DestinationPath $temp
  foreach ($dir in @("desktop", "native_cpp", "algorithm_experiments")) {
    $src = Join-Path $temp $dir
    if (-not (Test-Path -LiteralPath $src -PathType Container)) {
      throw "Missing expected directory in archive: $dir"
    }
    Copy-Item -LiteralPath $src -Destination $repoRoot -Recurse -Force
  }
  Copy-Item -LiteralPath (Join-Path $temp "MANIFEST.json") -Destination (Join-Path $repoRoot "SOURCE_BUNDLE_MANIFEST.json") -Force
  Write-Host "Copied original source directories. Review changes before committing:"
  & git -C $repoRoot status --short
  Write-Host "Suggested: git add desktop native_cpp algorithm_experiments SOURCE_BUNDLE_MANIFEST.json"
  Write-Host "Suggested: git commit -m 'chore: import original desktop C++ and algorithm research sources'"
  Write-Host "Suggested: git push origin main"
} finally {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
}
