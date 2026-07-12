# run-migrations.ps1
# Run from the SOLUTION ROOT folder (where LinguaCore.sln is)

param(
    [string]$MigrationName = "InitialCreate"
)

Write-Host "=== LinguaCore — EF Core Migrations ===" -ForegroundColor Cyan

if (-not (Test-Path "LinguaCore.sln")) {
    Write-Error "Please run this script from the solution root folder."
    exit 1
}

# Step 1: Restore
Write-Host "`n[1/6] Restoring packages..." -ForegroundColor Yellow
dotnet restore
if ($LASTEXITCODE -ne 0) { Write-Error "dotnet restore failed"; exit 1 }

# Step 2: Build
Write-Host "`n[2/6] Building solution..." -ForegroundColor Yellow
dotnet build --no-restore
if ($LASTEXITCODE -ne 0) { Write-Error "dotnet build failed"; exit 1 }

# Step 3: Remove existing migrations folder
$migrationsFolder = "LinguaCore.Infrastructure\Migrations"
if (Test-Path $migrationsFolder) {
    Write-Host "`n[3/6] Removing existing migrations to regenerate cleanly..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $migrationsFolder
} else {
    Write-Host "`n[3/6] No existing migrations found." -ForegroundColor Gray
}

# Step 4: Add migration
Write-Host "`n[4/6] Adding migration '$MigrationName'..." -ForegroundColor Yellow
dotnet ef migrations add $MigrationName `
    --project LinguaCore.Infrastructure `
    --startup-project LinguaCore.API `
    --output-dir Migrations `
    --no-build
if ($LASTEXITCODE -ne 0) { Write-Error "dotnet ef migrations add failed"; exit 1 }

# Step 5: Patch migration file — replace any remaining ON DELETE CASCADE with RESTRICT
Write-Host "`n[5/6] Patching migration file (replacing CASCADE with RESTRICT)..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem -Path $migrationsFolder -Filter "*.cs" | Where-Object { $_.Name -notlike "*Designer*" }
foreach ($file in $migrationFiles) {
    $content = Get-Content $file.FullName -Raw
    $patched = $content -replace 'onDelete: ReferentialAction\.Cascade', 'onDelete: ReferentialAction.Restrict'
    if ($content -ne $patched) {
        Set-Content $file.FullName $patched -NoNewline
        Write-Host "    Patched: $($file.Name)" -ForegroundColor Green
    }
}

# Step 6: Rebuild after patch (migration file changed)
Write-Host "`n[6/6] Rebuilding and applying migrations..." -ForegroundColor Yellow
dotnet build --no-restore
if ($LASTEXITCODE -ne 0) { Write-Error "dotnet build after patch failed"; exit 1 }

dotnet ef database update `
    --project LinguaCore.Infrastructure `
    --startup-project LinguaCore.API `
    --no-build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed. Check your connection string in LinguaCore.API/appsettings.json"
    exit 1
}

Write-Host "`n=== Database ready! ===" -ForegroundColor Green
