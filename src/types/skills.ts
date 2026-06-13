export type SkillCategory = 'gis' | 'research' | 'data' | 'agent' | 'tool' | 'connector'

export interface Skill {
  id: string
  name: string
  description?: string
  version: string
  category: SkillCategory
  author?: string
  tags: string[]
  mcpServers: string[]
  skillMdPath: string
  skillMdHash?: string
  sourceUrl?: string
  enabled: boolean
  builtin: boolean
  useCount: number
  lastUsedAt?: number
  installedAt: number
  updatedAt: number
}
