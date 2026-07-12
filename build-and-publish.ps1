# build-and-publish.ps1
# Run from SOLUTION ROOT - produces a single self-contained LinguaCore.exe
# Usage: .\build-and-publish.ps1
# Usage with Release config: .\build-and-publish.ps1 -Config Release

param(
    [string]$Config    = "Release",
    [string]$OutputDir = "./publish"
)

$ErrorActionPreference = "Stop"
$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   LinguaCore - Full Build & Publish    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Verify we are in solution root ────────────────────────────────────────────
if (-not (Test-Path "LinguaCore.sln")) {
    Write-Error "Run this script from the solution root folder (where LinguaCore.sln is)."
    exit 1
}

# ── Step 1: Build React frontend ──────────────────────────────────────────────
Write-Host "`n[1/5] Building React frontend..." -ForegroundColor Yellow
Set-Location frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "      Installing npm packages..." -ForegroundColor Gray
    npm install --silent
    if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }
}

npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "React build failed"; exit 1 }
Set-Location ..
Write-Host "      React built -> LinguaCore.API/wwwroot" -ForegroundColor Green

# ── Step 2: Restore .NET ──────────────────────────────────────────────────────
Write-Host "`n[2/5] Restoring .NET packages..." -ForegroundColor Yellow
dotnet restore --nologo -q
if ($LASTEXITCODE -ne 0) { Write-Error "dotnet restore failed"; exit 1 }

# ── Step 3: Build solution ────────────────────────────────────────────────────
Write-Host "`n[3/5] Building .NET solution ($Config)..." -ForegroundColor Yellow
dotnet build --no-restore -c $Config --nologo -q
if ($LASTEXITCODE -ne 0) { Write-Error "dotnet build failed - fix all errors first"; exit 1 }

# ── Step 4: Publish single EXE ────────────────────────────────────────────────
Write-Host "`n[4/5] Publishing single-file EXE (win-x64, self-contained)..." -ForegroundColor Yellow

if (Test-Path $OutputDir) { Remove-Item $OutputDir -Recurse -Force }

dotnet publish LinguaCore.API/LinguaCore.API.csproj `
    -c $Config `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:EnableCompressionInSingleFile=true `
    --no-build `
    -o $OutputDir `
    --nologo -q

if ($LASTEXITCODE -ne 0) { Write-Error "dotnet publish failed"; exit 1 }

# ── Step 5: Copy external config files (stay editable outside the EXE) ───────
Write-Host "`n[5/5] Copying config files..." -ForegroundColor Yellow
Copy-Item "LinguaCore.API/appsettings.json"             "$OutputDir/appsettings.json"             -Force
Copy-Item "LinguaCore.API/appsettings.Development.json" "$OutputDir/appsettings.Development.json" -Force

$sw.Stop()
$elapsed = $sw.Elapsed.ToString("mm\:ss")

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Build complete in $elapsed           " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output folder: $OutputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files:" -ForegroundColor White
Write-Host "  LinguaCore.API.exe   - double-click to run the application" -ForegroundColor White
Write-Host "  appsettings.json     - edit connection string, JWT key, SMTP, Firebase" -ForegroundColor White
Write-Host ""
Write-Host "Before first run:" -ForegroundColor Yellow
Write-Host "  1.  Edit appsettings.json - fill in your SQL Server connection string"
Write-Host "  2.  Edit appsettings.json - set Jwt:Key to a secure random 32+ char string"
Write-Host "  3.  Run: .\run-migrations.ps1   (creates the database)"
Write-Host "  4.  Double-click LinguaCore.API.exe - browser opens automatically"
Write-Host "  5.  First launch shows setup page - create your Super Admin account"
Write-Host ""
