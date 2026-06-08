# Configurar todos los proveedores LLM para Fase 6

He corregido todos los proveedores LLM (Ollama, LM Studio, OpenAI, OpenRouter, Anthropic).

## Resumen de cambios

✅ **ollama.py** - Implementado completamente
✅ **lmstudio.py** - Implementado completamente  
✅ **openai.py** - Implementado completamente
✅ **anthropic.py** - Implementado completamente
✅ **openrouter.py** - Implementado completamente
✅ **router.py** - Mejorado para manejar cada proveedor correctamente

---

## Configuración por proveedor

### 1️⃣ OLLAMA (Local - Recomendado para empezar)

**Requisitos:**
- Ollama instalado y corriendo localmente
- Comando: `ollama serve`
- Puerto por defecto: `11434`

**Configuración:**
```powershell
# No requiere API key, solo inicia Ollama
ollama serve
```

**En AiContainersPage:**
- **Nombre:** Ollama
- **Endpoint:** `http://localhost:11434`
- **API key:** (ninguna)
- **Modelo:** (detectará automáticamente: mistral, llama2, neural-chat, etc.)

**Test:**
```powershell
cd D:\GeoNexus
python ai/sidecar.py --action ping_llm --provider_type ollama --base_url http://localhost:11434
```

---

### 2️⃣ LM STUDIO (Local - Similar a Ollama)

**Requisitos:**
- LM Studio instalado
- Servidor corriendo en puerto 1234

**Configuración:**
```powershell
# LM Studio debe estar abierto y el servidor activo
# Puerto por defecto: 1234/v1
```

**En AiContainersPage:**
- **Nombre:** LM Studio
- **Endpoint:** `http://localhost:1234/v1`
- **API key:** (ninguna)
- **Modelo:** (se detecta del modelo cargado en LM Studio)

**Test:**
```powershell
python ai/sidecar.py --action ping_llm --provider_type lmstudio --base_url http://localhost:1234/v1
```

---

### 3️⃣ OPENAI (Cloud - Requiere API key)

**Requisitos:**
- Cuenta en OpenAI
- API key generada

**Obtener API key:**
1. Ve a https://platform.openai.com/api/keys
2. Click "Create new secret key"
3. Copia la clave

**Configuración:**
```powershell
# PowerShell (como administrador):
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-...", "User")

# Reinicia terminal
```

**En AiContainersPage:**
- **Nombre:** OpenAI
- **Endpoint:** `https://api.openai.com/v1`
- **API key:** `sk-...`
- **Modelo:** (cargará: gpt-4, gpt-3.5-turbo, etc.)

**Test:**
```powershell
$env:OPENAI_API_KEY = "sk-..."
python ai/sidecar.py --action ping_llm --provider_type openai --base_url https://api.openai.com/v1 --model gpt-3.5-turbo
```

---

### 4️⃣ OPENROUTER (Cloud - Gateway multi-modelo)

**Requisitos:**
- Cuenta en OpenRouter
- API key generada

**Obtener API key:**
1. Ve a https://openrouter.ai/keys
2. Genera nueva API key
3. Copia la clave

**Configuración:**
```powershell
# PowerShell (como administrador):
[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-...", "User")

# Reinicia terminal
```

**En AiContainersPage:**
- **Nombre:** OpenRouter
- **Endpoint:** `https://openrouter.ai/api/v1`
- **API key:** `sk-or-...`
- **Modelo:** (cargará: gpt-4, mistral, claude, llama, etc. - muchos modelos disponibles)

**Test:**
```powershell
$env:OPENROUTER_API_KEY = "sk-or-..."
python ai/sidecar.py --action ping_llm --provider_type openrouter --base_url https://openrouter.ai/api/v1 --model gpt-3.5-turbo
```

---

### 5️⃣ ANTHROPIC (Cloud - Claude)

**Requisitos:**
- Cuenta en Anthropic
- API key generada

**Obtener API key:**
1. Ve a https://console.anthropic.com/account/keys
2. Click "Create Key"
3. Copia la clave

**Configuración:**
```powershell
# PowerShell (como administrador):
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")

# Reinicia terminal
```

**En AiContainersPage:**
- **Nombre:** Anthropic
- **Endpoint:** `https://api.anthropic.com`
- **API key:** `sk-ant-...`
- **Modelo:** (disponibles: claude-opus-4-1, claude-sonnet-4, claude-haiku-3)

**Test:**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
python ai/sidecar.py --action ping_llm --provider_type anthropic --base_url https://api.anthropic.com --model claude-sonnet-4
```

---

## Orden recomendado para probar

### 1️⃣ Comienza con OLLAMA (local, sin API key):
```powershell
# Instala Ollama: https://ollama.ai
# Inicia en terminal separada:
ollama serve

# Luego en otra terminal:
npm run tauri dev

# En UI: Agregar → Ollama → http://localhost:11434 → Cargar Modelos
```

### 2️⃣ Luego intenta LM STUDIO (si tienes):
```powershell
# Similar a Ollama pero en puerto 1234
```

### 3️⃣ Prueba OPENROUTER (más barato que OpenAI):
```powershell
# Obtén API key en https://openrouter.ai/keys
[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "tu-key", "User")
# Cierra y reabre terminal
npm run tauri dev
```

### 4️⃣ Luego OPENAI o ANTHROPIC según necesidad:
```powershell
# Misma configuración que OpenRouter pero con otros endpoints
```

---

## Solucionar problemas

### Error: "Sin modelos detectados"
**Causa:** No hay conexión al proveedor
- ✅ Verifica que el endpoint es correcto
- ✅ Para locales (Ollama, LM Studio): verifica que están corriendo
- ✅ Para cloud: verifica que la API key está configurada

### Error: "API_KEY no esta configurado"
**Causa:** Variable de entorno no está establecida
```powershell
# Verifica que está configurada:
$env:OPENROUTER_API_KEY
# Debe mostrar tu clave (sin comillas)

# Si no aparece, configúrala de nuevo:
[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-...", "User")
# Cierra y reabre VS Code completamente
```

### Error: "HTTP 429: Too Many Requests"
**Causa:** Alcanzaste el límite de tu plan
- Espera unos minutos
- Para cloud providers: revisa tu uso en el dashboard

### Error: "Tauri no disponible"
**Causa:** El sidecar Python no se ejecuta
```powershell
# Verifica Python venv:
cd D:\GeoNexus\ai
python --version  # Debe ser 3.10+

# Reinstala dependencias:
pip install -r requirements.txt

# Prueba sidecar directamente:
python sidecar.py --action ping_llm --provider_type ollama --base_url http://localhost:11434
```

---

## Próximos pasos

1. **Elige un proveedor** (recomendado: Ollama local primero)
2. **Configúralo** según instrucciones arriba
3. **Prueba en AiContainersPage** - debe cargar modelos
4. **Haz click en "Probar"** - debe conectar y mostrar latencia
5. **Guarda la configuración** - se guardará en memoria (luego: persistir con Stronghold)

---

## Tabla de comparación

| Proveedor | Costo | Latencia | Requiere | URL |
|-----------|-------|----------|----------|-----|
| Ollama | Gratis | Baja | Instalación local | `http://localhost:11434` |
| LM Studio | Gratis | Baja | Instalación local | `http://localhost:1234/v1` |
| OpenRouter | $ | Media | API key | `https://openrouter.ai/api/v1` |
| OpenAI | $$ | Media | API key | `https://api.openai.com/v1` |
| Anthropic | $ | Media | API key | `https://api.anthropic.com` |

---

¿Cuál quieres probar primero?
