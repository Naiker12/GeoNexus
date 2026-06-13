import { useEffect, useState } from "react"
import { CloudIcon, CheckCircleIcon, XCircleIcon, ClockIcon, Loader2Icon } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { cn } from "@/lib/utils"

type ProviderStatus = {
  id: string
  status: string
}

const providerLabels: Record<string, string> = {
  local: "Carpeta local",
  onedrive: "OneDrive",
  google_drive: "Google Drive",
  sharepoint: "SharePoint",
  dropbox: "Dropbox",
  s3: "S3 / MinIO",
}

const providerIcons: Record<string, string> = {
  local: "🖥",
  onedrive: "☁",
  google_drive: "☁",
  sharepoint: "🏢",
  dropbox: "📦",
  s3: "🗄",
}

function statusIcon(status: string) {
  switch (status) {
    case "available":
      return <CheckCircleIcon className="size-4 text-emerald-500" />
    case "pending_oauth_phase5":
      return <ClockIcon className="size-4 text-amber-500" />
    case "pending_credentials":
      return <XCircleIcon className="size-4 text-destructive" />
    default:
      return <ClockIcon className="size-4 text-muted-foreground" />
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "available":
      return "Disponible"
    case "pending_oauth_phase5":
      return "Requiere OAuth"
    case "pending_credentials":
      return "Requiere credenciales"
    default:
      return status
  }
}

export function CloudProvidersPanel() {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<{ provider_status: Record<string, string> }>("init_containers_mcp")
      .then((res) => {
        const list = Object.entries(res.provider_status).map(([id, status]) => ({ id, status }))
        setProviders(list)
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      <div className="p-3">
        <div className="flex items-center gap-2">
          <CloudIcon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Estado de proveedores cloud</h2>
          {loading && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs",
                  p.status === "available"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-border bg-background/50"
                )}
              >
                <span className="text-base">{providerIcons[p.id] ?? "☁"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{providerLabels[p.id] ?? p.id}</p>
                  <p className="text-[0.62rem] text-muted-foreground">{statusLabel(p.status)}</p>
                </div>
                {statusIcon(p.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
