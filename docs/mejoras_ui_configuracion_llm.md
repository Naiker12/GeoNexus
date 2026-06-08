# Mejoras en la configuración de proveedores LLM - Fase 6

## Cambios realizados

### 1. ProviderSetupDialog.tsx - Experiencia mejorada

**ANTES:**
- ❌ Selector de modelos siempre visible pero vacío
- ❌ Mensaje confuso "Sin modelos detectados"
- ❌ Botones duplicados (arriba y abajo)
- ❌ No hay estado de carga visible

**AHORA:**
- ✅ Selector solo aparece cuando hay modelos cargados
- ✅ Mientras carga: muestra "Detectando..." con spinner
- ✅ Si hay error: muestra error claro en rojo
- ✅ Si no hay modelos aún: muestra instrucción "Haz click en Probar y cargar"
- ✅ Botón "Guardar proveedor" deshabilitado hasta que haya modelo
- ✅ Un solo botón "Probar y cargar" (no duplicados)

---

## Cómo usar ahora

### Flujo correcto:

1. **Abre AiContainersPage** (Servidores IA)
2. **Click: "Agregar Proveedor"**
3. **Selecciona proveedor** (ej: OpenRouter)
4. **Se abre ProviderSetupDialog:**
   - Endpoint: `https://openrouter.ai/api/v1`
   - API key: `sk-or-...` (si necesita)
   - **Modelo activo:** Verás el estado

   | Estado | Qué ver |
   |--------|---------|
   | 📝 Sin cargar | "Haz click en Probar y cargar" |
   | ⏳ Cargando | "Detectando..." + spinner |
   | ✅ Con modelos | Dropdown con opciones (mistral, gpt-4, etc.) |
   | ❌ Error | Mensaje de error en rojo |

5. **Click: "Probar y cargar"**
   - El sistema prueba la conexión
   - Si OK → Carga los modelos disponibles
   - Si error → Muestra mensaje rojo

6. **Selecciona modelo** del dropdown
7. **Click: "Guardar proveedor"**
   - ✅ Se guarda en memoria
   - Próximo: persistir con keychain

---

## Ejemplo paso a paso: OpenRouter

```
1. Agregar Proveedor
   ↓
2. Seleccionar "OpenRouter"
   ↓
3. Se abre diálogo:
   - Nombre: OpenRouter (por defecto)
   - Endpoint: https://openrouter.ai/api/v1 (pre-llenado)
   - API key: [copiar tu clave sk-or-...]
   - Modelo activo: (vacío, dice "Haz click...")
   ↓
4. Click "Probar y cargar"
   - Muestra: "Detectando..." + spinner ⏳
   ↓
5. Después de 3-5 segundos:
   - ✅ Dropdown aparece con modelos:
     - gpt-4
     - gpt-3.5-turbo
     - mistral-7b
     - claude-opus
     - etc.
   ↓
6. Selecciona modelo (ej: gpt-3.5-turbo)
   ↓
7. Click "Guardar proveedor"
   - ✅ Se guarda
   - Toast: "Proveedor preparado"
```

---

## Mensajes de error y cómo resolverlos

### "Tauri no disponible"
**Causa:** Estás corriendo `npm run dev` en lugar de `npm run tauri dev`

**Solución:**
```powershell
# Detén el servidor actual
Ctrl+C

# Reinicia correctamente:
npm run tauri dev

# Espera a que Tauri arranque (tarda 10-15 segundos)
```

### "OPENROUTER_API_KEY no esta configurado"
**Causa:** Variable de entorno no configurada

**Solución:**
```powershell
# Configúrala:
[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-...", "User")

# Cierra y reabre VS Code/PowerShell completamente

# Reinicia Tauri dev:
npm run tauri dev
```

### "HTTP 401: Unauthorized"
**Causa:** API key inválida o expirada

**Solución:**
- Verifica tu clave en https://openrouter.ai/keys
- Copia nuevamente
- Actualiza la variable de entorno

### "No se pudo conectar"
**Causa:** Endpoint incorrecto o proveedor offline

**Solución:**
- Para locales (Ollama, LM Studio): verifica que están corriendo
  ```powershell
  ollama serve  # Para Ollama
  ```
- Para cloud: verifica la URL del endpoint

---

## Cambios también en AiContainersPage.tsx

### Mejora de mensajes de error

Cuando haces "Probar" en un proveedor configurado:

**ANTES:**
```
❌ Prueba no disponible
   Tauri no disponible
```

**AHORA:**
```
❌ Prueba no disponible
   Asegúrate de estar ejecutando 'npm run tauri dev' (no 'npm run dev')
```

---

## Checklist para usar la nueva versión

- [ ] Ejecuto `npm run tauri dev` (no `npm run dev`)
- [ ] Tengo Tauri funcionando (veo ventana de app)
- [ ] Tengo API key (si uso cloud provider)
- [ ] La variable de entorno está configurada (si la necesito)
- [ ] Voy a AiContainersPage
- [ ] Click "Agregar Proveedor"
- [ ] Selecciono proveedor
- [ ] Click "Probar y cargar"
- [ ] Espero a que detecte modelos
- [ ] Selecciono modelo
- [ ] Click "Guardar proveedor"

---

## Próximos pasos

1. **Persistencia:** Guardar configuración en SQLite (sin API keys, solo endpoint + nombre)
2. **Keychain:** Guardar API keys en Tauri Stronghold (seguro)
3. **Chat real:** Conectar ChatPanel con sendLlmMessage
4. **Conversaciones:** Guardar historial de chat
5. **Streaming:** Implementar responses en streaming

---

¿Ya probaste con la nueva interfaz? Cuéntame si funciona mejor. 😊
