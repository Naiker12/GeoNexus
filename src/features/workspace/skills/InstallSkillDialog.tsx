import { useState } from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface InstallSkillDialogProps {
  open: boolean
  onClose: () => void
  onInstallFromFile: () => Promise<unknown>
  onInstallFromGithub: (url: string) => Promise<unknown>
}

export function InstallSkillDialog({ open, onClose, onInstallFromFile, onInstallFromGithub }: InstallSkillDialogProps) {
  const [githubUrl, setGithubUrl] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  const handleGithub = async () => {
    if (!githubUrl.trim()) return
    setStatus("loading")
    try {
      await onInstallFromGithub(githubUrl.trim())
      setStatus("done")
      setMsg("Skill instalado correctamente")
      setTimeout(() => { onClose(); setStatus("idle"); setGithubUrl("") }, 1200)
    } catch (err) {
      setStatus("error")
      setMsg(`Error: ${err}`)
    }
  }

  const handleFile = async () => {
    setStatus("loading")
    try {
      const skill = await onInstallFromFile()
      if (skill) {
        setStatus("done")
        setMsg("Skill instalado correctamente")
        setTimeout(() => { onClose(); setStatus("idle") }, 1200)
      } else {
        setStatus("idle")
      }
    } catch (err) {
      setStatus("error")
      setMsg(`Error: ${err}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="w-[560px]">
        <DialogHeader>
          <DialogTitle>🧩 Instalar Skill</DialogTitle>
          <DialogDescription>
            Agrega capacidades nuevas al agente desde GitHub o un archivo SKILL.md local.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Desde GitHub</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Pega la URL del repo. Ejemplo:
              <code className="ml-1 text-[10px] bg-muted px-1 rounded">
                https://github.com/mvanhorn/last30days-skill
              </code>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo-skill"
                className="flex-1 h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary/50"
                onKeyDown={e => e.key === "Enter" && handleGithub()}
              />
              <button
                onClick={handleGithub}
                disabled={!githubUrl.trim() || status === "loading"}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {status === "loading" ? "Instalando..." : "Instalar"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <hr className="flex-1 border-border" />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Archivo SKILL.md local</h4>
            <button
              onClick={handleFile}
              disabled={status === "loading"}
              className="w-full rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-40"
            >
              📁 Seleccionar archivo SKILL.md
            </button>
          </div>
        </div>

        {msg && (
          <p className={cn(
            "text-sm mt-4 px-3 py-2 rounded-lg",
            status === "error" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"
          )}>
            {msg}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50">
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
