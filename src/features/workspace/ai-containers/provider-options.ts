import {
  BotIcon,
  BrainCircuitIcon,
  CloudIcon,
  KeyRoundIcon,
  ServerIcon,
  TerminalIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type ProviderOption = {
  id: string
  name: string
  type: "local" | "cloud" | "mcp" | "custom"
  role: "chat" | "embedding" | "tool-router"
  auth: "none" | "api-key" | "optional"
  defaultEndpoint: string
  defaultModel: string
  description: string
  icon: LucideIcon
  models: string[]
}

export const providerOptions: ProviderOption[] = [
  {
    id: "ollama",
    name: "Ollama",
    type: "local",
    role: "chat",
    auth: "none",
    defaultEndpoint: "http://localhost:11434",
    defaultModel: "llama3.1",
    description: "Proveedor local offline-first detectado por puerto 11434.",
    icon: TerminalIcon,
    models: ["llama3.1", "mistral", "qwen2", "phi3"],
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    type: "local",
    role: "chat",
    auth: "none",
    defaultEndpoint: "http://localhost:1234/v1",
    defaultModel: "OpenAI compatible",
    description: "Servidor local compatible con OpenAI API.",
    icon: TerminalIcon,
    models: ["openai-compatible", "gguf-local"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    defaultModel: "claude-3.5-sonnet",
    description: "Gateway multi-modelo para GPT, Claude y Gemini.",
    icon: CloudIcon,
    models: ["claude-3.5-sonnet", "gpt-4o", "gemini-1.5-pro"],
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    description: "API directa para chat, tool-calls y embeddings cloud.",
    icon: BotIcon,
    models: ["gpt-4o", "gpt-4-turbo", "text-embedding-3-large"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.anthropic.com",
    defaultModel: "claude-3.5-sonnet",
    description: "Modelos Claude para razonamiento y contexto largo.",
    icon: BrainCircuitIcon,
    models: ["claude-3.5-sonnet", "claude-3-opus"],
  },
  {
    id: "memory-mcp",
    name: "Memory MCP",
    type: "mcp",
    role: "tool-router",
    auth: "optional",
    defaultEndpoint: "http://localhost:7011",
    defaultModel: "pot_normas",
    description: "Memoria semantica, normas POT y contexto de proyecto.",
    icon: ServerIcon,
    models: ["pot_normas", "project_memory", "gis_knowledge"],
  },
  {
    id: "custom-api",
    name: "API compatible",
    type: "custom",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.proveedor.com/v1",
    defaultModel: "modelo-personalizado",
    description: "Conecta cualquier endpoint compatible con OpenAI /v1.",
    icon: KeyRoundIcon,
    models: ["custom-model"],
  },
]
