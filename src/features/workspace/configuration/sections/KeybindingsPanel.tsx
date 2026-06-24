import * as React from "react"
import { KeyboardIcon, RotateCcwIcon } from "lucide-react"
import { useKeybindingsStore, type KeybindingAction } from "@/stores/keybindingsStore"

const MOD_KEY_LABEL: Record<string, string> = {
  "CmdOrCtrl": "⌘/Ctrl",
  "Ctrl": "Ctrl",
  "Alt": "Alt",
  "Shift": "⇧",
  "Meta": "⌘",
}

function formatKeys(keys: string): string {
  return keys.split("+").map(k => MOD_KEY_LABEL[k] ?? k).join(" + ")
}

function KeybindingRow({ kb }: { kb: { action: KeybindingAction; label: string; defaultKeys: string; currentKeys: string; category: string } }) {
  const { setKeys, resetKeybinding, bindings } = useKeybindingsStore()
  const [recording, setRecording] = React.useState(false)

  const current = bindings.find(b => b.action === kb.action)
  const keys = current?.currentKeys ?? kb.currentKeys

  const handleStartRecord = React.useCallback(() => {
    setRecording(true)
  }, [])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push("CmdOrCtrl")
    if (e.altKey) parts.push("Alt")
    if (e.shiftKey) parts.push("Shift")
    if (e.key && !["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
      parts.push(key)
    }
    if (parts.length > 0) {
      setKeys(kb.action, parts.join("+"))
      setRecording(false)
    }
  }, [kb.action, setKeys])

  const handleBlur = React.useCallback(() => {
    setRecording(false)
  }, [])

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{kb.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{kb.category}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {recording ? (
          <span
            className="inline-flex items-center rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-mono text-primary animate-pulse"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            onBlur={handleBlur}
          >
            Presiona teclas...
          </span>
        ) : (
          <button
            type="button"
            onClick={handleStartRecord}
            className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            {formatKeys(keys)}
          </button>
        )}
        <button
          type="button"
          onClick={() => resetKeybinding(kb.action)}
          className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          title="Restablecer por defecto"
        >
          <RotateCcwIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function KeybindingsPanel() {
  const bindings = useKeybindingsStore((s) => s.bindings)

  const groups = React.useMemo(() => {
    const map = new Map<string, typeof bindings>()
    for (const kb of bindings) {
      const g = kb.category
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(kb)
    }
    return Array.from(map.entries())
  }, [bindings])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <KeyboardIcon className="size-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Haz clic en un atajo para reasignarlo. Presiona la combinación de teclas deseada.
        </p>
      </div>
      {groups.map(([group, groupBindings]) => (
        <div key={group}>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</h4>
          <div className="flex flex-col gap-1.5">
            {groupBindings.map(kb => (
              <KeybindingRow key={kb.action} kb={kb} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
