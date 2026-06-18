import type { Skill } from "../types/skills"

/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

/** Obtains invoke function safely, returning null if Tauri isn't available */
async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return invoke
  } catch {
    return null
  }
}

export async function listSkills(): Promise<Skill[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<Skill[]>("list_skills")
}

export async function installSkillFromFile(
  skillMdPath: string,
  sourceUrl?: string | null
): Promise<Skill> {
  const invoke = await getInvoke()
  if (!invoke) throw new Error("Tauri not available")
  return invoke<Skill>("install_skill_from_file", { skillMdPath, sourceUrl: sourceUrl ?? null })
}

export async function installSkillFromGithub(githubUrl: string): Promise<Skill[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<Skill[]>("install_skill_from_github", { githubUrl })
}

export async function toggleSkill(skillId: string, enabled: boolean): Promise<void> {
  const invoke = await getInvoke()
  if (!invoke) return
  return invoke("toggle_skill", { skillId, enabled })
}

export async function readSkillMd(skillId: string): Promise<string> {
  const invoke = await getInvoke()
  if (!invoke) return ""
  return invoke<string>("read_skill_md", { skillId })
}

export async function previewSkillFile(path: string): Promise<string> {
  const invoke = await getInvoke()
  if (!invoke) return ""
  return invoke<string>("preview_skill_file", { path })
}

export function normalizeGithubUrl(url: string): string {
  if (url.includes("raw.githubusercontent.com")) return url
  const base = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
  if (!base.includes("/main/") && !base.includes("/master/")) {
    return `${base.replace(/\/+$/, "")}/main/SKILL.md`
  }
  return base
}
