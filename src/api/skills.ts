import { invoke } from "@tauri-apps/api/core"
import type { Skill } from "@/types/skills"

export function listSkills(): Promise<Skill[]> {
  return invoke<Skill[]>("list_skills")
}

export function installSkillFromFile(
  skillMdPath: string,
  sourceUrl?: string | null
): Promise<Skill> {
  return invoke<Skill>("install_skill_from_file", { skillMdPath, sourceUrl: sourceUrl ?? null })
}

export function installSkillFromGithub(githubUrl: string): Promise<Skill[]> {
  return invoke<Skill[]>("install_skill_from_github", { githubUrl })
}

export function toggleSkill(skillId: string, enabled: boolean): Promise<void> {
  return invoke("toggle_skill", { skillId, enabled })
}

export function readSkillMd(skillId: string): Promise<string> {
  return invoke<string>("read_skill_md", { skillId })
}
