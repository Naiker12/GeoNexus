import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { FolderIcon, SlidersHorizontalIcon, TerminalIcon, ZapIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Field, SettingGroup } from "@/features/workspace/configuration/settings-ui"
import { useLanguage } from "@/i18n/useLanguage"
import { cn } from "@/lib/utils"
import { GlobeIcon } from "lucide-react"

interface WorkspaceConfig {
  working_directory: string
  code_execution_mode: "project" | "global" | "disabled"
  persistent_shell: boolean
  env_passthrough: string[]
  file_read_limit: number
}

export function WorkspaceSection() {
  const { language, setLanguage, t } = useLanguage()
  const [config, setConfig] = useState<WorkspaceConfig>({
    working_directory: ".",
    code_execution_mode: "project",
    persistent_shell: true,
    env_passthrough: ["PATH", "PYTHONPATH", "NODE_ENV"],
    file_read_limit: 100_000,
  })

  useEffect(() => {
    invoke<WorkspaceConfig>("get_workspace_config")
      .then((c) => setConfig(c))
      .catch(() => {})
  }, [])

  const saveConfig = async (updated: WorkspaceConfig) => {
    setConfig(updated)
    try {
      await invoke("save_workspace_config", { config: updated })
    } catch (e) {
      console.error("Error saving workspace config:", e)
    }
  }

  const pickDirectory = async () => {
    try {
      const selected = await open({ directory: true, multiple: false })
      if (selected && typeof selected === "string") {
        const updated = { ...config, working_directory: selected }
        await saveConfig(updated)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground font-mono">
          GeoNexus — {t.config.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.config.subtitle}
        </p>
      </div>

      {/* Selector de Idioma / Language */}
      <SettingGroup
        icon={GlobeIcon}
        title={t.config.languageSectionTitle}
        description={t.config.languageSectionDesc}
      >
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setLanguage("es")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer",
              language === "es"
                ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-2xs"
                : "border-border/80 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-sm">🇪🇸</span>
            <span>Español</span>
            {language === "es" && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                Activo
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer",
              language === "en"
                ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-2xs"
                : "border-border/80 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-sm">🇺🇸</span>
            <span>English</span>
            {language === "en" && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                Active
              </span>
            )}
          </button>
        </div>
      </SettingGroup>

      <SettingGroup
        icon={FolderIcon}
        title="Directorio de Trabajo (Working Directory)"
        description="Carpeta base del proyecto donde el agente lee y escribe archivos"
      >
        <div className="flex gap-2">
          <code className="flex-1 truncate rounded-xl border border-border/70 bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
            {config.working_directory}
          </code>
          <Button
            onClick={pickDirectory}
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs"
          >
            Seleccionar
          </Button>
        </div>
      </SettingGroup>

      <SettingGroup
        icon={TerminalIcon}
        title="Modo de Ejecución de Código"
        description="Nivel de permisos y acceso del agente al sistema operativo"
      >
        <Field label="Modo de Acceso">
          <select
            value={config.code_execution_mode}
            onChange={async (e) => {
              const updated = {
                ...config,
                code_execution_mode: e.target.value as WorkspaceConfig["code_execution_mode"],
              }
              await saveConfig(updated)
            }}
            className="mt-1 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary/50"
          >
            <option value="project">Proyecto (acotado al directorio de trabajo actual)</option>
            <option value="global">Global (acceso completo a la máquina)</option>
            <option value="disabled">Desactivado (sin ejecución de comandos)</option>
          </select>
        </Field>
      </SettingGroup>

      <SettingGroup
        icon={ZapIcon}
        title="Shell Persistente"
        description="Mantiene el estado y variables de la terminal entre ejecuciones de comandos"
      >
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs cursor-pointer">
          <span className="font-medium text-foreground">Terminal persistente activa</span>
          <button
            type="button"
            onClick={async () => {
              const updated = { ...config, persistent_shell: !config.persistent_shell }
              await saveConfig(updated)
            }}
            className={`w-10 h-5.5 rounded-full transition-colors relative ${config.persistent_shell ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`block size-4.5 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 ${config.persistent_shell ? "right-0.5" : "left-0.5"}`}
            />
          </button>
        </label>
      </SettingGroup>

      <SettingGroup
        icon={SlidersHorizontalIcon}
        title="Variables de Entorno (Passthrough)"
        description="Variables del sistema que se compartirán con los procesos del agente"
      >
        <Field label="Variables (separadas por coma)">
          <input
            value={config.env_passthrough.join(", ")}
            onChange={async (e) => {
              const updated = {
                ...config,
                env_passthrough: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }
              await saveConfig(updated)
            }}
            placeholder="PATH, PYTHONPATH, NODE_ENV, CUDA_PATH"
            className="mt-1 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:border-primary/50"
          />
        </Field>
      </SettingGroup>
    </div>
  )
}
