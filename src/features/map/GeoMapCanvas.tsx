import { LayersIcon, LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"

export function GeoMapCanvas() {
  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-x border-border bg-[#e8f2ea] [.geo-dark_&]:bg-background [.graphite_&]:bg-background [.midnight_&]:bg-background">
      <MapToolbar />
      <MapArtwork />
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
