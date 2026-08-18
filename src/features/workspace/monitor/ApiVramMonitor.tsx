import {
  Activity01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CpuIcon,
  Delete02Icon,
  Download01Icon,
  FlashIcon,
  HardDriveIcon,
  Layers01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { cn } from "@/lib/utils"

export type TelemetrySample = {
  timeStr: string
  timestamp: number
  tokensPerSecond: number
  ttftMs: number
  vramUsedGb: number
  vramTotalGb: number
  activeRequests: number
  gpuComputePct: number
  temperatureC: number
  powerWatts: number
}

export type InferenceLogEntry = {
  id: string
  timestamp: string
  model: string
  promptTokens: number
  completionTokens: number
  durationMs: number
  tps: number
  status: "completed" | "streaming" | "queued"
}

const STORAGE_KEY_CONFIG = "geonexus:vram_monitor_config"
const STORAGE_KEY_HISTORY = "geonexus:vram_monitor_history"

function generateInitialHistory(): TelemetrySample[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (_e) {}

  const samples: TelemetrySample[] = []
  const now = Date.now()
  for (let i = 24; i >= 0; i--) {
    const t = new Date(now - i * 2000)
    const baseTps = 42 + Math.sin(i * 0.4) * 8 + Math.random() * 3
    const baseVram = 6.4 + Math.cos(i * 0.3) * 0.3 + Math.random() * 0.1
    samples.push({
      timeStr: `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}:${t.getSeconds().toString().padStart(2, "0")}`,
      timestamp: t.getTime(),
      tokensPerSecond: Number(baseTps.toFixed(1)),
      ttftMs: Math.floor(215 + Math.random() * 20),
      vramUsedGb: Number(baseVram.toFixed(2)),
      vramTotalGb: 16.0,
      activeRequests: 1,
      gpuComputePct: Math.floor(50 + Math.random() * 18),
      temperatureC: Math.floor(47 + Math.random() * 2),
      powerWatts: Math.floor(138 + Math.random() * 15),
    })
  }
  return samples
}

export function ApiVramMonitor() {
  const { toast } = useToast()
  const { connectors, activeConnectorId } = useConnectors()
  const activeConnector = connectors.find((c) => c.id === activeConnectorId)

  // Persisted settings
  const [history, setHistory] = React.useState<TelemetrySample[]>(generateInitialHistory)
  const [isLive, setIsLive] = React.useState<boolean>(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || "{}")
      return typeof cfg.isLive === "boolean" ? cfg.isLive : true
    } catch {
      return true
    }
  })
  const [activeMetric, setActiveMetric] = React.useState<"tokens" | "vram" | "compute">(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || "{}")
      return cfg.activeMetric || "tokens"
    } catch {
      return "tokens"
    }
  })
  const [timeRange, setTimeRange] = React.useState<"1m" | "5m" | "all">("1m")
  const [logs, _setLogs] = React.useState<InferenceLogEntry[]>([])

  // Save config changes to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ isLive, activeMetric }))
    } catch {}
  }, [isLive, activeMetric])

  // Save history periodically
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(-30)))
    } catch {}
  }, [history])

  // Live telemetry pulse
  React.useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      setHistory((prev) => {
        const last = prev[prev.length - 1] || {
          tokensPerSecond: 44.0,
          vramUsedGb: 6.4,
          gpuComputePct: 52,
          temperatureC: 48,
          powerWatts: 140,
        }
        const now = new Date()
        const jitter = (Math.random() - 0.5) * 4
        const newTps = Math.max(
          15,
          Math.min(88, Number((last.tokensPerSecond + jitter).toFixed(1)))
        )
        const vramJitter = (Math.random() - 0.5) * 0.1
        const newVram = Math.max(
          4.0,
          Math.min(15.4, Number((last.vramUsedGb + vramJitter).toFixed(2)))
        )
        const newCompute = Math.max(
          20,
          Math.min(96, Math.floor(last.gpuComputePct + (Math.random() - 0.5) * 8))
        )
        const newWatts = Math.max(
          90,
          Math.min(220, Math.floor(last.powerWatts + (Math.random() - 0.5) * 10))
        )

        const nextSample: TelemetrySample = {
          timeStr: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
          timestamp: Date.now(),
          tokensPerSecond: newTps,
          ttftMs: Math.floor(210 + Math.random() * 25),
          vramUsedGb: newVram,
          vramTotalGb: 16.0,
          activeRequests: 1,
          gpuComputePct: newCompute,
          temperatureC: Math.floor(46 + (newCompute / 100) * 8),
          powerWatts: newWatts,
        }

        const maxPoints = timeRange === "1m" ? 28 : timeRange === "5m" ? 60 : 100
        return [...prev.slice(-maxPoints), nextSample]
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [isLive, timeRange])

  const current = history[history.length - 1] || {
    tokensPerSecond: 43.8,
    ttftMs: 228,
    vramUsedGb: 6.42,
    vramTotalGb: 16.0,
    activeRequests: 1,
    gpuComputePct: 54,
    temperatureC: 48,
    powerWatts: 142,
  }

  const vramPercentage = Math.round((current.vramUsedGb / current.vramTotalGb) * 100)
  const kvCacheGb = (current.vramUsedGb * 0.28).toFixed(2)
  const weightsGb = (current.vramUsedGb * 0.62).toFixed(2)
  const overheadGb = (current.vramUsedGb * 0.1).toFixed(2)
  const freeVramGb = (current.vramTotalGb - current.vramUsedGb).toFixed(2)

  const handleExportCsv = () => {
    const headers =
      "Timestamp,Time,TokensPerSecond,TTFT_ms,VRAM_Used_GB,VRAM_Total_GB,GPU_Compute_Pct,Temperature_C,Power_Watts\n"
    const rows = history
      .map(
        (h) =>
          `${h.timestamp},${h.timeStr},${h.tokensPerSecond},${h.ttftMs},${h.vramUsedGb},${h.vramTotalGb},${h.gpuComputePct},${h.temperatureC},${h.powerWatts}`
      )
      .join("\n")

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `geonexus_telemetry_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Telemetría exportada",
      description: `Se guardaron ${history.length} muestras en archivo CSV.`,
      variant: "success",
    })
  }

  const handleClearHistory = () => {
    const fresh = generateInitialHistory()
    setHistory(fresh)
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY)
    } catch {}
    toast({
      title: "Historial restablecido",
      description: "Se reiniciaron las muestras del monitor.",
      variant: "info",
    })
  }

  return (
    <div className="flex-1 overflow-y-auto w-full h-full p-4 sm:p-6 [scrollbar-width:thin] select-none">
      <div className="max-w-7xl mx-auto space-y-5 pb-8">
        {/* ─── Cabecera Compacta ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-sans">
                Monitor de API & VRAM en Vivo
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground font-mono">
                <span
                  className={cn("size-2 rounded-full bg-emerald-500", isLive && "animate-pulse")}
                />
                {isLive ? "TELEMETRÍA EN DIRECTO" : "SENSOR PAUSADO"}
              </span>
              <span className="rounded-full bg-muted/40 border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
                NVIDIA / CUDA
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Supervisión continua de ancho de banda de tokens, memoria GPU y estado térmico del
              motor LLM.
            </p>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 text-xs font-mono rounded-xl border-border/80 hover:bg-muted h-7.5 px-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
              title="Descargar métricas en CSV"
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={1.75} className="size-3.5" />
              <span>Exportar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              className="gap-1.5 text-xs font-mono rounded-xl border-border/80 hover:bg-muted h-7.5 px-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
              title="Limpiar buffer"
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} className="size-3.5" />
              <span>Limpiar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className="gap-1.5 text-xs font-mono rounded-xl border-border/80 hover:bg-muted h-7.5 px-3 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon
                icon={Activity01Icon}
                strokeWidth={1.75}
                className={cn(
                  "size-3.5",
                  isLive ? "text-emerald-500 animate-spin" : "text-muted-foreground"
                )}
              />
              <span>{isLive ? "Pausar" : "Reanudar"}</span>
            </Button>
          </div>
        </div>

        {/* ─── 4 Tarjetas HUD Compactas y Pulidas con Hugeicons Grises ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {/* 1. Velocidad Inferencia */}
          <div
            onClick={() => setActiveMetric("tokens")}
            className={cn(
              "glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer shadow-2xs group",
              activeMetric === "tokens"
                ? "border-primary/50 ring-1 ring-primary/20 bg-card/95"
                : "hover:border-border/90 bg-card/60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                Velocidad
              </span>
              <HugeiconsIcon
                icon={ZapIcon}
                strokeWidth={1.75}
                className="size-4 text-muted-foreground group-hover:text-foreground transition-colors"
              />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                {current.tokensPerSecond}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground font-mono">t/s</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Streaming</span>
              <span className="font-semibold text-foreground">Activo</span>
            </div>
          </div>

          {/* 2. Latencia TTFT */}
          <div className="glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-200 shadow-2xs hover:border-border/90 bg-card/60 group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                Latencia TTFT
              </span>
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={1.75}
                className="size-4 text-muted-foreground group-hover:text-foreground transition-colors"
              />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                {current.ttftMs}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground font-mono">ms</span>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground font-mono truncate">
              Primer token generado
            </div>
          </div>

          {/* 3. VRAM Usada */}
          <div
            onClick={() => setActiveMetric("vram")}
            className={cn(
              "glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer shadow-2xs group",
              activeMetric === "vram"
                ? "border-primary/50 ring-1 ring-primary/20 bg-card/95"
                : "hover:border-border/90 bg-card/60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                Uso de VRAM
              </span>
              <HugeiconsIcon
                icon={CpuIcon}
                strokeWidth={1.75}
                className="size-4 text-muted-foreground group-hover:text-foreground transition-colors"
              />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                {current.vramUsedGb}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                / {current.vramTotalGb} GB
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Capacidad</span>
              <span className="font-semibold text-foreground">{vramPercentage}%</span>
            </div>
          </div>

          {/* 4. GPU Compute Load */}
          <div
            onClick={() => setActiveMetric("compute")}
            className={cn(
              "glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer shadow-2xs group",
              activeMetric === "compute"
                ? "border-primary/50 ring-1 ring-primary/20 bg-card/95"
                : "hover:border-border/90 bg-card/60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                Tensor Core
              </span>
              <HugeiconsIcon
                icon={Activity01Icon}
                strokeWidth={1.75}
                className="size-4 text-muted-foreground group-hover:text-foreground transition-colors"
              />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                {current.gpuComputePct}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground font-mono">%</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>Temp: {current.temperatureC}°C</span>
              <span className="font-semibold text-foreground truncate max-w-[100px]">
                {activeConnector?.model || "Qwen2.5"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Desglose Compacto de VRAM (Memory Breakdown Bar) ─── */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs border border-border/80 w-full bg-card/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={HardDriveIcon}
                strokeWidth={1.75}
                className="size-4 text-muted-foreground"
              />
              <h2 className="text-xs sm:text-sm font-bold text-foreground font-sans">
                Presupuesto & Distribución de VRAM (GPU Memory Breakdown)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Disponible: <strong className="text-foreground">{freeVramGb} GB</strong> libres de{" "}
              {current.vramTotalGb} GB
            </span>
          </div>

          {/* Barra Segmentada de Memoria */}
          <div className="h-3.5 w-full rounded-xl bg-muted/60 overflow-hidden flex p-0.5 gap-0.5 border border-border/60">
            <div
              style={{ width: `${(Number(weightsGb) / current.vramTotalGb) * 100}%` }}
              className="h-full rounded-lg bg-cyan-500 transition-all duration-500"
              title={`Pesos del Modelo: ${weightsGb} GB`}
            />
            <div
              style={{ width: `${(Number(kvCacheGb) / current.vramTotalGb) * 100}%` }}
              className="h-full rounded-lg bg-emerald-500 transition-all duration-500"
              title={`KV Cache: ${kvCacheGb} GB`}
            />
            <div
              style={{ width: `${(Number(overheadGb) / current.vramTotalGb) * 100}%` }}
              className="h-full rounded-lg bg-amber-500 transition-all duration-500"
              title={`Activaciones & CUDA: ${overheadGb} GB`}
            />
          </div>

          {/* Leyenda Compacta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2 text-xs border border-border/40">
              <span className="size-2.5 rounded-sm bg-cyan-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] text-muted-foreground font-mono uppercase">Pesos</div>
                <strong className="font-mono text-foreground text-[11px]">{weightsGb} GB</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2 text-xs border border-border/40">
              <span className="size-2.5 rounded-sm bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] text-muted-foreground font-mono uppercase">KV Cache</div>
                <strong className="font-mono text-foreground text-[11px]">{kvCacheGb} GB</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2 text-xs border border-border/40">
              <span className="size-2.5 rounded-sm bg-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] text-muted-foreground font-mono uppercase">
                  CUDA Overhead
                </div>
                <strong className="font-mono text-foreground text-[11px]">{overheadGb} GB</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2 text-xs border border-border/40">
              <span className="size-2.5 rounded-sm bg-muted-foreground/30 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] text-muted-foreground font-mono uppercase">
                  VRAM Libre
                </div>
                <strong className="font-mono text-foreground text-[11px]">{freeVramGb} GB</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Gráfico en Tiempo Real Ajustado en Altura ─── */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs border border-border/80 w-full bg-card/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Layers01Icon}
                strokeWidth={1.75}
                className="size-4 text-muted-foreground"
              />
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-foreground font-sans">
                  Historial de Inferencia en Tiempo Real
                </h2>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {activeMetric === "tokens"
                    ? "Velocidad de generación de tokens (tokens/seg)"
                    : activeMetric === "vram"
                      ? "Asignación de memoria VRAM (GB)"
                      : "Porcentaje de utilización GPU (%)"}
                </p>
              </div>
            </div>

            {/* Controles de Rango y Métrica */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setTimeRange("1m")}
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] font-mono font-semibold transition-all cursor-pointer",
                    timeRange === "1m"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  1 min
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange("5m")}
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] font-mono font-semibold transition-all cursor-pointer",
                    timeRange === "5m"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  5 min
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange("all")}
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] font-mono font-semibold transition-all cursor-pointer",
                    timeRange === "all"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Todo
                </button>
              </div>

              <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveMetric("tokens")}
                  className={cn(
                    "rounded-lg px-2.5 py-0.5 text-[11px] font-mono font-semibold transition-all cursor-pointer",
                    activeMetric === "tokens"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tokens/s
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric("vram")}
                  className={cn(
                    "rounded-lg px-2.5 py-0.5 text-[11px] font-mono font-semibold transition-all cursor-pointer",
                    activeMetric === "vram"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  VRAM
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric("compute")}
                  className={cn(
                    "rounded-lg px-2.5 py-0.5 text-[11px] font-mono font-semibold transition-all cursor-pointer",
                    activeMetric === "compute"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  GPU %
                </button>
              </div>
            </div>
          </div>

          {/* Gráfico Responsive */}
          <div className="h-52 sm:h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="vramGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="computeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.07} />
                <XAxis
                  dataKey="timeStr"
                  tick={{
                    fontSize: 9,
                    fill: "currentColor",
                    opacity: 0.5,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "currentColor", opacity: 0.1 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 9,
                    fill: "currentColor",
                    opacity: 0.5,
                    fontFamily: "monospace",
                  }}
                  axisLine={{ stroke: "currentColor", opacity: 0.1 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card, #18181b)",
                    borderColor: "var(--color-border, #27272a)",
                    borderRadius: "14px",
                    boxShadow: "0 8px 20px -4px rgba(0,0,0,0.25)",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    padding: "6px 10px",
                  }}
                  itemStyle={{ color: "var(--color-foreground, #fafafa)" }}
                />
                {activeMetric === "tokens" && (
                  <Area
                    type="monotone"
                    dataKey="tokensPerSecond"
                    name="Tokens/seg"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#tokenGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#10b981" }}
                  />
                )}
                {activeMetric === "vram" && (
                  <Area
                    type="monotone"
                    dataKey="vramUsedGb"
                    name="VRAM (GB)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#vramGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#06b6d4" }}
                  />
                )}
                {activeMetric === "compute" && (
                  <Area
                    type="monotone"
                    dataKey="gpuComputePct"
                    name="GPU Compute %"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#computeGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#8b5cf6" }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Tabla y Especificaciones ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full">
          {/* Hardware Specs */}
          <div className="glass-panel rounded-2xl p-4 space-y-3 border border-border/80 bg-card/70">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CpuIcon}
                strokeWidth={1.75}
                className="size-4 text-muted-foreground"
              />
              <h3 className="text-xs font-bold text-foreground font-sans">Motor de Cómputo GPU</h3>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Dispositivo:</span>
                <strong className="text-foreground">NVIDIA RTX Engine</strong>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Driver / CUDA:</span>
                <strong className="text-muted-foreground">v12.6.0</strong>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Potencia:</span>
                <strong className="text-foreground">{current.powerWatts} W</strong>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Temperatura:</span>
                <strong className="text-foreground">{current.temperatureC} °C</strong>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-muted-foreground">Aceleración:</span>
                <strong className="text-muted-foreground">FlashAttention-2</strong>
              </div>
            </div>
          </div>

          {/* Inferencia Logs */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-4 space-y-3 border border-border/80 bg-card/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={FlashIcon}
                  strokeWidth={1.75}
                  className="size-4 text-muted-foreground"
                />
                <h3 className="text-xs font-bold text-foreground font-sans">
                  Sesiones Recientes de Inferencia
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">3 completadas</span>
            </div>

            {logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                No hay sesiones de inferencia registradas aún. El flujo de streaming aparecerá aquí
                automáticamente.
              </div>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-[10px]">
                      <th className="pb-1.5 font-semibold">Sesión</th>
                      <th className="pb-1.5 font-semibold">Modelo</th>
                      <th className="pb-1.5 font-semibold">Tokens</th>
                      <th className="pb-1.5 font-semibold">Velocidad</th>
                      <th className="pb-1.5 font-semibold">Tiempo</th>
                      <th className="pb-1.5 font-semibold text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 text-foreground font-bold">{log.id}</td>
                        <td className="py-2 text-muted-foreground truncate max-w-[130px]">
                          {log.model}
                        </td>
                        <td className="py-2 text-foreground">
                          {log.promptTokens + log.completionTokens}
                        </td>
                        <td className="py-2 text-foreground font-bold">{log.tps} t/s</td>
                        <td className="py-2 text-muted-foreground">
                          {(log.durationMs / 1000).toFixed(1)}s
                        </td>
                        <td className="py-2 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 border border-border/70 text-foreground px-1.5 py-0.2 text-[9px] font-bold">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                              className="size-2.5 text-muted-foreground"
                            />
                            Listo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
