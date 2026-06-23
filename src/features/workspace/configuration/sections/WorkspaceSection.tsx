import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { FolderCogIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { SettingGroup, Field } from "@/features/workspace/configuration/settings-ui"

interface WorkspaceConfig {
  working_directory: string
  code_execution_mode: "project" | "global" | "disabled"
  persistent_shell: boolean
  env_passthrough: string[]
  file_read_limit: number
}

export function WorkspaceSection() {
  const [config, setConfig] = useState<WorkspaceConfig>({
    working_directory: ".",
    code_execution_mode: "project",
    persistent_shell: true,
    env_passthrough: [],
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
    const selected = await open({ directory: true, multiple: false })
    if (selected && typeof selected === "string") {
      const updated = { ...config, working_directory: selected }
      await saveConfig(updated)
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          WolframSense — Workspace
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Configura el workspace persistente del agente: directory de trabajo,
          shell persistente, y variables de entorno.
        </p>
      </div>

      <SettingGroup
        icon={FolderCogIcon}
        title="Working Directory"
        description="Carpeta base del proyecto para el agente"
      >
        <div className="flex gap-2">
          <code className="flex-1 truncate rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-muted-foreground">
            {config.working_directory}
          </code>
          <Button onClick={pickDirectory} size="sm" className="h-8">
            Seleccionar
          </Button>
        </div>
      </SettingGroup>

      <SettingGroup
        icon={FolderCogIcon}
        title="Code Execution Mode"
        description="Nivel de acceso del agente al sistema"
      >
        <Field label="Modo">
          <select
            value={config.code_execution_mode}
            onChange={async (e) => {
              const updated = { ...config, code_execution_mode: e.target.value as WorkspaceConfig["code_execution_mode"] }
              await saveConfig(updated)
            }}
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
          >
            <option value="project">Project (scoped al working directory)</option>
            <option value="global">Global (acceso completo)</option>
            <option value="disabled">Disabled</option>
          </select>
        </Field>
      </SettingGroup>

      <SettingGroup
        icon={FolderCogIcon}
        title="Persistent Shell"
        description="Mantener estado del shell entre comandos"
      >
        <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/70 px-2.5 py-2 text-sm">
          <span className="text-muted-foreground">Habilitado</span>
          <button
            onClick={async () => {
              const updated = { ...config, persistent_shell: !config.persistent_shell }
              await saveConfig(updated)
            }}
            className={`w-11 h-6 rounded-full transition-colors ${config.persistent_shell ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${config.persistent_shell ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </label>
      </SettingGroup>

      <SettingGroup
        icon={FolderCogIcon}
        title="Environment Passthrough"
        description="Variables de entorno (separadas por coma)"
      >
        <Field label="Variables">
          <input
            value={config.env_passthrough.join(",")}
            onChange={async (e) => {
              const updated = {
                ...config,
                env_passthrough: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              }
              await saveConfig(updated)
            }}
            placeholder="PATH,PYTHONPATH,NODE_ENV"
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
          />
        </Field>
      </SettingGroup>
    </div>
  )
}
