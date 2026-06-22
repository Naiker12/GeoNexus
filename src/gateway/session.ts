/** Session store for agent conversations (inspired by Hermes gateway/). */

export interface Session {
  conversationId: string
  projectId: string
  workspaceId?: string
  provider: string
  model: string
  skillNames: string[]
  createdAt: number
}

const sessions = new Map<string, Session>()

export function createSession(conversationId: string, projectId: string, opts?: Partial<Session>): Session {
  const session: Session = {
    conversationId,
    projectId,
    workspaceId: opts?.workspaceId,
    provider: opts?.provider ?? "openai",
    model: opts?.model ?? "gpt-4o",
    skillNames: opts?.skillNames ?? [],
    createdAt: Date.now(),
  }
  sessions.set(conversationId, session)
  return session
}

export function getSession(conversationId: string): Session | undefined {
  return sessions.get(conversationId)
}

export function updateSession(conversationId: string, patch: Partial<Session>): Session | undefined {
  const existing = sessions.get(conversationId)
  if (!existing) return undefined
  const updated = { ...existing, ...patch }
  sessions.set(conversationId, updated)
  return updated
}

export function removeSession(conversationId: string): void {
  sessions.delete(conversationId)
}

export function listSessions(): Session[] {
  return Array.from(sessions.values())
}
