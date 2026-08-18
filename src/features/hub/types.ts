export type ModelTask = "text-generation" | "text-to-image" | "embeddings" | "audio"

export interface ModelVariant {
  name: string
  filename: string
  size_gb: number
  description?: string
  fits_vram: boolean
  fits_ram: boolean
  fit_level: "full_vram" | "partial_vram" | "ram_only" | "exceeds" | "cpu_only"
  required_vram_gb: number
}

export interface HfModelResult {
  id: string
  name: string
  author: string
  downloads: number
  likes: number
  task: string
  tags: string[]
  has_remote_code: boolean
  gated: boolean
  variants: ModelVariant[]
}

export interface LocalModelItem {
  id: string
  name: string
  filename: string
  path: string
  size_gb: number
  format: "gguf" | "safetensors" | "lora" | string
  modified_at: number
  is_dir: boolean
}

export interface HubInventoryResult {
  models_dir: string
  total_models: number
  total_disk_used_gb: number
  total_disk_free_gb: number
  models: LocalModelItem[]
}

export interface HardwareMemoryInfo {
  has_gpu: boolean
  gpu_name: string
  gpu_total_gb: number
  gpu_free_gb: number
  ram_total_gb: number
  ram_free_gb: number
}

export interface LoadedModelEntry {
  id: string
  name: string
  kind: "text" | "image" | "audio" | "training"
  vram_gb: number
  ram_gb: number
  device: string
  status: "active" | "idle"
}
