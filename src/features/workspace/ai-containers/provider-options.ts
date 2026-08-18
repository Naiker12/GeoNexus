import {
  BotIcon,
  BrainCircuitIcon,
  CloudIcon,
  CpuIcon,
  GlobeIcon,
  KeyRoundIcon,
  ServerIcon,
  SparklesIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type ProviderCategory = "all" | "local" | "cloud" | "gateway" | "custom"

export type ProviderOption = {
  id: string
  name: string
  category: "local" | "cloud" | "gateway" | "custom"
  type: "local" | "cloud" | "mcp" | "custom"
  role: "chat" | "embedding" | "tool-router" | "multimodal"
  auth: "none" | "api-key" | "optional"
  defaultEndpoint: string
  defaultModel: string
  description: string
  docsUrl: string
  quickGuide: string
  icon: LucideIcon
  popularModels: string[]
}

export const providerOptions: ProviderOption[] = [
  // ─── LOCALES / OFFLINE ───
  {
    id: "ollama",
    name: "Ollama",
    category: "local",
    type: "local",
    role: "chat",
    auth: "none",
    defaultEndpoint: "http://localhost:11434",
    defaultModel: "llama3.3",
    description: "Servidor local offline-first con soporte para GGUF y modelos open-source.",
    docsUrl: "https://ollama.com",
    quickGuide:
      "Instala Ollama y ejecuta `ollama run llama3.3` o `ollama run deepseek-r1:8b` en tu terminal.",
    icon: TerminalIcon,
    popularModels: [
      "llama3.3",
      "deepseek-r1:8b",
      "deepseek-r1:14b",
      "qwen2.5-coder:7b",
      "mistral",
      "gemma2:9b",
      "nomic-embed-text",
    ],
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    category: "local",
    type: "local",
    role: "chat",
    auth: "none",
    defaultEndpoint: "http://localhost:1234/v1",
    defaultModel: "local-model",
    description: "Servidor local con aceleración GPU (CUDA/Metal) y API compatible con OpenAI.",
    docsUrl: "https://lmstudio.ai",
    quickGuide:
      "Abre LM Studio, descarga un modelo y activa el 'Local Inference Server' en el puerto 1234.",
    icon: TerminalIcon,
    popularModels: [
      "local-model",
      "deepseek-r1",
      "meta-llama-3.1-8b-instruct",
      "qwen2.5-coder-7b-instruct",
    ],
  },
  {
    id: "vllm",
    name: "vLLM / Servidor Local",
    category: "local",
    type: "local",
    role: "chat",
    auth: "optional",
    defaultEndpoint: "http://localhost:8000/v1",
    defaultModel: "default",
    description: "Motor de inferencia de alto rendimiento con PagedAttention para GPUs dedicadas.",
    docsUrl: "https://docs.vllm.ai",
    quickGuide:
      "Inicia el servidor con `python -m vllm.entrypoints.openai.api_server --model <modelo>`.",
    icon: CpuIcon,
    popularModels: ["default", "meta-llama/Llama-3.3-70B-Instruct", "Qwen/Qwen2.5-32B-Instruct"],
  },

  // ─── CLOUD / APIs COMERCIALES ───
  {
    id: "openai",
    name: "OpenAI",
    category: "cloud",
    type: "cloud",
    role: "multimodal",
    auth: "api-key",
    defaultEndpoint: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    description:
      "Modelos líderes de OpenAI con visión multimodal, llamadas a herramientas y embeddings.",
    docsUrl: "https://platform.openai.com/api-keys",
    quickGuide: "Obtén tu API Key en platform.openai.com y asegúrate de tener créditos activos.",
    icon: BotIcon,
    popularModels: [
      "gpt-4o",
      "gpt-4o-mini",
      "o3-mini",
      "o1",
      "text-embedding-3-small",
      "text-embedding-3-large",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    category: "cloud",
    type: "cloud",
    role: "multimodal",
    auth: "api-key",
    defaultEndpoint: "https://api.anthropic.com",
    defaultModel: "claude-3-7-sonnet-20250219",
    description:
      "Razonamiento híbrido profundo, ventana de contexto extendida (200k) y codificación puntera.",
    docsUrl: "https://console.anthropic.com/settings/keys",
    quickGuide:
      "Genera tu clave en console.anthropic.com. Compatible con Claude 3.7 Sonnet con razonamiento.",
    icon: BrainCircuitIcon,
    popularModels: [
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    category: "cloud",
    type: "cloud",
    role: "multimodal",
    auth: "api-key",
    defaultEndpoint: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    description:
      "Modelos multimodales de Google con ventana de contexto de hasta 2M tokens y baja latencia.",
    docsUrl: "https://aistudio.google.com/app/apikey",
    quickGuide: "Consigue tu API Key gratuita en Google AI Studio (aistudio.google.com).",
    icon: SparklesIcon,
    popularModels: [
      "gemini-2.0-flash",
      "gemini-2.0-pro-exp-02-05",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "text-embedding-004",
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    category: "cloud",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    description:
      "Modelos de razonamiento y código de última generación (V3 y R1) a costo ultra accesible.",
    docsUrl: "https://platform.deepseek.com/api_keys",
    quickGuide:
      "Crea una clave API en platform.deepseek.com para utilizar DeepSeek-V3 y DeepSeek-R1.",
    icon: CloudIcon,
    popularModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "kimi",
    name: "Kimi / Moonshot AI",
    category: "cloud",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-128k",
    description:
      "Modelos Kimi de Moonshot AI especializados en análisis de contextos ultralargos (128k a 2M tokens) y razonamiento.",
    docsUrl: "https://platform.moonshot.cn/docs",
    quickGuide:
      "Obtén tu clave en platform.moonshot.cn. Compatible con la especificación de API de OpenAI.",
    icon: SparklesIcon,
    popularModels: ["moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k", "moonshot-v1-auto"],
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    category: "cloud",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.3-70b-instruct",
    description:
      "Microservicios de inferencia acelerada de NVIDIA (NIM) para Llama 3.3, DeepSeek R1 y Nemotron.",
    docsUrl: "https://build.nvidia.com",
    quickGuide:
      "Crea una cuenta en build.nvidia.com y genera tu API key (`nvapi-...`) con créditos gratuitos de prueba.",
    icon: CpuIcon,
    popularModels: [
      "meta/llama-3.3-70b-instruct",
      "deepseek-ai/deepseek-r1",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mistral-large-2-instruct",
      "qwen/qwen2.5-coder-32b-instruct",
    ],
  },
  {
    id: "groq",
    name: "Groq",
    category: "cloud",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    description: "Inferencia ultra veloz (500+ tokens/seg) en chips LPU para modelos Open Source.",
    docsUrl: "https://console.groq.com/keys",
    quickGuide:
      "Genera tu API key en console.groq.com. Ofrece niveles gratuitos de alta velocidad.",
    icon: ZapIcon,
    popularModels: [
      "llama-3.3-70b-versatile",
      "deepseek-r1-distill-llama-70b",
      "mixtral-8x7b-32768",
      "qwen-2.5-32b",
      "gemma2-9b-it",
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    category: "cloud",
    type: "cloud",
    role: "multimodal",
    auth: "api-key",
    defaultEndpoint: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    description:
      "Modelos de IA europeos de alto rendimiento: Mistral Large, Codestral y Pixtral con visión.",
    docsUrl: "https://console.mistral.ai/api-keys",
    quickGuide:
      "Crea tu API Key en console.mistral.ai para acceder a los endpoints comerciales y abiertos de Mistral.",
    icon: CloudIcon,
    popularModels: [
      "mistral-large-latest",
      "codestral-latest",
      "pixtral-large-latest",
      "ministral-8b-latest",
      "mistral-embed",
    ],
  },
  {
    id: "xai",
    name: "xAI Grok",
    category: "cloud",
    type: "cloud",
    role: "multimodal",
    auth: "api-key",
    defaultEndpoint: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    description: "Modelos Grok de xAI con visión e información en tiempo real.",
    docsUrl: "https://console.x.ai",
    quickGuide:
      "Genera tu API Key en console.x.ai para conectar los modelos Grok 2 y Grok 2 Vision.",
    icon: BotIcon,
    popularModels: ["grok-2-latest", "grok-2-vision-latest"],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    category: "cloud",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.perplexity.ai",
    defaultModel: "sonar-pro",
    description:
      "Modelos Sonar con búsqueda y citación web en tiempo real integrada en cada respuesta.",
    docsUrl: "https://docs.perplexity.ai",
    quickGuide:
      "Obtén tu API Key en tu cuenta de Perplexity API para usar modelos con búsqueda web activa.",
    icon: GlobeIcon,
    popularModels: ["sonar-pro", "sonar", "sonar-reasoning"],
  },
  {
    id: "cohere",
    name: "Cohere",
    category: "cloud",
    type: "cloud",
    role: "embedding",
    auth: "api-key",
    defaultEndpoint: "https://api.cohere.ai/v1",
    defaultModel: "command-r-plus",
    description: "Modelos Command R+ empresariales y embeddings multilingües de alta precisión.",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    quickGuide:
      "Obtén tu clave en dashboard.cohere.com para chat, Rerank y embeddings multilingües.",
    icon: CloudIcon,
    popularModels: ["command-r-plus", "command-r", "embed-multilingual-v3.0", "embed-english-v3.0"],
  },
  {
    id: "cerebras",
    name: "Cerebras Cloud",
    category: "cloud",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.cerebras.ai/v1",
    defaultModel: "llama3.3-70b",
    description:
      "Velocidad de generación extrema (2,000+ tokens/seg) en hardware Wafer-Scale Engine.",
    docsUrl: "https://cloud.cerebras.ai",
    quickGuide:
      "Genera tu API key en cloud.cerebras.ai para obtener la menor latencia de inferencia del mercado.",
    icon: ZapIcon,
    popularModels: ["llama3.3-70b", "llama3.1-8b", "deepseek-r1-distill-llama-70b"],
  },
  {
    id: "qwen",
    name: "Alibaba DashScope (Qwen)",
    category: "cloud",
    type: "cloud",
    role: "multimodal",
    auth: "api-key",
    defaultEndpoint: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-max",
    description:
      "Familia de modelos Qwen 2.5 de Alibaba Cloud para razonamiento, código y visión multimodal.",
    docsUrl: "https://www.alibabacloud.com/help/en/model-studio",
    quickGuide:
      "Crea una API key en DashScope / Alibaba Model Studio y configúrala con el endpoint compatible OpenAI.",
    icon: CloudIcon,
    popularModels: [
      "qwen-max",
      "qwen-plus",
      "qwen-turbo",
      "qwen2.5-coder-32b-instruct",
      "qwen-vl-max",
    ],
  },

  // ─── GATEWAYS & ROUTERS MULTI-MODELO ───
  {
    id: "openrouter",
    name: "OpenRouter",
    category: "gateway",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.7-sonnet",
    description:
      "Gateway unificado con acceso a más de 300 modelos de OpenAI, Anthropic, Meta y DeepSeek con una sola API key.",
    docsUrl: "https://openrouter.ai/keys",
    quickGuide: "Crea tu clave en openrouter.ai/keys. Podrás enrutar cualquier modelo del mercado.",
    icon: CloudIcon,
    popularModels: [
      "anthropic/claude-3.7-sonnet",
      "deepseek/deepseek-r1",
      "openai/gpt-4o",
      "meta-llama/llama-3.3-70b-instruct",
      "google/gemini-2.0-flash-001",
    ],
  },
  {
    id: "together",
    name: "Together AI",
    category: "gateway",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    description:
      "Plataforma de inferencia cloud rápida para modelos Open Source con API compatible OpenAI.",
    docsUrl: "https://api.together.ai/settings/api-keys",
    quickGuide: "Genera tu API key en api.together.ai para ejecutar Llama, DeepSeek, Qwen y Flux.",
    icon: ServerIcon,
    popularModels: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "deepseek-ai/DeepSeek-R1",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    category: "gateway",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/deepseek-r1",
    description:
      "Motor de inferencia de ultra baja latencia optimizado para DeepSeek R1, Llama 3.3 y modelos Function Calling.",
    docsUrl: "https://fireworks.ai/api-keys",
    quickGuide: "Obtén tu API key en fireworks.ai/api-keys para inferencia de alto rendimiento.",
    icon: ZapIcon,
    popularModels: [
      "accounts/fireworks/models/deepseek-r1",
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/qwen2p5-coder-32b-instruct",
    ],
  },
  {
    id: "sambanova",
    name: "SambaNova Cloud",
    category: "gateway",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api.sambanova.ai/v1",
    defaultModel: "DeepSeek-R1",
    description:
      "Inferencia full-precision en chips SN40L Reconfigurable Dataflow Unit a velocidad récord.",
    docsUrl: "https://cloud.sambanova.ai",
    quickGuide:
      "Genera tu API key en cloud.sambanova.ai para probar DeepSeek R1 y Llama 3.3 a más de 150 tps.",
    icon: CpuIcon,
    popularModels: ["DeepSeek-R1", "Meta-Llama-3.3-70B-Instruct", "Qwen2.5-Coder-32B-Instruct"],
  },
  {
    id: "huggingface",
    name: "Hugging Face Inference",
    category: "gateway",
    type: "cloud",
    role: "chat",
    auth: "api-key",
    defaultEndpoint: "https://api-inference.huggingface.co/v1",
    defaultModel: "Qwen/Qwen2.5-72B-Instruct",
    description:
      "Inferencia Serverless y Dedicated Endpoints para miles de modelos en Hugging Face.",
    docsUrl: "https://huggingface.co/settings/tokens",
    quickGuide:
      "Crea un User Access Token (con permisos de lectura) en huggingface.co/settings/tokens.",
    icon: BotIcon,
    popularModels: [
      "Qwen/Qwen2.5-72B-Instruct",
      "meta-llama/Llama-3.3-70B-Instruct",
      "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    ],
  },

  // ─── PERSONALIZADO ───
  {
    id: "custom-api",
    name: "Endpoint Compatible OpenAI",
    category: "custom",
    type: "custom",
    role: "chat",
    auth: "optional",
    defaultEndpoint: "http://localhost:8080/v1",
    defaultModel: "default",
    description:
      "Conecta cualquier servidor o proxy compatible con la especificación /v1 de OpenAI (llama.cpp, FastChat, Ollama, etc.).",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    quickGuide:
      "Ingresa la URL base de tu servidor (ej. http://localhost:8080/v1) y el nombre del modelo configurado.",
    icon: KeyRoundIcon,
    popularModels: ["default", "custom-model"],
  },
]
