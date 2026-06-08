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
    defaultEndpoint: "",
    defaultModel: "",
    description: "Proveedor local offline-first detectado por puerto 11434.",
    icon: TerminalIcon,
    models: [],
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    type: "local",
    role: "chat",
    auth: "none",
    defaultEndpoint: "",
    defaultModel: "",
    description: "Servidor local compatible con OpenAI API.",
    icon: TerminalIcon,
    models: [],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "",
    defaultModel: "",
    description: "Gateway multi-modelo configurable mediante API key.",
    icon: CloudIcon,
    models: [],
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "",
    defaultModel: "",
    description: "API directa para chat, tool-calls y embeddings cloud.",
    icon: BotIcon,
    models: [],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "",
    defaultModel: "",
    description: "Proveedor cloud configurable para razonamiento y contexto largo.",
    icon: BrainCircuitIcon,
    models: [],
  },
  {
    id: "memory-mcp",
    name: "Memory MCP",
    type: "mcp",
    role: "tool-router",
    auth: "optional",
    defaultEndpoint: "",
    defaultModel: "",
    description: "Memoria semantica y contexto de proyecto configurable.",
    icon: ServerIcon,
    models: [],
  },
  {
    id: "custom-api",
    name: "API compatible",
    type: "custom",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "",
    defaultModel: "",
    description: "Conecta cualquier endpoint compatible con OpenAI /v1.",
    icon: KeyRoundIcon,
    models: [],
  },
]
