# Auto-detección de Modelos - Patrón Odysseus 🚀

## Cambio importante: Auto-load de modelos

He implementado el **patrón de Odysseus** para GeoNexus: **los modelos se cargan automáticamente cuando cambias el endpoint**.

---

## ¿Qué cambió?

### ANTES (Manual):
```
1. Cambias endpoint
2. Haces click "Probar y cargar"
3. Esperas respuesta
4. Se carga el selector
```

### AHORA (Automático - Patrón Odysseus):
```
1. Cambias endpoint
   ↓
2. Automáticamente (800ms delay):
   - Detecta proveedor
   - Hace fetch de modelos
   - Llena el selector
   
3. El botón es ahora "Refrescar" (opcional)
```

---

## Cómo funciona

### **1. Al abrir el diálogo:**
```
ProviderSetupDialog se abre
   ↓
Lee endpoint por defecto (ej: https://openrouter.ai/api/v1)
   ↓
Auto-ejecuta listLlmModels()
   ↓
Spinner: "Detectando modelos disponibles..."
   ↓
Se cargan los modelos automáticamente
```

### **2. Cuando cambias el endpoint:**
```
Escribes en campo endpoint
   ↓
Espera 800ms (debounce - para que termines de escribir)
   ↓
Auto-ejecuta listLlmModels()
   ↓
Spinner: "Detectando modelos..."
   ↓
Dropdown se llena automáticamente
```

### **3. Estados visuales:**

| Estado | Qué ves | Acción |
|--------|---------|--------|
| 📝 Sin cargar | "Cargando modelos automáticamente cuando cambies endpoint..." | Esperar o cambiar endpoint |
| ⏳ Cargando | Spinner + "Detectando modelos..." | Esperar |
| ✅ Con modelos | Dropdown con opciones | Seleccionar modelo |
| ❌ Error | Mensaje rojo | Revisar endpoint/API key |

---

## Flujo paso a paso: OpenRouter

```
1. Click "Agregar Proveedor" → OpenRouter
   ↓
2. Se abre ProviderSetupDialog con:
   - Nombre: OpenRouter
   - Endpoint: https://openrouter.ai/api/v1 ✅ (pre-llenado)
   - API key: [tu-clave] ✅
   - Modelo activo: ⏳ Spinner "Detectando modelos..."
   ↓
3. Después de 2-3 segundos:
   - ✅ Spinner desaparece
   - ✅ Dropdown aparece con modelos:
     - gpt-4
     - gpt-3.5-turbo
     - mistral-7b
     - claude-opus-4
     - etc.
   ↓
4. Automáticamente:
   - Se selecciona el primer modelo
   ✓ Modelo activo: "gpt-3.5-turbo"
   ↓
5. Click "Guardar proveedor"
```

---

## Cambios en la UI

### Botón "Probar y cargar" → "Refrescar"

**Antes:**
- Botón principal para cargar modelos
- Obligatorio hacer click

**Ahora:**
- Botón "Refrescar" (opcional)
- Solo si quieres recargar después de cambiar endpoint
- O si hubo error y quieres reintentar

### Mensaje de información

**Antes:**
```
"Al guardar, GeoNexus debe persistir la configuracion LLM y usar keychain cuando exista clave segura."
```

**Ahora:**
```
"Los modelos se detectan automáticamente al cambiar endpoint. 
Luego GeoNexus guardará la configuración en keychain cuando exista clave segura."
```

---

## Patrón técnico (basado en Odysseus)

### 1. **useEffect on mount & endpoint change:**
```typescript
React.useEffect(() => {
  const timer = setTimeout(() => {
    if (endpoint.trim() && !loadingModels) {
      autoLoadModels(option?.id || "", endpoint)
    }
  }, 800) // Debounce: espera 800ms
  
  return () => clearTimeout(timer)
}, [endpoint, option]) // Cuando cambia endpoint
```

### 2. **Auto-load sin mostrar error:**
```typescript
const autoLoadModels = async (providerId, endpointUrl) => {
  // ... fetch models ...
  
  if (result.status === "ok") {
    setModels(result.models)
    // Auto-selecciona primer modelo
    if (result.models.length > 0 && !model) {
      setModel(result.models[0])
    }
  }
  // Silencioso en error - no muestra alert
}
```

### 3. **Detección automática de proveedor:**
El backend (router.py) ya detecta:
- `localhost:11434` → Ollama
- `openrouter.ai` → OpenRouter
- `api.openai.com` → OpenAI
- `api.anthropic.com` → Anthropic
- etc.

---

## Casos de uso

### Caso 1: Nuevo usuario, OpenRouter
```
1. Click "Agregar Proveedor"
2. Selecciona OpenRouter
3. Ingresa API key: sk-or-...
4. ✅ Automáticamente se cargan modelos
5. Click "Guardar"
```

### Caso 2: Cambio de endpoint
```
1. Estoy en endpoint local: http://localhost:11434
2. Cambio a: http://192.168.1.100:11434
3. ⏳ Se refresca automáticamente
4. ✅ Carga modelos del nuevo host
```

### Caso 3: Necesito refrescar (conexión falló)
```
1. Error: "No se pudieron conectar"
2. Hago click "Refrescar"
3. ⏳ Spinner
4. ✅ Reintenta cargar
```

---

## Comparación: GeoNexus vs Odysseus

| Aspecto | Odysseus | GeoNexus (ahora) |
|---------|----------|-----------------|
| **Detección automática** | ✅ Sí | ✅ Sí |
| **Debounce** | ✅ Sí | ✅ 800ms |
| **Cache persistente** | ✅ Sí (BD) | ⏳ Pendiente |
| **Refresh manual** | ✅ Sí | ✅ Botón "Refrescar" |
| **Auto-select primer modelo** | ✅ Sí | ✅ Sí |
| **Fallback inteligente** | ✅ Sí | ⏳ Pendiente |

---

## Checklist para probar

- [ ] Ejecuto `npm run tauri dev`
- [ ] Voy a AiContainersPage
- [ ] Click "Agregar Proveedor"
- [ ] Selecciono OpenRouter (o cualquiera)
- [ ] Se abre diálogo con endpoint pre-llenado
- [ ] ⏳ Veo spinner "Detectando modelos..."
- [ ] ✅ Después de 2-3 seg: dropdown con modelos
- [ ] 🎯 Primer modelo ya seleccionado
- [ ] Click "Guardar proveedor"

---

## Próximos pasos

1. **Cache persistente:** Guardar modelos en SQLite para evitar re-fetch
2. **Refresh background:** Actualizar modelos periódicamente (como Odysseus)
3. **Fallback inteligente:** Si falla, probar con modelo "genérico"
4. **Detección mejorada:** Por headers HTTP también (no solo hostname)

---

¿Te gusta el patrón de auto-detección? 🚀
