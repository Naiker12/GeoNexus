import { useState, useCallback } from "react"
import { listMcpServers, pingMcpServer, listMcpTools } from "@/api/mcp"

export type TerminalLineType = "input" | "output" | "error" | "info" | "success"

export interface TerminalLine {
  id: string
  type: TerminalLineType
  text: string
  timestamp: string
}

function mkLine(type: TerminalLineType, text: string): TerminalLine {
  return {
    id: crypto.randomUUID(),
    type,
    text,
    timestamp: new Date().toLocaleTimeString("es-CO", { hour12: false }),
  }
}

export function useMcpTerminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    mkLine("info", 'GeoNexus MCP Terminal · escribe "help" para ver comandos'),
  ])
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  const addLine = useCallback((type: TerminalLineType, text: string) => {
    setLines(prev => [...prev, mkLine(type, text)])
  }, [])

  const execute = useCallback(async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return

    setHistory(prev => [trimmed, ...prev])
    setHistoryIdx(-1)
    addLine("input", `$ ${trimmed}`)

    const [cmd, ...args] = trimmed.split(/\s+/)

    if (cmd === "clear") {
      setLines([])
      return
    }

    if (cmd === "help") {
      addLine("info", `Comandos disponibles:
  help            → este mensaje
  list            → listar servidores MCP
  ping <id>       → hacer ping a un servidor
  tools <id>      → listar tools de un servidor
  status          → estado global del router
  clear           → limpiar terminal`)
      return
    }

    if (cmd === "list") {
      try {
        const servers = await listMcpServers()
        if (servers.length === 0) {
          addLine("info", "No hay servidores registrados")
        } else {
          for (const s of servers) {
            addLine(
              s.status === "online" ? "success" : "info",
              `  ${s.id.padEnd(20)} ${s.status.padEnd(10)} ${s.latency_ms ? `${s.latency_ms}ms` : "—"}`
            )
          }
        }
      } catch (err) {
        addLine("error", `Error: ${err}`)
      }
      return
    }

    if (cmd === "ping" && args[0]) {
      const serverId = args[0]
      addLine("info", `Haciendo ping a ${serverId}...`)
      try {
        const result = await pingMcpServer(serverId)
        if (result.online) {
          addLine("success", `✓ ${serverId} online · ${result.latency_ms}ms`)
        } else {
          addLine("error", `✗ ${serverId} sin respuesta · ${result.error}`)
        }
      } catch (err) {
        addLine("error", `Error: ${err}`)
      }
      return
    }

    if (cmd === "tools" && args[0]) {
      const serverId = args[0]
      try {
        const tools = await listMcpTools(serverId)
        if (tools.length === 0) {
          addLine("info", `  ${serverId}: sin tools registradas`)
        } else {
          for (const t of tools) {
            addLine("info", `  ${t.name.padEnd(20)} ${t.status.padEnd(10)} ${t.category ?? ""}`)
          }
        }
      } catch (err) {
        addLine("error", `Error: ${err}`)
      }
      return
    }

    addLine("error", `Comando desconocido: "${cmd}". Escribe "help".`)
  }, [addLine])

  return { lines, history, historyIdx, setHistoryIdx, execute, clear: () => setLines([]) }
}
