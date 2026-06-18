import * as React from "react"
import { useCodingAgent } from "@/contexts/CodingAgentContext"
import { Button } from "@/components/ui/Button"
import type { ClarifyingQuestion } from "@/types/coding-agent"

interface ClarifyingQuestionsProps {
  originalPrompt: string
  onSubmit: (prompt: string, questions: ClarifyingQuestion[]) => void
  onSkip: () => void
}

export function ClarifyingQuestions(props: ClarifyingQuestionsProps) {
  const { state } = useCodingAgent()
  const { originalPrompt, onSubmit, onSkip } = props
  const questions = state.clarifyingQuestions
  const [answers, setAnswers] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (questions) {
      const initial: Record<string, string> = {}
      questions.forEach((q) => { initial[q.id] = "" })
      setAnswers(initial)
    }
  }, [questions])

  if (!questions || questions.length === 0) return null

  const allAnswered = questions.every((q) => answers[q.id]?.trim())

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="mb-3 text-sm font-semibold text-amber-800">
          Preguntas aclaratorias
        </p>
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id}>
              <label className="mb-1 block text-xs font-medium text-amber-700">
                {q.question}
              </label>
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 placeholder:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                rows={2}
                placeholder="Escribe tu respuesta..."
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-amber-600 hover:text-amber-800"
          >
            Saltar y generar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const filled = questions.map((q) => ({
                ...q,
                answer: answers[q.id] ?? "",
              }))
              onSubmit(originalPrompt, filled)
            }}
            disabled={!allAnswered}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            Continuar con plan
          </Button>
        </div>
      </div>
    </div>
  )
}
