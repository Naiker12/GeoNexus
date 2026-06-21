import { listDataAssets, getDataAsset, indexDocument, listDocumentChunks, listGraphNodes, searchGraphNodes } from "@/api/data"
import type { DataAsset, DocumentChunk } from "@/types/data"
import type { GraphNode } from "@/types/graph"

export type SlashCommand = {
  command: string
  description: string
  params: string
  example: string
  category: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/ayuda", description: "Muestra todos los comandos disponibles", params: "", example: "/ayuda", category: "General" },
  { command: "/limpiar", description: "Limpia el historial de la conversación actual", params: "", example: "/limpiar", category: "General" },
  { command: "/grafica", description: "Genera una gráfica con los datos proporcionados", params: "[tipo] [datos]", example: "/grafica barras JS 65 Python 58", category: "Gráficas" },
  { command: "/chart", description: "Alias de /grafica, genera visualización de datos", params: "[tipo] [datos]", example: "/chart pastel JS 65 Python 58", category: "Gráficas" },
  { command: "/mapa", description: "Abre o consulta información en el mapa interactivo", params: "[consulta]", example: "/mapa zona Z1", category: "GIS" },
  { command: "/capa", description: "Muestra información sobre una capa GIS específica", params: "[nombre]", example: "/capa estratificación", category: "GIS" },
  { command: "/zona", description: "Consulta información de una zona territorial", params: "[nombre]", example: "/zona Zona Residencial Z1", category: "GIS" },
  { command: "/norma", description: "Busca normas o artículos del plan de ordenamiento", params: "[búsqueda]", example: "/norma alturas máximas", category: "Normas" },
  { command: "/documento", description: "Muestra contenido de un documento indexado", params: "[id]", example: "/documento doc-123", category: "Documentos" },
  { command: "/grafo", description: "Abre la red de conocimiento o consulta un nodo", params: "[nodo_id]", example: "/grafo node-zona-1", category: "Conocimiento" },
  { command: "/nodo", description: "Muestra el detalle de un nodo del grafo", params: "[id]", example: "/nodo node-norma-1", category: "Conocimiento" },
  { command: "/analizar", description: "Analiza un documento con IA", params: "[id]", example: "/analizar doc-456", category: "Análisis" },
  { command: "/resumir", description: "Genera un resumen del documento o conversación", params: "[id]", example: "/resumir doc-456", category: "Análisis" },
  { command: "/buscar", description: "Busca en todos los documentos indexados", params: "[términos]", example: "/buscar uso del suelo", category: "Búsqueda" },
  { command: "/conectar", description: "Conecta fuente de datos externa (WMS, shapefile)", params: "[tipo] [url]", example: "/conectar wms https://ejemplo.com/wms", category: "Datos" },
  { command: "/exportar", description: "Exporta resultado en JSON, CSV o PDF", params: "[formato]", example: "/exportar csv", category: "Datos" },
  { command: "/gis", description: "Abre el panel de herramientas GIS", params: "", example: "/gis", category: "GIS" },
  { command: "/ia", description: "Abre configuración de modelos de IA", params: "[modelo]", example: "/ia gpt-4o", category: "IA" },
]

export type SlashResult =
  | { handled: true; type: "message"; content: string }
  | { handled: true; type: "action"; action: string }
  | { handled: false }

export function handleSlashCommand(
  text: string,
): SlashResult {
  const trimmed = text.trim()
  if (!trimmed.startsWith("/")) return { handled: false }

  const parts = trimmed.slice(1).split(/\s+/)
  const cmdName = parts[0].toLowerCase()

  const cmd = SLASH_COMMANDS.find(c => c.command === `/${cmdName}`)
  if (!cmd) return { handled: false }

  switch (cmdName) {
    case "ayuda": {
      const lines = SLASH_COMMANDS.map(c => {
        const params = c.params ? ` ${c.params}` : ""
        const ejemplo = c.example ? `  ej: ${c.example}` : ""
        return `  \`${c.command}${params}\` — ${c.description}${ejemplo}`
      })
      return {
        handled: true,
        type: "message",
        content: `## Comandos disponibles\n\n${lines.join("\n")}\n\n_Escribe /comando seguido de los parámetros necesarios._`,
      }
    }

    case "limpiar":
      return { handled: true, type: "action", action: "clear" }

    default:
      return { handled: false }
  }
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "—"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    indexing: "Indexando",
    ready: "Listo",
    conflict: "Conflicto",
    error: "Error",
  }
  return map[status] ?? status
}

