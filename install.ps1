$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$versionText = node --version
if ($LASTEXITCODE -ne 0) { throw 'Node.js is required.' }
$parts = $versionText.TrimStart('v').Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]
if (-not (($major -eq 22 -and $minor -ge 19) -or $major -ge 24)) {
    throw "Node.js $versionText is unsupported. Install Node.js 22.19+ or 24+."
}
$pnpmVersion = pnpm --version
if ($LASTEXITCODE -ne 0) { throw 'pnpm 11.7.0 is required. Run: corepack enable; corepack prepare pnpm@11.7.0 --activate' }
if ($pnpmVersion.Trim() -ne '11.7.0') { throw "pnpm $pnpmVersion is unsupported for this package. Install pnpm 11.7.0." }
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Build complete. Start with: pnpm dsh web'
