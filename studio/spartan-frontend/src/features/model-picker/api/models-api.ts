// SPDX-License-Identifier: AGPL-3.0-only
// Copyright 2026-present the Unsloth AI Inc. team. All rights reserved. See /studio/LICENSE.AGPL-3.0

import { authFetch } from "@/features/auth";
import { hubTokenHeader } from "@/features/hub";

interface VisionCheckResponse {
  model_name: string;
  is_vision: boolean;
}

interface EmbeddingCheckResponse {
  model_name: string;
  is_embedding: boolean;
}

export interface ModelConfigResponse {
  id: string;
  model_name?: string | null;
  config?: Record<string, unknown> | null;
  is_vision: boolean;
  is_embedding?: boolean;
  is_audio: boolean;
  audio_type_known?: boolean;
  is_lora: boolean;
  base_model?: string | null;
  model_type?: "text" | "vision" | "audio" | "embeddings" | null;
  max_position_embeddings?: number | null;
  model_size_bytes?: number | null;
}

export interface ModelConfigRequestOptions {
  preferLocalCache?: boolean;
  localPath?: string | null;
}

export interface LocalModelInfo {
  id: string;
  display_name: string;
  path: string;
  source: "models_dir" | "hf_cache" | "lmstudio" | "custom";
  model_id?: string | null;
  updated_at?: number | null;
}

interface LocalModelListResponse {
  models_dir: string;
  hf_cache_dir?: string | null;
  lmstudio_dirs: string[];
  models: LocalModelInfo[];
}

/** GET /api/models/check-vision; pass the token so a gated/private VLM is not misread as non-vision. */
export async function checkVisionModel(
  modelName: string,
  hfToken?: string | null,
): Promise<boolean> {
  const encoded = encodeURIComponent(modelName);
  const response = await authFetch(`/api/models/check-vision/${encoded}`, {
    headers: hubTokenHeader(hfToken?.trim() || null),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to check model vision support (${response.status})`,
    );
  }
  const data = (await response.json()) as VisionCheckResponse;
  return data.is_vision;
}

/** GET /api/models/check-embedding; pass the token for gated/private repos. */
export async function checkEmbeddingModel(
  modelName: string,
  hfToken?: string | null,
): Promise<boolean> {
  const encoded = encodeURIComponent(modelName);
  const response = await authFetch(`/api/models/check-embedding/${encoded}`, {
    headers: hubTokenHeader(hfToken?.trim() || null),
  });
  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as EmbeddingCheckResponse;
  return data.is_embedding;
}

export async function getModelConfig(
  modelName: string,
  signal?: AbortSignal,
  hfToken?: string,
  options?: ModelConfigRequestOptions,
): Promise<ModelConfigResponse> {
  const encoded = encodeURIComponent(modelName);
  const params = new URLSearchParams();
  if (options?.preferLocalCache) {
    params.set("prefer_local_cache", "true");
  }
  if (options?.localPath) {
    params.set("local_path", options.localPath);
  }
  const query = params.toString();
  const response = await authFetch(
    `/api/models/config/${encoded}${query ? `?${query}` : ""}`,
    {
      headers: hubTokenHeader(hfToken?.trim() || null),
      signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch model config (${response.status})`);
  }
  return (await response.json()) as ModelConfigResponse;
}

export async function listLocalModels(
  signal?: AbortSignal,
): Promise<LocalModelInfo[]> {
  const response = await authFetch("/api/models/local", { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch local models (${response.status})`);
  }
  const data = (await response.json()) as LocalModelListResponse;
  return data.models;
}
