import * as React from "react"
import { Loader2, FileCode } from "lucide-react"
import { useCodingAgent } from "@/contexts/CodingAgentContext"

export function AgentFileWritingCard() {
  const { state } = useCodingAgent()
  const wf = state.writingFile

  if (!wf) return null

  const lines = wf.accumulatedContent.split("\n")

  return (
    <div className="overflow-hidden rounded-lg border border-amber-200/50 bg-amber-50/40 mb-2">
      <div className="flex items-center gap-2 border-b border-amber-200/30 bg-amber-100/40 px-3 py-1.5">
        <FileCode className="size-3.5 text-amber-600 shrink-0" />
        <span className="text-[12px] font-medium text-amber-800 truncate">{wf.name}</span>
        {wf.language && (
          <span className="text-[10px] text-amber-500 uppercase">{wf.language}</span>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-amber-600">
          <Loader2 className="size-3 animate-spin" />
          Escribiendo...
        </div>
      </div>
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed font-mono text-amber-900">
        <code>
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              <span className="text-amber-300 select-none mr-3 inline-block w-6 text-right">{i + 1}</span>
              {line || <span>&nbsp;</span>}
              {"\n"}
            </React.Fragment>
          ))}
          <span className="inline-block w-0.5 h-3.5 bg-amber-500 animate-pulse ml-0.5" />
        </code>
      </pre>
    </div>
  )
}
