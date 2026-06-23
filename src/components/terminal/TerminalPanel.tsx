import * as React from "react"
import { useEffect, useRef } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { invoke } from "@tauri-apps/api/core"
import "@xterm/xterm/css/xterm.css"

interface TerminalPanelProps {
  sessionId?: string
}

export function TerminalPanel({ sessionId = "workspace-main" }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const cwdRef = useRef(".")

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      convertEol: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      cursorBlink: true,
      cursorStyle: "bar",
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#c9d1d9",
        selectionBackground: "#3b5998",
        black: "#484f58",
        red: "#ff7b72",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    fitRef.current = fitAddon

    term.open(containerRef.current)
    termRef.current = term

    requestAnimationFrame(() => fitAddon.fit())

    const resizeHandler = () => {
      try {
        fitAddon.fit()
      } catch { /* noop */ }
    }
    window.addEventListener("resize", resizeHandler)

    term.write(`\x1b[32mGeoNexus Terminal\x1b[0m\r\n`)
    term.write(`${cwdRef.current}$ `)

    let currentBuffer = ""

    term.onKey(async (e) => {
      const data = e.key

      if (data === "\r") {
        const cmd = currentBuffer.trim()
        term.write("\r\n")
        currentBuffer = ""

        if (!cmd) {
          term.write(`${cwdRef.current}$ `)
          return
        }

        try {
          const result = await invoke<{ output: string; exit_code: number; cwd: string }>(
            "call_gateway_action",
            {
              action: "execute_shell_command",
              params: {
                shell_command: cmd,
                session_id: sessionId,
                working_dir: cwdRef.current,
              },
            },
          )

          if (result.output) {
            term.write(result.output.replace(/\n/g, "\r\n"))
            if (!result.output.endsWith("\n")) {
              term.write("\r\n")
            }
          }
          if (result.cwd) {
            cwdRef.current = result.cwd
          }
          term.write(`${result.cwd || cwdRef.current}$ `)
        } catch (err) {
          term.write(`\r\n\x1b[31mError:\x1b[0m ${String(err)}\r\n`)
          term.write(`${cwdRef.current}$ `)
        }
      } else if (data === "\u007f") {
        if (currentBuffer.length > 0) {
          currentBuffer = currentBuffer.slice(0, -1)
          term.write("\b \b")
        }
      } else if (data === "\u0003") {
        currentBuffer = ""
        term.write("^C\r\n")
        term.write(`${cwdRef.current}$ `)
      } else if (data === "\t") {
        currentBuffer += "  "
        term.write("  ")
      } else if (data.length === 1 && data >= " ") {
        currentBuffer += data
        term.write(data)
      }
    })

    return () => {
      window.removeEventListener("resize", resizeHandler)
      term.dispose()
    }
  }, [sessionId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-[#0d1117]"
    />
  )
}
