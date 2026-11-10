$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$infisicalExecutable = (Get-Command infisical -ErrorAction Stop).Source

if (-not (Test-Path -LiteralPath '.infisical.json')) {
    throw 'Link this repository to its actual Infisical project before starting. See docs/setup.md.'
}

$configurationJson = & $infisicalExecutable run --env=dev --path=/ --silent --log-level=error -- node scripts/check-config.mjs --json
if ($LASTEXITCODE -ne 0) { throw 'Infisical configuration check failed. Run pnpm config:check. No secret values are printed.' }
$configuration = $configurationJson | ConvertFrom-Json

function Test-LocalPort {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try { return $client.ConnectAsync('127.0.0.1', $Port).Wait(300) -and $client.Connected }
    catch { return $false }
    finally { $client.Dispose() }
}

function Start-LocalBackend {
    param([string]$Name, [int]$Port, [string]$ScriptPath)
    if (Test-LocalPort -Port $Port) {
        Write-Host "$Name already listens on localhost:$Port. Reusing it."
        return
    }
    $logDirectory = Join-Path $repositoryRoot '.data/logs'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $backend = Start-Process -FilePath $nodeExecutable -ArgumentList @('--import', 'tsx', $ScriptPath) -WorkingDirectory $repositoryRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory "$Name.log") -RedirectStandardError (Join-Path $logDirectory "$Name.error.log") -PassThru
    $deadline = (Get-Date).AddMinutes(3)
    while (-not (Test-LocalPort -Port $Port)) {
        if ($backend.HasExited) { throw "$Name exited. Check .data/logs/$Name.error.log." }
        if ((Get-Date) -gt $deadline) { throw "$Name did not become ready. Its first run may still be downloading MongoDB. Check .data/logs." }
        Start-Sleep -Milliseconds 500
    }
    Write-Host "$Name ready on localhost:$Port. Background process $($backend.Id)."
}

if ($configuration.databaseMode -eq 'local') {
    Start-LocalBackend -Name 'mongo' -Port 27027 -ScriptPath 'scripts/dev-mongo.ts'
}
if ($configuration.providerMode -eq 'mock') {
    Start-LocalBackend -Name 'mock-higgsfield' -Port 4010 -ScriptPath 'scripts/mock-higgsfield.ts'
    Write-Host 'LOCAL DEMO: generated results come from the local mock, not the real Higgsfield API.'
}
if (Test-LocalPort -Port 3000) { throw 'Port 3000 is already in use. Open the existing studio or stop its owning process before starting another copy.' }

& $infisicalExecutable run --env=dev --path=/ --silent --log-level=error -- node --conditions=react-server --import tsx scripts/db-init.ts
if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed. The studio was not started.' }
& $infisicalExecutable run --env=dev --path=/ --silent --log-level=error -- node node_modules/next/dist/bin/next dev --hostname 127.0.0.1
exit $LASTEXITCODE
