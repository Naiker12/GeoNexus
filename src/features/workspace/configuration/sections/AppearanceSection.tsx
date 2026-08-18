import * as React from "react"
import {
  CheckIcon,
  LaptopIcon,
  MoonIcon,
  PaletteIcon,
  SparklesIcon,
  SunIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { themePresets as builtInPresets } from "@/constants/workspace"
import { cn } from "@/lib/utils"
import type { ThemePreset, ThemePresetId } from "@/types/workspace-types"

const CUSTOM_THEMES_KEY = "geonexus:custom-themes"

type CustomThemePreset = ThemePreset & { cssVariables: Record<string, string> }

function loadCustomThemes(): CustomThemePreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (raw) return JSON.parse(raw) as CustomThemePreset[]
  } catch {}
  return []
}

function saveCustomThemes(themes: CustomThemePreset[]) {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
  } catch {}
}

function injectCustomTheme(id: string, variables: Record<string, string>) {
  const existing = document.getElementById(`theme-${id}`)
  if (existing) existing.remove()
  const style = document.createElement("style")
  style.id = `theme-${id}`
  const cssVars = Object.entries(variables)
    .map(([key, val]) => `  --${key}: ${val};`)
    .join("\n")
  style.textContent = `.${id} {\n${cssVars}\n}`
  document.head.appendChild(style)
}

// Configuración de estilo visual y colores para la maqueta interactiva
const themeStyles: Record<
  string,
  {
    bg: string
    sidebarBg: string
    cardBg: string
    border: string
    accent: string
    text: string
    palette: string[]
    type: "dark" | "light"
  }
> = {
  "geo-dark": {
    bg: "bg-[#0b0f0b]",
    sidebarBg: "bg-[#111611]",
    cardBg: "bg-[#161c16]",
    border: "border-[#223022]",
    accent: "bg-[#10b981]",
    text: "text-emerald-400",
    palette: ["#0b0f0b", "#111611", "#10b981", "#223022"],
    type: "dark",
  },
  "geo-light": {
    bg: "bg-[#f8fafc]",
    sidebarBg: "bg-[#ffffff]",
    cardBg: "bg-[#ffffff]",
    border: "border-[#e2e8f0]",
    accent: "bg-[#0f172a]",
    text: "text-slate-800",
    palette: ["#f8fafc", "#ffffff", "#0f172a", "#e2e8f0"],
    type: "light",
  },
  emerald: {
    bg: "bg-[#f0fdf4]",
    sidebarBg: "bg-[#ffffff]",
    cardBg: "bg-[#ffffff]",
    border: "border-[#bbf7d0]",
    accent: "bg-[#059669]",
    text: "text-emerald-700",
    palette: ["#f0fdf4", "#ffffff", "#059669", "#bbf7d0"],
    type: "light",
  },
  cobalt: {
    bg: "bg-[#f0f9ff]",
    sidebarBg: "bg-[#ffffff]",
    cardBg: "bg-[#ffffff]",
    border: "border-[#bae6fd]",
    accent: "bg-[#0284c7]",
    text: "text-sky-700",
    palette: ["#f0f9ff", "#ffffff", "#0284c7", "#bae6fd"],
    type: "light",
  },
  midnight: {
    bg: "bg-[#030712]",
    sidebarBg: "bg-[#07111f]",
    cardBg: "bg-[#0f172a]",
    border: "border-[#1e293b]",
    accent: "bg-[#06b6d4]",
    text: "text-cyan-400",
    palette: ["#030712", "#07111f", "#06b6d4", "#1e293b"],
    type: "dark",
  },
  lagoon: {
    bg: "bg-[#f0fdfa]",
    sidebarBg: "bg-[#ffffff]",
    cardBg: "bg-[#ffffff]",
    border: "border-[#99f6e4]",
    accent: "bg-[#0d9488]",
    text: "text-teal-700",
    palette: ["#f0fdfa", "#ffffff", "#0d9488", "#99f6e4"],
    type: "light",
  },
  graphite: {
    bg: "bg-[#09090b]",
    sidebarBg: "bg-[#18181b]",
    cardBg: "bg-[#27272a]",
    border: "border-[#3f3f46]",
    accent: "bg-[#a1a1aa]",
    text: "text-zinc-200",
    palette: ["#09090b", "#18181b", "#a1a1aa", "#3f3f46"],
    type: "dark",
  },
  terra: {
    bg: "bg-[#fafaf9]",
    sidebarBg: "bg-[#ffffff]",
    cardBg: "bg-[#ffffff]",
    border: "border-[#e7e5e4]",
    accent: "bg-[#78716c]",
    text: "text-stone-700",
    palette: ["#fafaf9", "#ffffff", "#78716c", "#e7e5e4"],
    type: "light",
  },
}

