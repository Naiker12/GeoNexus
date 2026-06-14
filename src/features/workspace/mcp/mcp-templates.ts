export const MCP_SERVER_TEMPLATES: Record<string, object> = {
  memory: {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  },
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
  qgis: {
    "command": "npx",
    "args": ["mcp-stdio-http-proxy", "--url", "http://localhost:3002/mcp"]
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
    "memory-mcp": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "disabled": false
    },
    "qgis-mcp": {
      "command": "npx",
      "args": ["mcp-stdio-http-proxy", "--url", "http://localhost:3002/mcp"],
      "disabled": false
    },
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
