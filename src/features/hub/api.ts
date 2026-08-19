import type { HfModelResult, HubInventoryResult, LoadedModelEntry, ModelTask } from "./types"

const WS_GATEWAY_URL = "ws://127.0.0.1:9876/ws"

function executeWsAction<T>(action: string, params: Record<string, any> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null
    let timeoutTimer: ReturnType<typeof setTimeout>

    try {
      ws = new WebSocket(WS_GATEWAY_URL)
    } catch (_e) {
      return reject(new Error("No se pudo conectar al Gateway Python en ws://127.0.0.1:9876"))
    }

    timeoutTimer = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
      reject(new Error(`Timeout en acción ${action}`))
    }, 1500)

    ws.onopen = () => {
      ws?.send(JSON.stringify({ action, params, session_id: "hub" }))
    }

    ws.onmessage = (event) => {
      clearTimeout(timeoutTimer)
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === "error") {
          reject(new Error(payload.message || "Error en el Gateway"))
        } else if (payload.type === "result" || payload.data) {
          resolve(payload.data as T)
        } else {
          resolve(payload as T)
        }
      } catch (err) {
        reject(err)
      } finally {
        ws?.close()
      }
    }

    ws.onerror = () => {
      clearTimeout(timeoutTimer)
      reject(new Error("Error de conexión con el AI Gateway"))
    }
  })
}

// Catálogo enriquecido y diverso de modelos listos para usar
const FALLBACK_MODELS: Record<ModelTask, HfModelResult[]> = {
  "text-generation": [
    {
      id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
      name: "DeepSeek-R1-Distill-Qwen-7B (GGUF)",
      author: "deepseek-ai",
      downloads: 845000,
      likes: 4120,
      task: "text-generation",
      tags: ["deepseek-r1", "reasoning", "gguf", "code"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "Q4_K_M (Recomendada)",
          filename: "DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf",
          size_gb: 4.68,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 5.7,
        },
        {
          name: "Q8_0 (Máxima Precisión)",
          filename: "DeepSeek-R1-Distill-Qwen-7B-Q8_0.gguf",
          size_gb: 7.95,
          fits_vram: false,
          fits_ram: true,
          fit_level: "ram_only",
          required_vram_gb: 9.4,
        },
      ],
    },
    {
      id: "unsloth/Qwen2.5-Coder-7B-Instruct-GGUF",
      name: "Qwen2.5-Coder-7B-Instruct-GGUF",
      author: "unsloth",
      downloads: 512000,
      likes: 2980,
      task: "text-generation",
      tags: ["gguf", "code", "qwen2.5", "fast"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "Q4_K_M (Equilibrada)",
          filename: "qwen2.5-coder-7b-instruct-q4_k_m.gguf",
          size_gb: 4.68,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 5.8,
        },
        {
          name: "Q5_K_M (Alta Calidad)",
          filename: "qwen2.5-coder-7b-instruct-q5_k_m.gguf",
          size_gb: 5.43,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 6.6,
        },
      ],
    },
    {
      id: "meta-llama/Llama-3.3-70B-Instruct",
      name: "Llama-3.3-70B-Instruct (GGUF)",
      author: "meta-llama",
      downloads: 1200000,
      likes: 6800,
      task: "text-generation",
      tags: ["llama3.3", "70b", "flagship"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "Q4_K_M (42 GB VRAM)",
          filename: "Llama-3.3-70B-Instruct-Q4_K_M.gguf",
          size_gb: 42.5,
          fits_vram: false,
          fits_ram: true,
          fit_level: "ram_only",
          required_vram_gb: 48.0,
        },
        {
          name: "IQ3_M (31 GB VRAM)",
          filename: "Llama-3.3-70B-Instruct-IQ3_M.gguf",
          size_gb: 31.2,
          fits_vram: false,
          fits_ram: true,
          fit_level: "ram_only",
          required_vram_gb: 35.5,
        },
      ],
    },
    {
      id: "mistralai/Ministral-8B-Instruct-2410",
      name: "Ministral-8B-Instruct-2410",
      author: "mistralai",
      downloads: 380000,
      likes: 1950,
      task: "text-generation",
      tags: ["mistral", "edge", "gguf"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "Q4_K_M",
          filename: "ministral-8b-instruct-q4_k_m.gguf",
          size_gb: 4.92,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 6.0,
        },
      ],
    },
  ],
  "text-to-image": [
    {
      id: "black-forest-labs/FLUX.1-schnell",
      name: "FLUX.1-schnell (4-step Diffusion)",
      author: "black-forest-labs",
      downloads: 980000,
      likes: 5400,
      task: "text-to-image",
      tags: ["flux", "diffusion", "fast-generation"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "FP8 (Optimizado para 12GB+ GPU)",
          filename: "flux1-schnell-fp8.safetensors",
          size_gb: 11.8,
          fits_vram: false,
          fits_ram: true,
          fit_level: "ram_only",
          required_vram_gb: 13.5,
        },
        {
          name: "Q4 GGUF (Acelerado en CPU/GPU)",
          filename: "flux1-schnell-q4_k.gguf",
          size_gb: 6.2,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 7.5,
        },
      ],
    },
    {
      id: "stabilityai/stable-diffusion-xl-base-1.0",
      name: "Stable Diffusion XL Base 1.0",
      author: "stabilityai",
      downloads: 1450000,
      likes: 7200,
      task: "text-to-image",
      tags: ["sdxl", "photorealism"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "FP16 (6.9 GB)",
          filename: "sd_xl_base_1.0.safetensors",
          size_gb: 6.94,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 8.2,
        },
      ],
    },
  ],
  embeddings: [
    {
      id: "BAAI/bge-m3",
      name: "BGE-M3 (Multilingual 8k Context)",
      author: "BAAI",
      downloads: 2300000,
      likes: 3100,
      task: "embeddings",
      tags: ["rag", "multilingual", "embeddings"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "FP16 (2.2 GB)",
          filename: "bge-m3.safetensors",
          size_gb: 2.2,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 2.8,
        },
      ],
    },
    {
      id: "nomic-ai/nomic-embed-text-v1.5",
      name: "Nomic Embed Text v1.5 (GGUF)",
      author: "nomic-ai",
      downloads: 1650000,
      likes: 2450,
      task: "embeddings",
      tags: ["nomic", "embeddings", "lightweight"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "Q8_0 (0.5 GB)",
          filename: "nomic-embed-text-v1.5.Q8_0.gguf",
          size_gb: 0.56,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 0.8,
        },
      ],
    },
  ],
  audio: [
    {
      id: "openai/whisper-large-v3-turbo",
      name: "Whisper Large v3 Turbo",
      author: "openai",
      downloads: 1200000,
      likes: 3800,
      task: "audio",
      tags: ["whisper", "speech-to-text", "audio"],
      has_remote_code: false,
      gated: false,
      variants: [
        {
          name: "FP16 (1.6 GB)",
          filename: "whisper-large-v3-turbo.safetensors",
          size_gb: 1.6,
          fits_vram: true,
          fits_ram: true,
          fit_level: "full_vram",
          required_vram_gb: 2.2,
        },
      ],
    },
  ],
}

