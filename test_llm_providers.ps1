#!/usr/bin/env powershell
# Script para probar todos los proveedores LLM
# Uso: .\test_llm_providers.ps1

param(
    [string]$Provider = "all",
    [string]$Model = "auto"
)

$RootPath = "D:\GeoNexus"
$SidecarPath = Join-Path $RootPath "ai\sidecar.py"

function Test-Provider {
    param(
        [string]$ProviderType,
        [string]$Endpoint,
        [string]$Model = "",
        [string]$ApiKey = $null
    )
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🧪 Probando: $ProviderType" -ForegroundColor Yellow
    Write-Host "   Endpoint: $Endpoint" -ForegroundColor DarkGray
    if ($Model) { Write-Host "   Modelo: $Model" -ForegroundColor DarkGray }
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    $args = @(
        "ai/sidecar.py",
        "--action", "ping_llm",
        "--provider_type", $ProviderType,
        "--base_url", $Endpoint
    )
    
    if ($Model) {
        $args += "--model"
        $args += $Model
    }
    
    # Set API key if provided
    if ($ApiKey) {
        $env:OPENAI_API_KEY = $null
        $env:OPENROUTER_API_KEY = $null
        $env:ANTHROPIC_API_KEY = $null
        
        switch ($ProviderType.ToLower()) {
            "openai" { $env:OPENAI_API_KEY = $ApiKey }
            "openrouter" { $env:OPENROUTER_API_KEY = $ApiKey }
            "anthropic" { $env:ANTHROPIC_API_KEY = $ApiKey }
        }
    }
    
    try {
        $output = & python @args 2>&1
        $json = $output | ConvertFrom-Json -ErrorAction Stop
        
        if ($json.status -eq "ok") {
            Write-Host "✅ Conexión exitosa" -ForegroundColor Green
            Write-Host "   Status: $($json.status)" -ForegroundColor Green
            if ($json.latency_ms) {
                Write-Host "   Latencia: $($json.latency_ms)ms" -ForegroundColor Green
            }
        } elseif ($json.status -eq "needs-key") {
            Write-Host "⚠️  API key requerida" -ForegroundColor Yellow
            Write-Host "   Mensaje: $($json.message)" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Error de conexión" -ForegroundColor Red
            Write-Host "   Error: $($json.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error ejecutando sidecar" -ForegroundColor Red
        Write-Host "   $_" -ForegroundColor Red
    }
}

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║           Geo Agents LLM Provider Test Suite                     ║
║                                                                ║
║  Este script prueba la conexión a todos los proveedores LLM   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Cambiar a raíz del proyecto
Push-Location $RootPath

# Test Ollama
if ($Provider -eq "all" -or $Provider -eq "ollama") {
    Test-Provider -ProviderType "ollama" -Endpoint "http://localhost:11434" -Model "mistral"
}

# Test LM Studio
if ($Provider -eq "all" -or $Provider -eq "lmstudio") {
    Test-Provider -ProviderType "lmstudio" -Endpoint "http://localhost:1234/v1"
}

# Test OpenRouter
if ($Provider -eq "all" -or $Provider -eq "openrouter") {
    $orKey = $env:OPENROUTER_API_KEY
    if (-not $orKey) {
        Write-Host "`n⚠️  OPENROUTER_API_KEY no está configurada" -ForegroundColor Yellow
        Write-Host "   Configure primero: [Environment]::SetEnvironmentVariable('OPENROUTER_API_KEY', 'tu-key', 'User')" -ForegroundColor DarkGray
    }
    Test-Provider -ProviderType "openrouter" -Endpoint "https://openrouter.ai/api/v1" -Model "gpt-3.5-turbo" -ApiKey $orKey
}

# Test OpenAI
if ($Provider -eq "all" -or $Provider -eq "openai") {
    $oaiKey = $env:OPENAI_API_KEY
    if (-not $oaiKey) {
        Write-Host "`n⚠️  OPENAI_API_KEY no está configurada" -ForegroundColor Yellow
        Write-Host "   Configure primero: [Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'sk-...', 'User')" -ForegroundColor DarkGray
    }
    Test-Provider -ProviderType "openai" -Endpoint "https://api.openai.com/v1" -Model "gpt-3.5-turbo" -ApiKey $oaiKey
}

# Test Anthropic
if ($Provider -eq "all" -or $Provider -eq "anthropic") {
    $anthKey = $env:ANTHROPIC_API_KEY
    if (-not $anthKey) {
        Write-Host "`n⚠️  ANTHROPIC_API_KEY no está configurada" -ForegroundColor Yellow
        Write-Host "   Configure primero: [Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-...', 'User')" -ForegroundColor DarkGray
    }
    Test-Provider -ProviderType "anthropic" -Endpoint "https://api.anthropic.com" -Model "claude-sonnet-4" -ApiKey $anthKey
}

Pop-Location

Write-Host @"

╔════════════════════════════════════════════════════════════════╗
║                    Pruebas completadas                         ║
║                                                                ║
║  Próximos pasos:                                               ║
║  1. Ejecutar: npm run tauri dev                                ║
║  2. Ir a: Servidores IA                                        ║
║  3. Agregar proveedor con configuración correcta               ║
║  4. Hacer click: "Probar conexión"                             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green
