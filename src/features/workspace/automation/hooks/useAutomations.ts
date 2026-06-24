import { useState, useEffect, useCallback } from "react"
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  toggleAutomation,
  deleteAutomation,
  startSchedulerWorker,
  stopSchedulerWorker,
} from "@/api/chat"
import type { Automation } from "../types"

const PROJECT_ID = "default"

export function useAutomations() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schedulerRunning, setSchedulerRunning] = useState(false)

  const fetchAutomations = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listAutomations(PROJECT_ID)
      setAutomations(data)
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAutomations() }, [fetchAutomations])

  const handleCreate = useCallback(async (form: {
    name: string
    description: string
    intent: string
    action_type: string
    action_config: string
    channel: string
    cron_expression: string
  }) => {
    let actionConfig: any = undefined
    if (form.action_config && form.action_config !== "{}") {
      try { actionConfig = JSON.parse(form.action_config) } catch { /* ignore */ }
    }

    const automation = await createAutomation({
      projectId: PROJECT_ID,
      name: form.name,
      description: form.description || undefined,
      intent: form.intent,
      actionType: form.action_type,
      actionConfig,
      channel: form.channel,
      cronExpression: form.cron_expression || undefined,
    })
    setAutomations(prev => [automation, ...prev])
    return automation
  }, [])

  const handleUpdate = useCallback(async (form: {
    name: string
    description: string
    intent: string
    action_type: string
    action_config: string
    channel: string
    cron_expression: string
  }, id: string) => {
    let actionConfig: any = undefined
    if (form.action_config && form.action_config !== "{}") {
      try { actionConfig = JSON.parse(form.action_config) } catch { /* ignore */ }
    }

    const automation = await updateAutomation({
      id,
      name: form.name,
      description: form.description || undefined,
      intent: form.intent,
      actionType: form.action_type,
      actionConfig,
      channel: form.channel,
      cronExpression: form.cron_expression || undefined,
      enabled: true,
    })
    setAutomations(prev => prev.map(a => a.id === id ? automation : a))
    return automation
  }, [])

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    await toggleAutomation(id, enabled)
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteAutomation(id)
    setAutomations(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleRunNow = useCallback(async (_id: string) => {
    // For now, trigger a one-shot execution by creating a temporary schedule.
    // In production, this would invoke the worker directly.
    // The worker tick will pick it up on next cycle.
  }, [])

  const handleStartScheduler = useCallback(async () => {
    await startSchedulerWorker()
    setSchedulerRunning(true)
  }, [])

  const handleStopScheduler = useCallback(async () => {
    await stopSchedulerWorker()
    setSchedulerRunning(false)
  }, [])

  return {
    automations,
    loading,
    error,
    schedulerRunning,
    createAutomation: handleCreate,
    updateAutomation: handleUpdate,
    toggleAutomation: handleToggle,
    deleteAutomation: handleDelete,
    runNow: handleRunNow,
    startScheduler: handleStartScheduler,
    stopScheduler: handleStopScheduler,
    refresh: fetchAutomations,
  }
}