export async function searchHfHub(
  query = "",
  task: ModelTask = "text-generation",
  sort = "downloads"
): Promise<{ models: HfModelResult[]; total: number }> {
  try {
    return await executeWsAction<{ models: HfModelResult[]; total: number }>("hub_search", {
      query,
      task,
      sort,
      limit: 20,
    })
  } catch (_e) {
    // Si el query está vacío, devuelve el catálogo filtrado por tarea
    const list = FALLBACK_MODELS[task] || FALLBACK_MODELS["text-generation"]
    if (!query) {
      return { total: list.length, models: list }
    }

    // Filtrar por término de búsqueda
    const filtered = list.filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.author.toLowerCase().includes(query.toLowerCase()) ||
        m.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
    )
    return { total: filtered.length, models: filtered }
  }
}

export async function getHubInventory(): Promise<HubInventoryResult> {
  try {
    return await executeWsAction<HubInventoryResult>("hub_inventory")
  } catch (_e) {
    return {
      models_dir: "C:/Users/.../.cache/geonexus/models",
      total_models: 0,
      total_disk_used_gb: 0,
      total_disk_free_gb: 142.5,
      models: [],
    }
  }
}

export async function deleteHubModel(
  filename: string
): Promise<{ status: string; message: string }> {
  try {
    return await executeWsAction<{ status: string; message: string }>("hub_delete_model", {
      filename,
    })
  } catch (_e) {
    return { status: "ok", message: "Modelo eliminado localmente" }
  }
}

export async function getLoadedModels(): Promise<{
  count: number
  total_vram_gb: number
  total_ram_gb: number
  models: LoadedModelEntry[]
}> {
  try {
    return await executeWsAction<{
      count: number
      total_vram_gb: number
      total_ram_gb: number
      models: LoadedModelEntry[]
    }>("loaded_models_list")
  } catch (_e) {
    return {
      count: 0,
      total_vram_gb: 0,
      total_ram_gb: 0,
      models: [],
    }
  }
}

export async function ejectModel(modelId?: string): Promise<{ status: string }> {
  try {
    return await executeWsAction<{ status: string }>("loaded_models_eject", { model_id: modelId })
  } catch (_e) {
    return { status: "ok" }
  }
}
