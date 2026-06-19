import * as React from "react"
import { Plus, Trash2, Shield, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SettingGroup, SideMetric } from "@/features/workspace/configuration/settings-ui"
import { AllowedPathDialog } from "@/features/workspace/configuration/AllowedPathDialog"
import { getFilesystemConfig, saveFilesystemConfig } from "@/api/filesystem-config"
import type { AllowedPathEntry } from "@/api/filesystem-config"

const LEVEL_LABELS: Record<string, string> = {
  read: "Read",
  write: "Write",
  execute: "Execute",
  admin: "Admin",
}

const LEVEL_COLORS: Record<string, string> = {
  read: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  write: "bg-green-500/10 text-green-600 dark:text-green-400",
  execute: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  admin: "bg-red-500/10 text-red-600 dark:text-red-400",
}

export function AllowedPathsSection() {
  const [paths, setPaths] = React.useState<AllowedPathEntry[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingEntry, setEditingEntry] = React.useState<AllowedPathEntry | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getFilesystemConfig().then((config) => {
      if (config) setPaths(config.allowed_paths)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const persistPaths = async (updated: AllowedPathEntry[]) => {
    const config = await getFilesystemConfig()
    if (!config) return
    config.allowed_paths = updated
    await saveFilesystemConfig(config)
    setPaths([...updated])
  }

  const handleSaveDialog = (entry: AllowedPathEntry) => {
    const updated = editingEntry
      ? paths.map((p) => p.path === editingEntry.path ? entry : p)
      : [...paths, entry]
    persistPaths(updated)
    setEditingEntry(null)
    setDialogOpen(false)
  }

  const handleDelete = (path: string) => {
    persistPaths(paths.filter((p) => p.path !== path))
  }

  return (
    <SettingGroup
      icon={ShieldCheck}
      title="Allowed paths"
      description="Directories that GeoNexus can access. Each path has a permission level."
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Configured paths</span>
        <Button variant="outline" size="xs" onClick={() => { setEditingEntry(null); setDialogOpen(true) }}>
          <Plus className="size-3.5 mr-1" /> Add path
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-2">Loading...</p>
      ) : paths.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No paths configured yet.
        </p>
      ) : (
        <div className="grid gap-2">
          {paths.map((entry) => (
            <div
              key={entry.path}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Shield className="size-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.label}</p>
                <p className="truncate text-xs text-muted-foreground">{entry.path}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${LEVEL_COLORS[entry.level] || ""}`}>
                {LEVEL_LABELS[entry.level] || entry.level}
              </span>
              <button
                type="button"
                onClick={() => { setEditingEntry(entry); setDialogOpen(true) }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(entry.path)}
                className="text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <SideMetric label="Total paths" value={String(paths.length)} />

      <AllowedPathDialog
        open={dialogOpen}
        entry={editingEntry}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingEntry(null) } }}
        onSave={handleSaveDialog}
      />
    </SettingGroup>
  )
}
