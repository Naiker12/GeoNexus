export interface McpSetupGuide {
  message: string
  docsUrl?: string
  tokenField?: string
  tokenFormat?: string
  command?: string
}

export const MCP_SETUP_GUIDES: Record<string, McpSetupGuide> = {
  supabase: {
    message:
      "Genera un Personal Access Token en supabase.com/dashboard/account/tokens y agrégalo en la configuración del servidor.",
    docsUrl: "https://supabase.com/dashboard/account/tokens",
    tokenField: "Authorization",
    tokenFormat: "Bearer sbp_...",
  },
  "memory-mcp": {
    message:
      "Inicia el servidor localmente: npx @modelcontextprotocol/server-memory --port 3001",
    command: "npx @modelcontextprotocol/server-memory --port 3001",
  },
  "qgis-mcp": {
    message: "Inicia QGIS MCP en el puerto 3002. Requiere QGIS instalado.",
    command: "python -m qgis_mcp --port 3002",
  },
}

export const DEFAULT_GUIDE: McpSetupGuide = {
  message:
    "Verifica que el servidor esté iniciado y la URL/comando sean correctos.",
}

export function getSetupGuide(serverId: string): McpSetupGuide {
  return MCP_SETUP_GUIDES[serverId] ?? DEFAULT_GUIDE
}
