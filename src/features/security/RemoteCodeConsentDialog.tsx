import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircleIcon, Cancel01Icon, Shield01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export interface RemoteCodeFinding {
  file: string
  line: number
  call: string
  severity: string
  description: string
}

export interface RemoteCodeConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelId?: string
  modelName?: string
  findings?: RemoteCodeFinding[]
  approvable?: boolean
  onApprove?: () => void
  onConfirm?: () => void
  onReject?: () => void
}

export function RemoteCodeConsentDialog({
  open,
  onOpenChange,
  modelId,
  modelName,
  findings = [],
  approvable = true,
  onApprove,
  onConfirm,
  onReject,
}: RemoteCodeConsentDialogProps) {
  const targetModel = modelId || modelName || "Modelo Hugging Face"

  const handleApprove = () => {
    if (onApprove) onApprove()
    if (onConfirm) onConfirm()
    onOpenChange(false)
  }

  const handleReject = () => {
    if (onReject) onReject()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5 border-amber-500/30">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <HugeiconsIcon icon={Shield01Icon} strokeWidth={1.75} className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                Consentimiento de Código Remoto
              </DialogTitle>
              <DialogDescription className="text-xs">
                El modelo <strong className="text-foreground">{targetModel}</strong> contiene código
                Python personalizado que se ejecutará localmente en tu sistema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-2.5">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
              Análisis Estático de Seguridad
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 [scrollbar-width:thin]">
              {findings.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-2 text-xs text-muted-foreground">
                  No se detectaron llamadas críticas en el escaneo estático inicial
                  (`trust_remote_code`).
                </div>
              ) : (
                findings.map((f, idx) => (
                  <div key={idx} className="rounded-xl border border-border/60 bg-card p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {f.file}:{f.line}
                      </span>
                      <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[9px] font-bold font-mono">
                        {f.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-foreground">{f.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {!approvable && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                strokeWidth={1.75}
                className="size-4 shrink-0 mt-0.5"
              />
              <span>
                Este modelo contiene código crítico marcado como no seguro y ha sido bloqueado por
                prevención de seguridad.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReject}
            className="rounded-xl text-xs cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.75} className="size-3.5 mr-1" />
            <span>Rechazar y Cancelar</span>
          </Button>

          {approvable && (
            <Button
              variant="default"
              size="sm"
              onClick={handleApprove}
              className="rounded-xl text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5" />
              <span>Aprobar y Continuar</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