export async function handleAsyncSlashCommand(
  text: string
): Promise<SlashResult> {
  const trimmed = text.trim()
  if (!trimmed.startsWith("/")) return { handled: false }

  const parts = trimmed.slice(1).split(/\s+/)
  const cmdName = parts[0].toLowerCase()
  const args = parts.slice(1).join(" ")

  const cmd = SLASH_COMMANDS.find(c => c.command === `/${cmdName}`)
  if (!cmd) return { handled: false }

  switch (cmdName) {
    case "documento": {
      if (!args) {
        const assets = await listDataAssets()
        const docs = assets.filter(a => ["document", "word", "excel"].includes(a.kind))
        if (docs.length === 0) {
          return { handled: true, type: "message", content: "No hay documentos indexados. Usa la sección **Documentos** para subir e indexar archivos." }
        }
        const rows = docs.map(d =>
          `  • \`${d.id}\` — **${d.name}** (${statusLabel(d.status)}, ${d.chunks} fragmentos)`
        )
        return {
          handled: true,
          type: "message",
          content: `## Documentos disponibles\n\n${rows.join("\n")}\n\nUsa \`/documento [id]\` para ver el detalle de un documento.`,
        }
      }
      const doc = await getDataAsset(args)
      if (!doc) {
        return { handled: true, type: "message", content: `No se encontró el documento \`${args}\`. Usa \`/documento\` para listar los disponibles.` }
      }
      const chunks = await listDocumentChunks(args)
      const previewLines = chunks.slice(0, 3).map(c =>
        `  _Fragmento ${c.chunk_index}${c.page_number ? ` (pág. ${c.page_number})` : ""}:_ ${c.content.slice(0, 200)}${c.content.length > 200 ? "…" : ""}`
      )
      return {
        handled: true,
        type: "message",
        content: [
          `## ${doc.name}`,
          ``,
          `**ID:** \`${doc.id}\``,
          `**Estado:** ${statusLabel(doc.status)}`,
          `**Tamaño:** ${formatSize(doc.size_bytes)}`,
          `**Fragmentos:** ${doc.chunks}`,
          `**Embeddings:** ${doc.embeddings}`,
          `**Nodos en grafo:** ${doc.graph_nodes}`,
          doc.status === "ready" ? `**Vista previa:**` : `**Nota:** El documento aún no está indexado. Usa \`/analizar ${args}\` para indexarlo.`,
          ...(doc.status === "ready" ? previewLines : []),
        ].join("\n"),
      }
    }

    case "analizar": {
      if (!args) {
        const assets = await listDataAssets()
        const docs = assets.filter(a => ["document", "word", "excel", "pdf", "txt"].includes(a.kind) || a.status !== "ready")
        if (docs.length === 0) {
          return { handled: true, type: "message", content: "No hay documentos disponibles para analizar. Sube documentos desde la sección **Documentos**." }
        }
        const rows = docs.map(d =>
          `  • \`${d.id}\` — **${d.name}** (${statusLabel(d.status)})`
        )
        return {
          handled: true,
          type: "message",
          content: `## Documentos para analizar\n\nSelecciona uno con \`/analizar [id]\`:\n\n${rows.join("\n")}`,
        }
      }
      const doc = await getDataAsset(args)
      if (!doc) {
        return { handled: true, type: "message", content: `No se encontró el documento \`${args}\`. Usa \`/documento\` para listar los disponibles.` }
      }
      if (doc.status === "indexing") {
        return { handled: true, type: "message", content: `El documento **${doc.name}** ya está siendo indexado. Espera a que termine.` }
      }
      if (doc.status === "ready") {
        const chunks = await listDocumentChunks(args)
        const contentPreview = chunks.slice(0, 5).map(c =>
          `  _Fragmento ${c.chunk_index}${c.page_number ? ` (pág. ${c.page_number})` : ""}:_ ${c.content.slice(0, 250)}${c.content.length > 250 ? "…" : ""}`
        )
        return {
          handled: true,
          type: "message",
          content: [
            `## Análisis de: ${doc.name}`,
            ``,
            `**Fragmentos totales:** ${doc.chunks}`,
            `**Embeddings generados:** ${doc.embeddings}`,
            `**Nodos en grafo de conocimiento:** ${doc.graph_nodes}`,
            `**Tamaño:** ${formatSize(doc.size_bytes)}`,
            ``,
            `**Contenido:**`,
            ...contentPreview,
            ``,
            doc.chunks > 5 ? `_Mostrando 5 de ${doc.chunks} fragmentos. Usa \`/resumir ${args}\` para un resumen._` : "",
          ].join("\n"),
        }
      }
      return {
        handled: true,
        type: "message",
        content: `Indexando **${doc.name}**… Esto puede tomar unos momentos.\n\n_El documento está en estado "${statusLabel(doc.status)}". Una vez indexado, usa \`/analizar ${args}\` nuevamente para ver el análisis._`,
      }
    }

    case "resumir": {
      if (!args) {
        return { handled: true, type: "message", content: "Usa \`/resumir [id]\` con el ID del documento que quieres resumir. Ejemplo: \`/resumir doc-123\`\n\nUsa \`/documento\` para listar los documentos disponibles." }
      }
      const doc = await getDataAsset(args)
      if (!doc) {
        return { handled: true, type: "message", content: `No se encontró el documento \`${args}\`.` }
      }
      if (doc.status !== "ready") {
        return { handled: true, type: "message", content: `El documento **${doc.name}** no está indexado aún. Usa \`/analizar ${args}\` para indexarlo primero.` }
      }
      const chunks = await listDocumentChunks(args)
      if (chunks.length === 0) {
        return { handled: true, type: "message", content: `El documento **${doc.name}** no tiene fragmentos. Reindexa con \`/analizar ${args}\`.` }
      }
      const combined = chunks.map(c => c.content).join("\n\n")
      const summary = combined.length > 1500 ? combined.slice(0, 1500) + "…" : combined
      return {
        handled: true,
        type: "message",
        content: [
          `## Resumen de: ${doc.name}`,
          ``,
          `_${doc.chunks} fragmentos · ${doc.embeddings} embeddings · ${formatSize(doc.size_bytes)}_`,
          ``,
          summary,
          ``,
          `_Usa \`/documento ${args}\` para ver el detalle completo._`,
        ].join("\n"),
      }
    }

    case "buscar": {
      if (!args) {
        return { handled: true, type: "message", content: "Usa \`/buscar [términos]\` para buscar en todos los documentos indexados. Ejemplo: \`/buscar uso del suelo\`" }
      }
      const assets = await listDataAssets()
      const terms = args.toLowerCase().split(/\s+/)
      const matches = assets.filter(a => {
        if (a.status !== "ready") return false
        const text = `${a.name} ${a.source} ${a.location}`.toLowerCase()
        return terms.some(t => text.includes(t))
      })
      if (matches.length === 0) {
        return { handled: true, type: "message", content: `No se encontraron documentos que coincidan con "${args}".` }
      }
      const rows = matches.map(d =>
        `  • \`${d.id}\` — **${d.name}** (${d.chunks} fragmentos)`
      )
      return {
        handled: true,
        type: "message",
        content: `## Resultados de búsqueda: "${args}"\n\n${rows.join("\n")}\n\nUsa \`/documento [id]\` para ver el detalle.`,
      }
    }

    case "norma": {
      if (!args) {
        return { handled: true, type: "message", content: "Usa \`/norma [búsqueda]\` para buscar normas del plan de ordenamiento. Ejemplo: \`/norma alturas máximas\`" }
      }
      const result = await searchGraphNodes("project-default", args, "norma", 10)
      if (!result.nodes || result.nodes.length === 0) {
        return { handled: true, type: "message", content: `No se encontraron normas que coincidan con "${args}".` }
      }
      const rows = result.nodes.map((n: GraphNode) =>
        `  • \`${n.id}\` — **${n.label}**${n.description ? `: ${n.description.slice(0, 120)}` : ""}`
      )
      return {
        handled: true,
        type: "message",
        content: `## Normas encontradas: "${args}"\n\n${rows.join("\n")}\n\nUsa \`/nodo [id]\` para ver detalle completo.`,
      }
    }

    case "grafo": {
      if (args) {
        const result = await searchGraphNodes("project-default", args, undefined, 15)
        if (!result.nodes || result.nodes.length === 0) {
          return { handled: true, type: "message", content: `No se encontraron nodos que coincidan con "${args}".` }
        }
        const rows = result.nodes.map((n: GraphNode) =>
          `  • \`${n.id}\` — **${n.label}** (_${n.kind}_)${n.description ? `: ${n.description.slice(0, 100)}` : ""}`
        )
        return {
          handled: true,
          type: "message",
          content: `## Nodos del grafo: "${args}"\n\n${rows.join("\n")}\n\nUsa \`/nodo [id]\` para ver detalle completo.`,
        }
      }
      const nodes = await listGraphNodes()
      if (nodes.length === 0) {
        return { handled: true, type: "message", content: "El grafo de conocimiento está vacío. Indexa documentos para poblarlo." }
      }
      const counts: Record<string, number> = {}
      for (const n of nodes) {
        counts[n.kind] = (counts[n.kind] || 0) + 1
      }
      const summary = Object.entries(counts)
        .map(([kind, count]) => `  • **${kind}**: ${count} nodos`)
        .join("\n")
      const top = nodes.sort((a, b) => b.use_count - a.use_count).slice(0, 5)
      const topRows = top.map(n =>
        `  • \`${n.id}\` — **${n.label}** (usado ${n.use_count} veces)`
      )
      return {
        handled: true,
        type: "message",
        content: [
          `## Grafo de conocimiento`,
          ``,
          `**Total de nodos:** ${nodes.length}`,
          ``,
          `**Tipos de nodos:**`,
          summary,
          ``,
          `**Nodos más usados:**`,
          topRows.join("\n"),
          ``,
          `Usa \`/grafo [búsqueda]\` para buscar nodos o \`/nodo [id]\` para ver detalle.`,
        ].join("\n"),
      }
    }

    case "nodo": {
      if (!args) {
        return { handled: true, type: "message", content: "Usa \`/nodo [id]\` con el ID del nodo que quieres consultar. Ejemplo: \`/nodo node-norma-1\`\n\nUsa \`/grafo\` para listar nodos disponibles." }
      }
      const result = await searchGraphNodes("project-default", args, undefined, 5)
      const node = result.nodes?.find((n: GraphNode) => n.id === args || n.label.toLowerCase().includes(args.toLowerCase()))
      if (!node) {
        return { handled: true, type: "message", content: `No se encontró el nodo \`${args}\`. Usa \`/grafo\` para explorar.` }
      }
      return {
        handled: true,
        type: "message",
        content: [
          `## ${node.label}`,
          ``,
          `**ID:** \`${node.id}\``,
          `**Tipo:** ${node.kind}`,
          `**Uso:** ${node.use_count} veces`,
          `**Peso:** ${node.weight}`,
          node.description ? `**Descripción:** ${node.description}` : "",
          node.evidence ? `**Evidencia:** ${node.evidence.slice(0, 300)}${node.evidence.length > 300 ? "…" : ""}` : "",
        ].join("\n"),
      }
    }

    case "exportar": {
      const format = args.toLowerCase() || "md"
      if (!["json", "csv", "pdf", "md"].includes(format)) {
        return { handled: true, type: "message", content: `Formato no soportado: "${format}". Usa: json, csv, pdf o md.` }
      }
      return {
        handled: true,
        type: "message",
        content: [
          `## Exportar conversación`,
          ``,
          `Para exportar la conversación actual en formato **${format.toUpperCase()}**:`,
          `1. Abre el menú de opciones en el panel de chat`,
          `2. Selecciona "Exportar" y elige el formato`,
          ``,
          `O usa el botón de exportar en la barra superior del chat.`,
          ``,
          `_Los formatos compatibles son: JSON, CSV, PDF y Markdown._`,
        ].join("\n"),
      }
    }

    case "gis": {
      return {
        handled: true,
        type: "message",
        content: [
          `## Herramientas GIS`,
          ``,
          `Las herramientas GIS están disponibles en el panel lateral del workspace.`,
          ``,
          `**Comandos relacionados:**`,
          `  • \`/mapa [consulta]\` — Consultar mapa interactivo`,
          `  • \`/capa [nombre]\` — Info de capa GIS`,
          `  • \`/zona [nombre]\` — Consultar zona territorial`,
          ``,
          `_Nota: Los comandos GIS requieren datos cargados en el proyecto._`,
        ].join("\n"),
      }
    }

    case "ia": {
      return {
        handled: true,
        type: "message",
        content: [
          `## Configuración de IA`,
          ``,
          `Puedes configurar los modelos de IA desde la sección **Configuración → IA y Embeddings**.`,
          ``,
          `**Comandos relacionados:**`,
          `  • \`/ia [modelo]\` — Usar un modelo específico (ej: \`/ia gpt-4o\`)`,
          ``,
          `Modelos disponibles: los configurados en tus conectores de IA.`,
        ].join("\n"),
      }
    }

    case "conectar": {
      if (!args) {
        return { handled: true, type: "message", content: "Usa \`/conectar [tipo] [url]\` para conectar una fuente de datos externa.\n\n**Tipos soportados:**\n  • \`wms\` — Servicio WMS de mapas\n  • \`shapefile\` — Archivo shapefile\n  • \`folder\` — Carpeta local\n\nEjemplo: \`/conectar wms https://ejemplo.com/wms\`" }
      }
      const [type, ...rest] = args.split(/\s+/)
      const url = rest.join(" ")
      const typeUpper = type.toUpperCase()
      if (!["wms", "shapefile", "folder"].includes(type.toLowerCase())) {
        return { handled: true, type: "message", content: `Tipo "${type}" no soportado. Usa: wms, shapefile o folder.` }
      }
      return {
        handled: true,
        type: "message",
        content: [
          `## Conectar fuente ${typeUpper}`,
          ``,
          url ? `**URL/Ruta:** ${url}` : "_No se proporcionó URL_",
          ``,
          `Para conectar esta fuente:`,
          `1. Ve a **Configuración → Conectores**`,
          `2. Agrega un nuevo conector de tipo **${typeUpper}**`,
          `3. Ingresa la ruta o URL`,
          `4. Activa el conector y sincroniza`,
          ``,
          `_Una vez conectado, los datos aparecerán en la sección Documentos._`,
        ].join("\n"),
      }
    }

    default:
      return { handled: false }
  }
}
