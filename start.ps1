#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Model = "qwen3:14b"
$AppUrl = "http://localhost:5173"
$OllamaHost = if ($env:OLLAMA_HOST) { $env:OLLAMA_HOST } else { "http://127.0.0.1:11434" }
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

function Write-Info([string]$Message) { Write-Host ("-> " + $Message) -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host ("OK  " + $Message) -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host ("!   " + $Message) -ForegroundColor Yellow }
function Write-Fail([string]$Message) {
  Write-Host ("ERR " + $Message) -ForegroundColor Red
  exit 1
}

function Show-Banner {
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host "  Lokaler LLM Chat ist bereit" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  Oeffne im Browser:" -ForegroundColor Cyan
  Write-Host ("  " + $AppUrl) -ForegroundColor Green
  Write-Host ""
  Write-Host ("  Modell: " + $Model) -ForegroundColor Cyan
  Write-Host "  Stoppen: Ctrl+C" -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host ""
}

function Test-CommandExists([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-OllamaApi {
  try {
    Invoke-RestMethod -Uri ($OllamaHost + "/api/tags") -Method GET -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-ModelInstalled {
  try {
    $names = (ollama list 2>$null) | Select-Object -Skip 1 | ForEach-Object {
      ($_ -split "\s+")[0]
    }
    return $names -contains $Model
  } catch {
    return $false
  }
}

function Install-OllamaApp {
  Write-Warn "Ollama ist nicht installiert."

  if (Test-CommandExists "winget") {
    Write-Info "Installiere Ollama mit winget..."
    winget install Ollama.Ollama --accept-package-agreements --accept-source-agreements
  } else {
    Write-Info "Lade Ollama-Installer herunter..."
    $installer = Join-Path $env:TEMP "OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installer
    Write-Info "Starte Installer (ggf. Bestaetigung noetig)..."
    Start-Process -FilePath $installer -Wait
  }

  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")

  if (-not (Test-CommandExists "ollama")) {
    Write-Fail "Ollama-Installation fehlgeschlagen oder PATH noch nicht aktualisiert. Terminal neu oeffnen und start.ps1 erneut ausfuehren."
  }

  Write-Ok "Ollama installiert."
}

function Start-OllamaIfNeeded {
  if (Test-OllamaApi) {
    Write-Ok "Ollama laeuft bereits."
    return
  }

  Write-Info "Starte Ollama..."

  $ollamaApp = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"
  if (Test-Path $ollamaApp) {
    Start-Process -FilePath $ollamaApp | Out-Null
  } else {
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden | Out-Null
  }

  for ($i = 0; $i -lt 30; $i++) {
    if (Test-OllamaApi) {
      Write-Ok "Ollama ist gestartet."
      return
    }
    Start-Sleep -Seconds 1
  }

  Write-Fail "Ollama konnte nicht gestartet werden. Bitte Ollama manuell oeffnen und erneut versuchen."
}

function Install-ModelIfNeeded {
  if (Test-ModelInstalled) {
    Write-Ok ("Modell " + $Model + " ist installiert.")
    return
  }

  Write-Warn ("Modell " + $Model + " fehlt - lade herunter (kann dauern)...")
  ollama pull $Model
  if (-not (Test-ModelInstalled)) {
    Write-Fail ("Modell " + $Model + " konnte nicht installiert werden.")
  }
  Write-Ok ("Modell " + $Model + " installiert.")
}

function Start-ModelWarmup {
  Write-Info ("Pruefe, ob " + $Model + " antwortet...")
  $body = @{
    model   = $Model
    prompt  = "hi"
    stream  = $false
    think   = $false
    options = @{ num_predict = 1 }
  } | ConvertTo-Json -Depth 4

  try {
    Invoke-RestMethod -Uri ($OllamaHost + "/api/generate") -Method POST -ContentType "application/json" -Body $body -TimeoutSec 120 | Out-Null
    Write-Ok ("Modell " + $Model + " ist bereit.")
  } catch {
    Write-Warn "Modell-Warmup fehlgeschlagen - die App startet trotzdem. Beim ersten Chat kann es laenger dauern."
  }
}

function Assert-NodeInstalled {
  if (-not (Test-CommandExists "node")) {
    Write-Fail "Node.js fehlt. Bitte von https://nodejs.org installieren."
  }
  if (-not (Test-CommandExists "npm")) {
    Write-Fail "npm fehlt. Bitte Node.js neu installieren."
  }
  Write-Ok ("Node.js " + (node -v) + " / npm " + (npm -v))
}

function Install-NpmDepsIfNeeded {
  if (-not (Test-Path "node_modules")) {
    Write-Info "Installiere npm-Abhaengigkeiten..."
    npm install
  } else {
    Write-Ok "npm-Abhaengigkeiten vorhanden."
  }
}

Write-Host ""
Write-Host "Lokaler LLM Chat - Start" -ForegroundColor Cyan
Write-Host ""

Assert-NodeInstalled

if (-not (Test-CommandExists "ollama")) {
  Install-OllamaApp
} else {
  $version = (ollama --version 2>$null | Select-Object -First 1)
  Write-Ok ("Ollama gefunden (" + $version + ")")
}

Start-OllamaIfNeeded
Install-ModelIfNeeded
Start-ModelWarmup
Install-NpmDepsIfNeeded

Show-Banner
Write-Info "Starte die App..."
Write-Host ""
npm run dev -- --host 127.0.0.1 --port 5173
