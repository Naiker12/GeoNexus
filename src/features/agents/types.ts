export interface Agent {
  id: string
  project_id: string
  name: string
  kind: string
  description: string | null
  is_active: boolean
  config: string
  model: string | null
  provider: string | null
  created_at: number
  updated_at: number
}
