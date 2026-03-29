# Run from repo root:  .\scripts\setup-db.ps1
# Prompts for PostgreSQL "postgres" user password (same as pgAdmin), then runs db:setup.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:POSTGRES_PASSWORD) {
  $sec = Read-Host "PostgreSQL password for user 'postgres'" -AsSecureString
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($sec)
  try {
    $env:POSTGRES_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($ptr)
  }
}

npm run db:setup
