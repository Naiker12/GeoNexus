import { useState } from "react"
import { Copy, Check, Pencil, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  content: string
}

export function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copiado" : "Copiar"}
      className={cn(
        "p-1 rounded-md transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        copied && "text-emerald-500"
      )}
    >
      {copied
        ? <Check className="h-3.5 w-3.5" />
        : <Copy className="h-3.5 w-3.5" />
      }
    </button>
  )
}

interface UserActionsProps {
  onEdit?: () => void
  onRegenerate?: () => void
}

export function UserActions({ onEdit, onRegenerate }: UserActionsProps) {
  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {onEdit && (
        <button
          onClick={onEdit}
          title="Editar mensaje"
          className="p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          title="Regenerar respuesta"
          className="p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
