import type { DiscoveredAsset } from "@/types/agents"
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<string, string> = {
  pdf: "📄", docx: "📝", shp: "🗺️", gpkg: "🗄️",
  geojson: "🌐", tif: "🖼️", xlsx: "📊",
}

export function DiscoveryView({ assets }: { assets: DiscoveredAsset[] }) {
  if (assets.length === 0) return null

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
        Assets descubiertos ({assets.length})
      </h3>
      <div className="space-y-1.5">
        {assets.map((asset) => (
          <div key={asset.id} className="flex items-center gap-2 text-xs">
            <span className="text-sm">{TYPE_ICONS[asset.type] ?? "📁"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{asset.name}</p>
              <p className="text-muted-foreground">
                {asset.source.type}
                {asset.size && ` · ${(asset.size / 1024).toFixed(0)}KB`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