export function AppearanceSection() {
  const [activeTheme, setActiveTheme] = React.useState<ThemePresetId>(() => {
    return (localStorage.getItem("geonexus.theme") as ThemePresetId) || "geo-light"
  })
  const [filter, setFilter] = React.useState<"all" | "dark" | "light">("all")
  const [customThemes, setCustomThemes] = React.useState<CustomThemePreset[]>(loadCustomThemes)

  const allPresets = React.useMemo(() => [...builtInPresets, ...customThemes], [customThemes])

  const filteredPresets = React.useMemo(() => {
    return allPresets.filter((theme) => {
      const themeMeta = themeStyles[theme.id] || { type: "dark" }
      if (filter === "dark") return themeMeta.type === "dark"
      if (filter === "light") return themeMeta.type === "light"
      return true
    })
  }, [allPresets, filter])

  const handleThemeSelect = React.useCallback(
    (id: ThemePresetId) => {
      setActiveTheme(id)
      localStorage.setItem("geonexus.theme", id)

      const custom = customThemes.find((t) => t.id === id)
      if (custom) {
        injectCustomTheme(id, custom.cssVariables)
      }

      // Remove previous theme classes and apply new one
      const allClassNames = builtInPresets.map((p) => p.id)
      document.documentElement.classList.remove(...allClassNames)
      document.documentElement.classList.add(id)

      window.dispatchEvent(new CustomEvent("geonexus:theme-changed", { detail: { theme: id } }))
    },
    [customThemes]
  )

  const handleImport = React.useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as {
          id: string
          name: string
          variables: Record<string, string>
        }
        if (!parsed.id || !parsed.name || !parsed.variables) {
          alert("Formato inválido. Debe contener: id, name, variables")
          return
        }
        const newTheme: CustomThemePreset = {
          id: parsed.id,
          name: parsed.name,
          description: `Tema importado: ${parsed.name}`,
          swatch: "bg-gradient-to-r from-primary/40 to-primary",
          tone: "Custom",
          cssVariables: parsed.variables,
        }
        const updated = [...customThemes, newTheme]
        setCustomThemes(updated)
        saveCustomThemes(updated)
        injectCustomTheme(parsed.id, parsed.variables)
        handleThemeSelect(parsed.id as ThemePresetId)
      } catch {
        alert("Error al leer el archivo JSON.")
      }
    }
    input.click()
  }, [customThemes, handleThemeSelect])

  return (
    <div className="space-y-6">
      {/* Cabecera y Selector de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground font-mono">
            GeoNexus — Apariencia y Temas
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Personaliza el tema visual, colores de acento y contraste para toda la aplicación.
          </p>
        </div>

        {/* Filtro de Temas */}
        <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card p-1 self-start">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
              filter === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilter("dark")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
              filter === "dark"
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <MoonIcon className="size-3" />
            <span>Oscuros</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("light")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
              filter === "light"
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <SunIcon className="size-3" />
            <span>Claros</span>
          </button>
        </div>
      </div>

      {/* Grid de Maquetas de Temas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((theme) => {
          const isActive = activeTheme === theme.id
          const meta = themeStyles[theme.id] || {
            bg: "bg-background",
            sidebarBg: "bg-muted/30",
            cardBg: "bg-card",
            border: "border-border",
            accent: "bg-primary",
            text: "text-foreground",
            palette: ["#111", "#222", "#444", "#888"],
            type: "dark",
          }

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleThemeSelect(theme.id)}
              className={cn(
                "group relative flex flex-col rounded-3xl border text-left transition-all overflow-hidden p-3 shadow-2xs cursor-pointer",
                isActive
                  ? "border-primary ring-2 ring-primary/20 bg-card"
                  : "border-border/70 bg-card/60 hover:border-border hover:bg-card hover:shadow-xs"
              )}
            >
              {/* ─── Maqueta Visual de la Ventana / UI Preview ─── */}
              <div
                className={cn(
                  "relative w-full h-28 rounded-2xl border overflow-hidden p-2 flex flex-col justify-between transition-transform duration-300 group-hover:scale-[1.01]",
                  meta.bg,
                  meta.border
                )}
              >
                {/* Header de la Maqueta con botones de ventana */}
                <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-red-400/80" />
                    <span className="size-1.5 rounded-full bg-amber-400/80" />
                    <span className="size-1.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className={cn("text-[8px] font-mono opacity-60", meta.text)}>
                    {theme.name}
                  </span>
                </div>

                {/* Cuerpo de la Maqueta (Sidebar + Canvas + Composer) */}
                <div className="flex gap-2 flex-1 pt-1.5">
                  {/* Mini Sidebar */}
                  <div
                    className={cn(
                      "w-12 h-full rounded-lg border p-1 flex flex-col gap-1",
                      meta.sidebarBg,
                      meta.border
                    )}
                  >
                    <div className={cn("h-1.5 w-full rounded-xs", meta.accent)} />
                    <div className="h-1 w-3/4 rounded-xs bg-muted-foreground/30" />
                    <div className="h-1 w-1/2 rounded-xs bg-muted-foreground/20" />
                  </div>

                  {/* Mini Chat Workspace */}
                  <div
                    className={cn(
                      "flex-1 h-full rounded-lg border p-1.5 flex flex-col justify-between",
                      meta.cardBg,
                      meta.border
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className={cn("size-2 rounded-full shrink-0", meta.accent)} />
                        <div className="h-1 w-16 rounded-xs bg-muted-foreground/40" />
                      </div>
                      <div className="h-1 w-full rounded-xs bg-muted-foreground/20" />
                      <div className="h-1 w-4/5 rounded-xs bg-muted-foreground/20" />
                    </div>

                    {/* Mini Floating Composer */}
                    <div
                      className={cn(
                        "h-3 w-full rounded-md border flex items-center justify-between px-1 bg-background/50",
                        meta.border
                      )}
                    >
                      <div className="h-0.5 w-8 rounded-xs bg-muted-foreground/40" />
                      <span className={cn("size-1.5 rounded-full", meta.accent)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Información del Tema y Muestras de Color ─── */}
              <div className="pt-3 px-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground tracking-tight">
                      {theme.name}
                    </span>
                    <span className="rounded-full bg-muted/80 border border-border/60 px-1.5 py-0.2 text-[9px] font-mono font-medium text-muted-foreground">
                      {theme.tone}
                    </span>
                  </div>

                  {/* Micro Paleta de 4 Muestras */}
                  <div className="flex items-center gap-1">
                    {meta.palette.map((color, idx) => (
                      <span
                        key={idx}
                        className="size-2.5 rounded-full border border-black/15 dark:border-white/20 shadow-2xs"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {theme.description}
                </p>

                {/* Footer de la tarjeta con estado de activación */}
                <div
                  className={cn(
                    "pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-medium transition-colors",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground/60"
                  )}
                >
                  <span>{isActive ? "Activo en el sistema" : "Seleccionar tema"}</span>
                  {isActive && (
                    <div className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {/* Tarjeta de Importar Tema */}
        <button
          type="button"
          onClick={handleImport}
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/70 bg-muted/20 p-6 text-center text-muted-foreground hover:border-primary/50 hover:bg-muted/40 hover:text-foreground transition-all cursor-pointer min-h-[220px]"
        >
          <div className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border/60 mb-2">
            <UploadIcon className="size-5" />
          </div>
          <span className="text-xs font-semibold text-foreground">Importar Tema Propio</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 font-mono max-w-[180px]">
            Carga un archivo JSON con variables CSS personalizadas
          </span>
        </button>
      </div>
    </div>
  )
}
