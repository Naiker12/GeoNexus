import { LayersIcon, LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  activeAssistant,
  layerLegend,
  quickActions,
} from "@/features/workspace/workspace-data"

export function GeoMapCanvas() {
  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-x border-border bg-[#e8f2ea] [.geo-dark_&]:bg-background [.graphite_&]:bg-background [.midnight_&]:bg-background">
      <MapToolbar />
      <MapLegend />
      <MapArtwork />
      <AssistantCard />
    </section>
  )
}

function MapToolbar() {
  const controls = [PlusIcon, MinusIcon, LocateFixedIcon, LayersIcon]

  return (
    <div className="absolute left-6 top-6 z-20 flex flex-col gap-2">
      {controls.map((Icon, index) => (
        <Button
          key={index}
          variant="secondary"
          size="icon-lg"
          className="border border-border bg-card shadow-sm"
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </div>
  )
}

function MapLegend() {
  return (
    <div className="absolute right-6 top-6 z-20 w-56 rounded-lg border border-border bg-card/95 p-4 text-card-foreground shadow-sm backdrop-blur">
      <h2 className="font-semibold">Leyenda</h2>
      <div className="mt-3 space-y-2">
        {layerLegend.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className={cn("size-3 rounded-sm", item.color)} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MapArtwork() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-[38%] bg-[#eef7ef]" />
      <div className="absolute inset-x-0 bottom-[28%] h-4 rotate-[-1deg] bg-sky-200/60" />
      <div className="absolute bottom-[34%] left-[16%] h-28 w-[48%] rotate-[-7deg] bg-emerald-700/20 [clip-path:polygon(6%_18%,62%_0,86%_16%,100%_48%,88%_88%,44%_100%,14%_74%)]" />
      <div className="absolute bottom-[39%] left-[26%] h-8 w-24 rounded bg-emerald-500/35" />
      <div className="absolute bottom-[39%] left-[38%] h-10 w-32 rounded bg-emerald-500/45" />
      <div className="absolute bottom-[33%] left-[31%] h-10 w-32 rounded bg-orange-400/35" />
      <div className="absolute bottom-[33%] left-[52%] h-12 w-24 rounded bg-emerald-500/35" />
      <div className="absolute bottom-[42%] left-[39%] size-4 rounded-full border-2 border-white bg-emerald-600 shadow-sm" />
      <div className="absolute bottom-[37%] left-[31%] size-4 rounded-full border-2 border-white bg-orange-500 shadow-sm" />
      <div className="absolute bottom-[38%] left-[61%] size-4 rounded-full border-2 border-white bg-sky-500 shadow-sm" />
      <span className="absolute bottom-[34%] left-[55%] text-[10px] text-slate-500">
        Rio Magdalena
      </span>
    </div>
  )
}

function AssistantCard() {
  return (
    <article className="absolute bottom-6 left-6 z-20 w-[min(24rem,calc(100%-3rem))] rounded-lg border border-border bg-card/95 p-5 text-card-foreground shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 [.geo-dark_&]:bg-emerald-500/10 [.geo-dark_&]:text-emerald-300 [.graphite_&]:bg-emerald-500/10 [.graphite_&]:text-emerald-300 [.midnight_&]:bg-emerald-500/10 [.midnight_&]:text-emerald-300">
            IA
          </div>
          <div>
            <h2 className="font-semibold">{activeAssistant.name}</h2>
            <p className="text-xs text-muted-foreground">
              {activeAssistant.connector} / {activeAssistant.model}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-sky-50 px-2.5 py-1 text-sm font-medium text-sky-700 [.geo-dark_&]:bg-sky-500/10 [.geo-dark_&]:text-sky-300 [.graphite_&]:bg-sky-500/10 [.graphite_&]:text-sky-300 [.midnight_&]:bg-sky-500/10 [.midnight_&]:text-sky-300">
          QGIS MCP
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {activeAssistant.insight}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Button key={action.label} variant="outline" size="sm">
            <action.icon className="size-4" />
            {action.label}
          </Button>
        ))}
      </div>
    </article>
  )
}
