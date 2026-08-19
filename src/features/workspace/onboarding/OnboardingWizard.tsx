import { type HealthCheckResult, runHealthCheck } from "@/api/health"
import { GeoAgentsLogo } from "@/components/brand/GeoAgentsLogo"
import { Button } from "@/components/ui/Button"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import { providerOptions } from "@/features/workspace/ai-containers/provider-options"
import { useLanguage } from "@/i18n/useLanguage"
import { cn } from "@/lib/utils"
import {
  AlertTriangleIcon,
  ArrowLeft,
  ArrowRight,
  BotIcon,
  CheckCircle,
  FolderOpen,
  GlobeIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react"
import * as React from "react"

interface OnboardingWizardProps {
  open: boolean
  onComplete: () => void
  onDismiss: () => void
}

type Step = "welcome" | "provider" | "choose-path" | "health-check" | "done"

const ONBOARDING_PROVIDER_IDS = ["ollama", "lmstudio", "openai", "anthropic", "gemini", "deepseek"]

export function OnboardingWizard({ open, onComplete, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = React.useState<Step>("welcome")
  const [selectedPath, setSelectedPath] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [health, setHealth] = React.useState<HealthCheckResult | null>(null)
  const [healthLoading, setHealthLoading] = React.useState(false)
  const { setConnectors, connectors } = useConnectors()
  const { language, setLanguage, t } = useLanguage()

  const onboardingProviders = React.useMemo(() => {
    return ONBOARDING_PROVIDER_IDS.map((id) => {
      const opt = providerOptions.find((p) => p.id === id)
      return (
        opt || {
          id,
          name: id.toUpperCase(),
          category: "cloud" as const,
          description: "Proveedor LLM",
          defaultModel: "default",
          defaultEndpoint: "http://localhost:11434",
          popularModels: ["default"],
          icon: BotIcon,
        }
      )
    })
  }, [])

  if (!open) return null

  const handlePickFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const path = await invoke<string | null>("open_folder_picker")
      if (path) setSelectedPath(path)
    } catch {
      setSelectedPath("C:\\GeoNexus\\Projects")
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

  const handleSelectProvider = (providerId: string) => {
    const opt = providerOptions.find((p) => p.id === providerId)
    if (!opt) return
    const exists = connectors.some((c) => c.id === providerId)
    if (!exists) {
      const newConnector = {
        id: providerId,
        name: opt.name,
        provider: opt.category === "local" ? "local" : "cloud",
        status: "online" as const,
        model: opt.defaultModel || "default",
        models: opt.popularModels && opt.popularModels.length > 0 ? opt.popularModels : [opt.defaultModel],
        endpoint: opt.defaultEndpoint || "",
        apiKey: undefined,
        icon: opt.icon,
        supportsTools: true,
        privacy: opt.category === "local" ? "localhost" : "keychain",
        latency: "45ms",
        description: opt.description,
      }
      setConnectors((prev) => [...prev, newConnector as any])
    }
    setStep("choose-path")
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
      onComplete()
    } catch {
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  const healthItems = health
    ? [
        { label: t.onboarding.dbLabel, ok: health.db_connected },
        { label: t.onboarding.llmLabel, ok: health.llm_configured },
        { label: t.onboarding.pathsLabel, ok: health.has_allowed_paths },
        { label: t.onboarding.telegramLabel, ok: health.bot_configured },
      ]
    : []

  const stepIndicators: { id: Step; num: number }[] = [
    { id: "welcome", num: 1 },
    { id: "provider", num: 2 },
    { id: "choose-path", num: 3 },
    { id: "health-check", num: 4 },
  ]

  const currentStepNum =
    step === "welcome"
      ? 1
      : step === "provider"
      ? 2
      : step === "choose-path"
      ? 3
      : step === "health-check"
      ? 4
      : 4

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <div className="flex flex-col items-center text-center px-6 py-7 sm:px-8 sm:py-9">
            {/* Logo de Marca GeoNexus */}
            <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
              <GeoAgentsLogo variant="icon" className="size-11" />
              <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-primary ring-2 ring-background">
                <SparklesIcon className="size-2 text-primary-foreground" />
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans mb-2">
              {t.onboarding.stepWelcomeTitle}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-7">
              {t.onboarding.stepWelcomeDesc}
            </p>

            <Button
              size="lg"
              onClick={() => setStep("provider")}
              className="gap-2 text-sm font-semibold rounded-2xl px-6 h-11 shadow-md hover:shadow-primary/20 cursor-pointer"
            >
              <span>{t.onboarding.getStarted}</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )

      case "provider":
        return (
          <div className="flex flex-col px-5 py-6 sm:px-8 sm:py-7">
            <div className="text-center mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-foreground font-sans">
                {t.onboarding.stepProviderTitle}
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                {t.onboarding.stepProviderDesc}
              </p>
            </div>

            {/* Grid 2x3 de Proveedores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 max-h-[340px] overflow-y-auto [scrollbar-width:thin] pr-0.5">
              {onboardingProviders.map((p) => {
                const isLocal = p.category === "local"
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p.id)}
                    className="group relative flex items-start gap-3 rounded-2xl border border-border/80 bg-card/70 p-3.5 text-left hover:border-primary/60 hover:bg-card hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 border border-border/60 text-foreground group-hover:border-primary/40 transition-colors">
                      <ProviderBrandIcon
                        providerId={p.id}
                        fallback={BotIcon}
                        className="size-5.5"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase tracking-wider",
                            isLocal
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-primary/10 text-primary border border-primary/20"
                          )}
                        >
                          {isLocal ? "LOCAL" : "CLOUD"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                        {p.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("welcome")}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
              >
                <ArrowLeft className="size-3.5" />
                <span>{t.onboarding.back}</span>
              </Button>

              <button
                type="button"
                onClick={() => setStep("choose-path")}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors font-medium cursor-pointer"
              >
                {t.onboarding.skipProvider}
              </button>
            </div>
          </div>
        )

      case "choose-path":
        return (
          <div className="flex flex-col items-center text-center px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 mb-4 shadow-sm">
              <FolderOpen className="size-8 text-primary" />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-foreground font-sans mb-1.5">
              {t.onboarding.stepFolderTitle}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
              {t.onboarding.stepFolderDesc}
            </p>

            <div className="w-full max-w-md mb-6">
              <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-muted/40 p-1.5 shadow-2xs">
                <code className="flex-1 truncate text-left font-mono text-xs px-3 py-1.5 text-foreground select-all">
                  {selectedPath || t.onboarding.noFolderSelected}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePickFolder}
                  className="rounded-xl text-xs font-semibold px-3 h-8 hover:bg-muted cursor-pointer shrink-0"
                >
                  {t.onboarding.browse}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("provider")}
                className="rounded-xl text-xs px-4 h-9"
              >
                {t.onboarding.back}
              </Button>
              <Button
                size="sm"
                onClick={() => setStep("health-check")}
                className="gap-2 rounded-xl text-xs px-5 h-9 font-semibold shadow-sm"
              >
                <span>{t.onboarding.continue}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setStep("health-check")}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer"
            >
              {t.onboarding.skipStep}
            </button>
          </div>
        )

      case "health-check":
        return (
          <div className="flex flex-col items-center px-6 py-7 sm:px-8 sm:py-8 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-foreground font-sans mb-1.5">
              {t.onboarding.stepHealthTitle}
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mb-5 leading-relaxed">
              {t.onboarding.stepHealthDesc}
            </p>

            {!health && !healthLoading && (
              <Button
                size="sm"
                onClick={handleRunHealthCheck}
                className="gap-2 rounded-xl text-xs font-semibold mb-6 h-9"
              >
                <span>{t.onboarding.runHealthCheck}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            )}

            {healthLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground my-6">
                <Loader2Icon className="size-4 animate-spin text-primary" />
                <span>{t.onboarding.checking}</span>
              </div>
            )}

            {health && (
              <div className="w-full max-w-md space-y-2 mb-6 text-left">
                {healthItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-3.5 py-2.5 text-xs shadow-2xs"
                  >
                    <span className="font-medium text-foreground">{item.label}</span>
                    {item.ok ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 font-mono">
                        <CheckCircle className="size-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 font-mono">
                        <AlertTriangleIcon className="size-3.5" />
                        Aviso
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 justify-center w-full mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("choose-path")}
                className="rounded-xl text-xs px-4 h-9"
              >
                {t.onboarding.back}
              </Button>
              <Button
                size="sm"
                onClick={() => setStep("done")}
                className="gap-2 rounded-xl text-xs px-5 h-9 font-semibold shadow-sm"
              >
                <span>{t.onboarding.continue}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setStep("done")}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer"
            >
              {t.onboarding.skipStep}
            </button>
          </div>
        )

      case "done":
        return (
          <div className="flex flex-col items-center text-center px-6 py-8 sm:px-8 sm:py-9">
            <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <CheckCircle className="size-10 text-emerald-500" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground font-sans mb-2">
              {t.onboarding.stepDoneTitle}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-7">
              {t.onboarding.stepDoneDesc}
            </p>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
                className="rounded-xl text-xs px-4 h-10 text-muted-foreground hover:text-foreground"
              >
                {t.onboarding.skipFinish}
              </Button>
              <Button
                size="default"
                onClick={handleFinish}
                disabled={saving}
                className="gap-2 rounded-xl text-xs font-semibold px-6 h-10 bg-primary text-primary-foreground shadow-md cursor-pointer"
              >
                <span>{saving ? t.common.connecting : t.onboarding.finishSetup}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-[min(96vw,580px)] rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Cabecera del Wizard con indicador de paso y Selector de Idioma */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30">
          {/* Indicadores de Progreso */}
          <div className="flex items-center gap-1.5">
            {stepIndicators.map((s) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  currentStepNum === s.num
                    ? "w-6 bg-primary"
                    : currentStepNum > s.num
                    ? "w-2.5 bg-primary/40"
                    : "w-2.5 bg-muted-foreground/20"
                )}
              />
            ))}
          </div>

          {/* Selector Rápido de Idioma (ES / EN) */}
          <div className="flex items-center gap-1 bg-background/80 rounded-xl border border-border/60 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setLanguage("es")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer",
                language === "es"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Cambiar a Español"
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer",
                language === "en"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Switch to English"
            >
              EN
            </button>
          </div>
        </div>

        {/* Contenido del Paso */}
        <div className="flex-1">{renderStep()}</div>
      </div>
    </div>
  )
}
