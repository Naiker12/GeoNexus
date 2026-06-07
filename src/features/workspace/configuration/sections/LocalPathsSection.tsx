import { FolderCogIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { LocalPathDialogContent } from "@/features/workspace/configuration/LocalPathDialog"
import { localPaths } from "@/features/workspace/configuration/settings-data"

export function LocalPathsSection() {
  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Rutas locales
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Ubicaciones que la app usa para datos, memoria y configuración.
        </p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/70">
        {localPaths.map((path) => (
          <article
            key={path.label}
            className="grid gap-2 px-3 py-2.5 md:grid-cols-[9rem_minmax(0,1fr)_auto] md:items-center"
          >
            <div>
              <p className="text-sm font-medium">{path.label}</p>
              <p className="text-xs text-muted-foreground">{path.detail}</p>
            </div>
            <code className="truncate rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
              {path.value}
            </code>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="h-7"
                >
                  <FolderCogIcon className="size-4" />
                  Cambiar
                </Button>
              </DialogTrigger>
              <LocalPathDialogContent
                name={path.label}
                value={path.value}
                detail={path.detail}
              />
            </Dialog>
          </article>
        ))}
      </div>
    </div>
  )
}
