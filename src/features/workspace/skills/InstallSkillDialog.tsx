import { useState } from "react"
import { open as tauriOpen } from "@tauri-apps/plugin-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { previewSkillFile, normalizeGithubUrl } from "@/api/skills"

interface InstallSkillDialogProps {
  open: boolean
  onClose: () => void
  onInstallFromFile: () => Promise<unknown>
  onInstallFromGithub: (url: string) => Promise<unknown>
}

type Step = "source" | "preview" | "installing" | "done" | "error"

export function InstallSkillDialog({ open, onClose, onInstallFromFile, onInstallFromGithub }: InstallSkillDialogProps) {
  const [step, setStep] = useState<Step>("source")
  const [githubUrl, setGithubUrl] = useState("")
  const [previewContent, setPreviewContent] = useState("")
  const [pendingFile, setPendingFile] = useState<string | null>(null)
  const [msg, setMsg] = useState("")

  const reset = () => {
    setStep("source")
    setGithubUrl("")
    setPreviewContent("")
    setPendingFile(null)
    setMsg("")
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Fetch preview from GitHub URL
  const handlePreviewGithub = async () => {
    const trimmed = githubUrl.trim()
    if (!trimmed) return
    setStep("preview")
    setPreviewContent("Cargando vista previa...")
    try {
      const rawUrl = normalizeGithubUrl(trimmed)
      const res = await fetch(rawUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      setPreviewContent(text)
    } catch (err) {
      setStep("error")
      setMsg(`Error al obtener vista previa: ${err}`)
    }
  }

  const handleConfirmGithub = async () => {
    setStep("installing")
    try {
      await onInstallFromGithub(githubUrl.trim())
      setStep("done")
      setMsg("Skill instalado correctamente")
      setTimeout(handleClose, 1200)
    } catch (err) {
      setStep("error")
      setMsg(`Error: ${err}`)
    }
  }

  // Select file and show preview
  const handleSelectFile = async () => {
    const selected = await tauriOpen({
      filters: [{ name: "Skill", extensions: ["md"] }],
      multiple: false,
    })
    if (!selected || typeof selected !== "string") return
    setStep("preview")
    setPreviewContent("Cargando vista previa...")
    try {
      const text = await previewSkillFile(selected)
      setPendingFile(selected)
      setPreviewContent(text)
    } catch (err) {
      setStep("error")
      setMsg(`Error al leer archivo: ${err}`)
    }
  }

  const handleConfirmFile = async () => {
    if (!pendingFile) return
    setStep("installing")
    try {
      const skill = await onInstallFromFile()
      if (skill) {
        setStep("done")
        setMsg("Skill instalado correctamente")
        setTimeout(handleClose, 1200)
      } else {
        setStep("source")
        setPendingFile(null)
        setPreviewContent("")
      }
    } catch (err) {
      setStep("error")
      setMsg(`Error: ${err}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="w-[620px]">
        <DialogHeader>
          <DialogTitle>🧩 Instalar Skill</DialogTitle>
          <DialogDescription>
            {step === "source" && "Agrega capacidades nuevas al agente desde GitHub o un archivo SKILL.md local."}
            {step === "preview" && "Revisa el contenido antes de instalar."}
            {step === "installing" && "Instalando skill..."}
            {step === "done" && msg}
            {step === "error" && msg}
          </DialogDescription>
        </DialogHeader>

        {step === "source" && (
          <div className="space-y-6 mt-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Desde GitHub</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Pega la URL del repo.
                <code className="ml-1 text-[10px] bg-muted px-1 rounded">
                  https://github.com/user/repo-skill
                </code>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/user/repo-skill"
                  className="flex-1 h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary/50"
                  onKeyDown={e => e.key === "Enter" && handlePreviewGithub()}
                />
                <button
                  onClick={handlePreviewGithub}
                  disabled={!githubUrl.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  Vista previa
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
                onClick={handleSelectFile}
                className="w-full rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                📁 Seleccionar archivo SKILL.md
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="mt-4 space-y-4">
            <div className="max-h-72 overflow-auto rounded-lg border border-border bg-[#0d1117] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#c9d1d9] select-text">
              {previewContent || "Sin contenido"}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setStep("source"); setPreviewContent("") }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
              >
                Cancelar
              </button>
              <button
                onClick={pendingFile ? handleConfirmFile : handleConfirmGithub}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Confirmar e instalar
              </button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="mt-4">
            <p className="text-sm px-3 py-2 rounded-lg bg-destructive/10 text-destructive">{msg}</p>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setStep("source")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50">
                Volver
              </button>
            </div>
          </div>
        )}

        {step === "source" && (
          <div className="mt-6 flex justify-end">
            <button onClick={handleClose} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50">
              Cancelar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}