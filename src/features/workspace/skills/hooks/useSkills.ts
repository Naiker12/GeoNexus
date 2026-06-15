import { useState, useEffect, useCallback } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { listSkills, installSkillFromFile, installSkillFromGithub, toggleSkill, readSkillMd } from "@/api/skills"
import type { Skill } from "@/types/skills"

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listSkills()
      setSkills(data)
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  const installFromFile = useCallback(async (path?: string) => {
    const selected = path || await open({
      filters: [{ name: "Skill", extensions: ["md"] }],
      multiple: false,
    })
    if (!selected || typeof selected !== "string") return null

    const skill = await installSkillFromFile(selected, null)
    setSkills(prev => {
      const idx = prev.findIndex(s => s.id === skill.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = skill; return n }
      return [...prev, skill]
    })
    return skill
  }, [])

  const installFromGithub = useCallback(async (url: string) => {
    const installed = await installSkillFromGithub(url)
    setSkills(prev => {
      const map = new Map(prev.map(s => [s.id, s]))
      installed.forEach(s => map.set(s.id, s))
      return Array.from(map.values())
    })
    return installed
  }, [])

  const handleToggle = useCallback(async (skillId: string, enabled: boolean) => {
    await toggleSkill(skillId, enabled)
    setSkills(prev => prev.map(s => s.id === skillId ? { ...s, enabled } : s))
  }, [])

  const handleReadMd = useCallback(async (skillId: string) => {
    return readSkillMd(skillId)
  }, [])

  return {
    skills, loading, error,
    installFromFile, installFromGithub,
    toggleSkill: handleToggle, readSkillMd: handleReadMd,
    refresh: fetchSkills,
  }
}
