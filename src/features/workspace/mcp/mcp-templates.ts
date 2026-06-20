export const MCP_SERVER_TEMPLATES: Record<string, object> = {
  filesystem: {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/ruta/a/tus/archivos"
    ]
  },
  supabase: {
    "type": "http",
    "url": "https://mcp.supabase.com/mcp",
    "headers": {
      "Authorization": "Bearer TU_SUPABASE_PAT_AQUI"
    },
    "timeout": 10000
  },
  github: {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "TU_GITHUB_TOKEN"
    }
  },
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
      "BRAVE_API_KEY": "TU_BRAVE_API_KEY"
    }
  }
}

export const GEONEXUS_MCP_TEMPLATE = `{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer TU_PAT_DE_SUPABASE"
      },
      "timeout": 10000,
      "disabled": false
    }
  }
}`
