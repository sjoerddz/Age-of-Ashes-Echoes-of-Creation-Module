# --
# SDZ
# 2026-05-06
# PowerShell: build dist/desires-echoes-of-creation.zip for Foundry (folder name = module id).
# --

<#
.SYNOPSIS
    Build dist/desires-echoes-of-creation.zip with the correct root folder for Foundry.

.DESCRIPTION
    SDZ / 2026-05-16 / Local packaging helper (same layout as .github/workflows/release.yml). Strips dev-only paths (tools/, packs/desires-echoes-items-src/).

.EXAMPLE
    .\tools\package-module.ps1
#>

$ErrorActionPreference = "Stop"

$ModuleId = "desires-echoes-of-creation"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$DistRoot = Join-Path $RepoRoot "dist"
$StagingModule = Join-Path $DistRoot "staging\$ModuleId"
$ZipPath = Join-Path $DistRoot "$ModuleId.zip"

if (Test-Path $DistRoot)
{
    Remove-Item $DistRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $StagingModule | Out-Null

Get-ChildItem -LiteralPath $RepoRoot -Force |
    Where-Object {
        $_.Name -notin @(".git", ".github", ".cursor", "dist") -and
        $_.Name -notlike "*.zip"
    } |
    ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $StagingModule $_.Name) -Recurse -Force
    }

foreach ($relative in @("tools", "packs\desires-echoes-items-src"))
{
    $full = Join-Path $StagingModule $relative
    if (Test-Path $full)
    {
        Remove-Item $full -Recurse -Force
    }
}

if (Test-Path $ZipPath)
{
    Remove-Item $ZipPath -Force
}

Compress-Archive -Path $StagingModule -DestinationPath $ZipPath -Force

Write-Host "Wrote $ZipPath"
Write-Host "Upload this zip to a GitHub Release, or rely on the release GitHub Action when you push a v* tag."
