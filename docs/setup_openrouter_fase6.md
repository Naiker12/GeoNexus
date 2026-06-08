# Configurar OpenRouter para Fase 6 LLM

## El problema

Cuando intentas probar OpenRouter en AiContainersPage.tsx, ves estos errores:
- ❌ "Sin modelos detectados"
- ❌ "Prueba no disponible - Tauri no disponible"

**Causa raíz:** La variable de entorno `OPENROUTER_API_KEY` no está configurada.

---

## Solución: Configurar la API key

### Opción 1: Variable de entorno global (Windows)

1. **Obtén tu API key de OpenRouter:**
   - Ve a https://openrouter.ai/keys
   - Copia tu API key

2. **Configura la variable en Windows:**
   ```powershell
   # En PowerShell (como administrador):
   [Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "tu-api-key-aqui", "User")
   
   # Reinicia el terminal o VS Code para que tome efecto
   ```

3. **Verifica que está configurada:**
   ```powershell
   $env:OPENROUTER_API_KEY
   # Debe mostrar tu API key (sin comillas)
   ```

### Opción 2: Archivo `.env` en la raíz del proyecto

1. Crea o edita `D:\GeoNexus\.env`
2. Añade:
   ```
   OPENROUTER_API_KEY=tu-api-key-aqui
   ```

3. Asegúrate de que Tauri dev lee este archivo:
   ```toml
   # En tauri.conf.json (ya debería estar):
   [build]
   beforeDevCommand = "npm run dev"
   ```

### Opción 3: Pasar la API key en tiempo de ejecución

```powershell
# PowerShell
$env:OPENROUTER_API_KEY = "tu-api-key-aqui"
npm run tauri dev
```

---

## Probar la configuración

### Paso 1: Verifica que Python venv está activo
```powershell
cd D:\GeoNexus\ai
python --version
# Debe mostrar Python 3.10+
```

### Paso 2: Prueba el sidecar directamente
```powershell
cd D:\GeoNexus
python ai/sidecar.py --action ping_llm --provider_type openrouter --base_url https://openrouter.ai/api/v1 --model gpt-3.5-turbo
```

**Resultado esperado:**
```json
{
  "status": "ok",
  "provider_type": "openrouter",
  "model": "gpt-3.5-turbo",
  "latency_ms": 245
}
```

**Si ves error:**
```json
{
  "status": "needs-key",
  "provider_type": "openrouter",
  "message": "OPENROUTER_API_KEY no esta configurado."
}
```

→ La variable de entorno no está configurada correctamente.

---

## Paso 3: Prueba desde la UI

1. **Reinicia `npm run tauri dev`** después de configurar la API key
2. Abre AiContainersPage (Servidores IA)
3. Haz clic en **"Agregar Proveedor"** → **OpenRouter**
4. Configura:
   - **Nombre:** `OpenRouter`
   - **Endpoint:** `https://openrouter.ai/api/v1`
   - **API key:** `[tu-api-key]`
5. Haz clic en **"Cargar Modelos"**

**Resultado esperado:**
- ✅ Se cargan los modelos disponibles (gpt-3.5-turbo, gpt-4, mistral, etc.)
- ✅ Puedes seleccionar uno
- ✅ El botón "Probar" funciona

---

## Verificar que todo funciona

### En la consola de Tauri dev:
Si ves esto, OpenRouter está conectado:
```
Proveedor conectado
OpenRouter respondio correctamente.
Status: online
Latency: 234ms
```

### En la UI:
- Status debe cambiar a "online" ✅
- Modelo debe estar seleccionado ✅
- Latencia debe mostrar (ej: "234ms") ✅

---

## Solucionar problemas comunes

### "Error: OPENROUTER_API_KEY no esta configurado"
→ La variable de entorno no se guardó correctamente
- Cierra y reabre PowerShell/VS Code
- Ejecuta: `[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "clave", "User")`
- Reinicia

### "HTTP 401: Unauthorized"
→ Tu API key es inválida o ha expirado
- Verifica en https://openrouter.ai/keys
- Actualiza la variable de entorno

### "HTTP 429: Too Many Requests"
→ Has alcanzado el límite de solicitudes
- Espera unos minutos
- Revisa tu plan en OpenRouter

### "Tauri no disponible"
→ El sidecar Python no se está ejecutando correctamente
- Verifica que Python venv existe: `ls ai/.venv/Scripts/python.exe`
- Reinstala dependencias: `pip install -r ai/requirements.txt`
- Intenta en PowerShell (no Bash)

---

## Próximos pasos (después de que OpenRouter funcione)

1. **Persistir configuración:** Guardar API key en Stronghold/keychain (Tauri v2)
2. **Streaming:** Implementar `stream_chat_response`
3. **Memoria:** Conectar ChromaDB para RAG
4. **Tools:** Implementar tool-calling desde chat
5. **Conversaciones:** Guardar historial en SQLite

Ver: [estado_funciones_implementadas_geonexus.txt](estado_funciones_implementadas_geonexus.txt)
