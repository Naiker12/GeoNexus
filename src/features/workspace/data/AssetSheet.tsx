import {
  BrainCircuitIcon,
  FileSearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Info, Metric } from "@/features/workspace/data/DataUi"
import type { DataAsset } from "@/features/workspace/data/data-data"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"

type AssetSheetProps = {
  asset?: DataAsset
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetSheet({ asset, open, onOpenChange }: AssetSheetProps) {
  if (!asset) return <Sheet open={open} onOpenChange={onOpenChange} />

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(94vw,28rem)] gap-0 border-border bg-card/95 p-0 text-card-foreground shadow-[0_18px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-[28rem]">
        <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
        <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
              <DocumentAssetIcon kind={asset.kind} className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base">{asset.name}</SheetTitle>
              <SheetDescription className="mt-1">
                {asset.source} / {asset.size} / {asset.updated}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="grid gap-3 overflow-auto p-4 [scrollbar-width:thin]">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Chunks" value={String(asset.chunks)} />
            <Metric label="Vectores" value={String(asset.embeddings)} />
            <Metric label="Nodos" value={String(asset.graphNodes)} />
          </div>

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <h3 className="text-sm font-semibold">Estado operativo</h3>
            <div className="mt-2 grid gap-2 text-sm">
              <Info label="Estado" value={asset.status} />
              <Info label="Cache" value={asset.cacheState} />
              <Info label="Ruta" value={asset.location} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <h3 className="text-sm font-semibold">Lineage</h3>
            <div className="mt-3 grid gap-2">
              {asset.lineage.map((step, index) => (
                <div key={`${step}-${index}`} className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <SheetFooter className="border-t border-border bg-card/95 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">
              <FileSearchIcon className="size-4" />
              Ver fuente
            </Button>
            <Button size="sm">
              <BrainCircuitIcon className="size-4" />
              Usar en IA
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
