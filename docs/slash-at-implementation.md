# Implementación: Slash Commands `/` y Menciones `@`

## Resumen de cambios

### Problema original
- El `/` no hacía nada — solo se escribía como texto normal
- El `@` mostraba datos incorrectos (conectores IA como Ollama/OpenAI en vez de conectores de datos reales)
- El placeholder era confuso
- La navegación por teclado en el MentionPicker no funcionaba (ArrowUp/ArrowDown/Enter atrapados por el textarea)

### Archivos modificados/creadoscontinur

#### Frontend (TypeScript/React)

| Archivo | Cambio |
|---------|--------|
| `src/types/chat.ts` | Nuevos tipos: `SlashCommand`, `SlashCommandGroup`, `MentionSource`, `MentionKind`, `MentionableSourceItem`, `MentionableSourcesResponse`. `SendMessageInput` extendido con `mentioned_asset_ids`, `mentioned_connector_ids`, `mentioned_node_ids` |
| `src/components/chat/CommandPalette.tsx` | **NUEVO** - Popup de comandos `/` con 9 comandos en 4 grupos, filtro en tiempo real, navegación teclado |
| `src/components/chat/MentionPicker.tsx` | **REESCRITO** - Acepta `MentionSource[]` externo, muestra por categorías (conectores/assets/grafo), colores por tipo |
| `src/components/chat/ChatComposer.tsx` | **REESCRITO** - Detecta `/` y `@`, maneja ambos popups, barra de chips separada, placeholder actualizado, submit pasa `{assetIds, connectorIds, nodeIds}`. Llama a `get_mentionable_sources()` via API para poblar el picker con datos reales de la DB |
| `src/components/chat/ChatPanel.tsx` | Slash commands conectados: nuevo chat, limpiar, exportar como Markdown, reindexar |
| `src/components/chat/useChatSession.ts` | `submit()` acepta `mentions?` y los pasa como `mentioned_*_ids` en `SendMessageInput` |
| `src/api/chat.ts` | Nueva función `getMentionableSources(projectId, query?)` que llama al comando Tauri |

#### Backend (Rust)

| Archivo | Cambio |
|---------|--------|
| `crates/geonexus-core/src/chat.rs` | `SendMessageInput` extendido con `mentioned_asset_ids`, `mentioned_connector_ids`, `mentioned_node_ids` |
| `crates/geonexus-tauri/src/commands/data.rs` | **NUEVO** comando `get_mentionable_sources()` - retorna conectores + assets + nodos del grafo desde la DB |
| `crates/geonexus-tauri/src/commands/chat/send_message.rs` | Contexto de menciones inyectado en el prompt del LLM. RAG recall prioriza assets/conectores mencionados |

### Cómo funciona

#### `/` — Command Palette
- Se activa al escribir `/` al inicio del mensaje o después de un espacio
- Muestra popup con comandos agrupados: Contexto, Chat, Modo, Sistema
- Filtra en tiempo real mientras escribes (`/rei` → "Reindexar")
- Navegación: `↑` `↓` `Enter` `Escape`
- Al ejecutar, el `/` y el texto del comando se borran del textarea

#### `@` — Mention Picker
- Se activa al escribir `@` en cualquier posición
- Al montar `ChatComposer`, llama a `get_mentionable_sources("project-default")` vía Tauri
- Muestra datos reales desde la DB:
  - Conectores de datos desde `connector_configs` (OneDrive, carpeta local...)
  - Assets indexados desde `assets`
  - Nodos del grafo desde `graph_nodes`
- Si no hay datos en la DB, el picker no muestra nada (sin datos falsos)

#### Chips (barra de adjuntos)
- Los seleccionados aparecen como chips sobre el textarea
- Color por tipo: conectores azul, assets violeta, nodos ámbar
- Botón `×` para remover
- Al enviar, se convierten a `@[label](kind:id)` en el texto y se pasan como `mentioned_*_ids` al backend

### Pendiente
1. **Menú `+` con badges de estado** — el ToolMenu actual no muestra conectores de datos con sus estados (ACTIVO/CONECTAR/ERROR/SYNC)
2. **Mini-panel expandible** al hacer click en un conector activo del menú `+`
3. **Probar `cargo build` completo** con los nuevos campos en `SendMessageInput`
4. **Pruebas manuales** de ambos popups con datos reales
