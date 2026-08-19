import { cn } from "@/lib/utils"
import { code } from "@streamdown/code"
import { math } from "@streamdown/math"
import { mermaid } from "@streamdown/mermaid"
import { memo } from "react"
import { Streamdown } from "streamdown"

interface MarkdownTextProps {
  content: string
  isStreaming?: boolean
  className?: string
}

const plugins = {
  code,
  math,
  mermaid,
}

const controls = {
  code: true,
  table: true,
  mermaid: true,
}

export const MarkdownText = memo(function MarkdownText({
  content,
  isStreaming,
  className,
}: MarkdownTextProps) {
  return (
    <div
      className={cn(
        "space-y-3 text-[14px] leading-relaxed text-foreground break-words overflow-wrap-anywhere prose dark:prose-invert max-w-none",
        "prose-headings:font-medium prose-h1:text-[18px] prose-h2:text-[16px] prose-h3:text-[14px]",
        "prose-p:leading-[1.75] prose-p:my-2 prose-pre:my-3 prose-pre:rounded-xl",
        "prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:underline-offset-2",
        className
      )}
    >
      <Streamdown mode={isStreaming ? "streaming" : "static"} plugins={plugins} controls={controls}>
        {content}
      </Streamdown>
      {isStreaming && (
        <span className="inline-block w-[3px] h-[1em] ml-0.5 bg-emerald-500 animate-pulse align-middle" />
      )}
    </div>
  )
})
