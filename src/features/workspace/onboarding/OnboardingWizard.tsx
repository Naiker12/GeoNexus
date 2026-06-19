import * as React from "react"
import { FolderOpen, Shield, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface OnboardingWizardProps {
  open: boolean
  onComplete: () => void
  onDismiss: () => void
}

type Step = "welcome" | "choose-path" | "done"

export function OnboardingWizard({ open, onComplete, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = React.useState<Step>("welcome")
  const [selectedPath, setSelectedPath] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  if (!open) return null

  const handlePickFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const path = await invoke<string | null>("open_folder_picker")
      if (path) setSelectedPath(path)
    } catch {
      // Fallback for non-Tauri env
      setSelectedPath("/home/user/projects")
    }
  }

  const handleFinish = async () => {
    setSaving(true)

    // Save the selected path to filesystem config
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
              This wizard will help you set up a secure workspace folder where GeoNexus can
              read, write, and manage your project files. You can change this later.
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
              Pick a folder that will contain your projects. GeoNexus will have access to
              this directory and its subdirectories.
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
              <Button variant="outline" onClick={() => setStep("welcome")}>
                Back
              </Button>
              <Button onClick={() => setStep("done")} disabled={!selectedPath} className="gap-2">
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
              Your workspace folder has been configured. You can always add more paths or
              change permissions in Settings.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onDismiss}>
                Skip (not recommended)
              </Button>
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
