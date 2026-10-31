$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$previewUrl = 'http://127.0.0.1:5573/'
# A stable origin preserves browser-local edits and starred links across restarts.
try {
    $existing = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
    if ($existing.Content -like '*Li+*' -and $existing.Content -like '*navigation/world-ui.js*') {
        Start-Process $previewUrl
        exit 0
    }
    throw 'Port 5573 is occupied by another app. Run python tools/serve.py for a random free port.'
} catch {
    if ($_.Exception.Message -like 'Port 5573*') { throw }
}
$pythonPath = $null
foreach ($name in @('python', 'python3', 'py')) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command -and $command.Source -notlike '*\WindowsApps\*') { $pythonPath = $command.Source; break }
}
if (-not $pythonPath) {
    $bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
    if (Test-Path -LiteralPath $bundledPython) { $pythonPath = $bundledPython }
}
if (-not $pythonPath) { throw 'Python 3 is required. Install Python 3, then run this launcher again.' }
Write-Host "Li+ Homecraft: $previewUrl"
Write-Host 'Keep this terminal open. Press Ctrl+C to stop the preview.'
& $pythonPath (Join-Path $PSScriptRoot 'serve.py') 5573 --open
exit $LASTEXITCODE
