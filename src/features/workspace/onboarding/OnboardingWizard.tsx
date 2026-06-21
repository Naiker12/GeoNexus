import * as React from "react"
import { FolderOpen, Shield, CheckCircle, ArrowRight, Loader2Icon, AlertTriangleIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { runHealthCheck, type HealthCheckResult } from "@/api/health"

interface OnboardingWizardProps {
  open: boolean
  onComplete: () => void
  onDismiss: () => void
}

type Step = "welcome" | "choose-path" | "health-check" | "done"

export function OnboardingWizard({ open, onComplete, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = React.useState<Step>("welcome")
  const [selectedPath, setSelectedPath] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [health, setHealth] = React.useState<HealthCheckResult | null>(null)
  const [healthLoading, setHealthLoading] = React.useState(false)

  if (!open) return null

  const handlePickFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const path = await invoke<string | null>("open_folder_picker")
      if (path) setSelectedPath(path)
    } catch {
      setSelectedPath("/home/user/projects")
    }
  }

  const handleRunHealthCheck = async () => {
    setHealthLoading(true)
    try {
      const result = await runHealthCheck()
      setHealth(result)
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const { getFilesystemConfig, saveFilesystemConfig } = await import("@/api/filesystem-config")
      const config = await getFilesystemConfig()
      if (config && selectedPath) {
        config.allowed_paths.push({
          path: selectedPath,
          level: "write",
          added_at: new Date().toISOString(),
          label: "My Project",
        })
        await saveFilesystemConfig(config)
      }
    } catch { /* ignore */ }
    setSaving(false)
    onComplete()
  }

  const items: { label: string; ok: boolean }[] = health
    ? [
        { label: "Base de datos", ok: health.db_connected },
        { label: "Modelo LLM configurado", ok: health.llm_configured },
        { label: "Rutas de archivos permitidas", ok: health.has_allowed_paths },
        { label: "Bot de Telegram configurado", ok: health.bot_configured },
      ]
    : []

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <div className="flex flex-col items-center text-center px-6 py-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Shield className="size-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to GeoNexus</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              This wizard will help you set up a secure workspace folder and verify your system is ready.
            </p>
            <Button onClick={() => setStep("choose-path")} className="gap-2">
              Get Started <ArrowRight className="size-4" />
            </Button>
          </div>
        )

      case "choose-path":
        return (
          <div className="flex flex-col items-center text-center px-6 py-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <FolderOpen className="size-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Choose a Workspace Folder</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Pick a folder that will contain your projects. GeoNexus will have access to this directory.
            </p>

            <div className="w-full max-w-sm mb-6">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm">
                <code className="flex-1 truncate text-left">
                  {selectedPath || "No folder selected"}
                </code>
                <Button variant="outline" size="xs" onClick={handlePickFolder}>
                  Browse
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("welcome")}>Back</Button>
              <Button onClick={() => setStep("health-check")} disabled={!selectedPath} className="gap-2">
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )

      case "health-check":
        return (
          <div className="flex flex-col items-center px-6 py-8">
            <h2 className="text-xl font-semibold mb-2 text-center">System Health Check</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6 text-center">
              Verifying your system is properly configured.
            </p>

            {!health && !healthLoading && (
              <Button onClick={handleRunHealthCheck} className="gap-2">
                Run Health Check <ArrowRight className="size-4" />
              </Button>
            )}

            {healthLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Checking...
              </div>
            )}

            {health && (
              <div className="w-full max-w-sm space-y-2 mb-6">
                {items.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    {item.ok ? (
                      <CheckCircle className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangleIcon className="size-4 shrink-0 text-amber-500" />
                    )}
                    <span className="text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setStep("choose-path")}>Back</Button>
              <Button onClick={() => setStep("done")} className="gap-2">
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )

      case "done":
        return (
          <div className="flex flex-col items-center text-center px-6 py-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-green-500/10 mb-4">
              <CheckCircle className="size-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">All Set!</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Your workspace folder has been configured. You can always add more paths or change permissions in Settings.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onDismiss}>Skip (not recommended)</Button>
              <Button onClick={handleFinish} disabled={saving} className="gap-2">
                {saving ? "Saving..." : "Finish Setup"}
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[min(94vw,420px)] rounded-xl border border-border bg-card shadow-2xl">
        {renderStep()}
      </div>
    </div>
  )
}
