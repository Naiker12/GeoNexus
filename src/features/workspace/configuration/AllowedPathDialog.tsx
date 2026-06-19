import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DialogActions } from "@/features/workspace/configuration/DialogActions"
import { FolderOpen, Shield } from "lucide-react"
import type { AllowedPathEntry } from "@/api/filesystem-config"

interface AllowedPathDialogProps {
  open: boolean
  entry?: AllowedPathEntry | null
  onOpenChange: (open: boolean) => void
  onSave: (entry: AllowedPathEntry) => void
}

const LEVELS = [
  { value: "read", label: "Read only" },
  { value: "write", label: "Read + Write" },
  { value: "execute", label: "Execute" },
  { value: "admin", label: "Admin" },
]

export function AllowedPathDialog({ open, entry, onOpenChange, onSave }: AllowedPathDialogProps) {
  const [path, setPath] = React.useState(entry?.path ?? "")
  const [label, setLabel] = React.useState(entry?.label ?? "")
  const [level, setLevel] = React.useState(entry?.level ?? "read")

  React.useEffect(() => {
    if (open) {
      setPath(entry?.path ?? "")
      setLabel(entry?.label ?? "")
      setLevel(entry?.level ?? "read")
    }
  }, [open, entry])

  const handlePickFolder = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const picked = await invoke<string | null>("open_folder_picker")
      if (picked) setPath(picked)
    } catch { /* not in tauri */ }
  }

  const handleSave = () => {
    if (!path.trim()) return
    onSave({
      path: path.trim(),
      level,
      added_at: entry?.added_at ?? new Date().toISOString(),
      label: label.trim() || path.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,38rem)] rounded-lg p-0" aria-describedby={undefined}>
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {entry ? "Edit allowed path" : "Add allowed path"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Configure a directory that GeoNexus can access and its permission level.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form className="grid gap-3 p-4" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Path</label>
            <div className="flex items-center gap-2">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:/Users/me/projects"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handlePickFolder}>
                <FolderOpen className="size-4 mr-1" />
                Browse
              </Button>
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Label</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Project"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Permission level</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogActions
            submitLabel={entry ? "Save" : "Add"}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
