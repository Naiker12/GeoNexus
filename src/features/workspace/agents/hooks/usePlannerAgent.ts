import { useState } from "react"
import type { AgentPlan, AgentEvent } from "@/types/agents"

export function usePlannerAgent() {
  const [plan, setPlan] = useState<AgentPlan | null>(null)
  const [loading, setLoading] = useState(false)

  const generatePlan = async (goal: string, events: AgentEvent[]) => {
    setLoading(true)
    const plannerEvent = events.find((e) => e.agent === "planner" && e.status === "done")
    if (plannerEvent?.data) {
      setPlan(plannerEvent.data as AgentPlan)
    }
    setLoading(false)
  }

  return { plan, loading, generatePlan }
}
