export type ChartType = "bar" | "line" | "pie" | "area" | "radar" | "unknown"

export type ChartEntry = {
  label: string
  value: number
  color?: string
}

export type DataSeries = {
  label: string
  values: number[]
}

export type ParsedChart = {
  type: ChartType
  title: string
  entries: ChartEntry[]
  series: DataSeries[]
  labels: string[]
}

const BAR_CHARS = ["█", "■", "▓", "░"]
const LINE_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "▉", "▊", "▋", "▌", "▍", "▎", "▏"]
const PIE_CHARS = ["●", "○"]
const ALL_CHART_CHARS = [...BAR_CHARS, ...LINE_CHARS, ...PIE_CHARS]
const SEP_PATTERN = /^[=\-—─═]{3,}/

function hasBarChar(line: string): boolean {
  return BAR_CHARS.some((c) => line.includes(c))
}

function detectChartType(lines: string[]): ChartType {
  const barCount = lines.filter((l) => /[█■▓░]{2,}/.test(l) || /\|[\s]*[█■▓░]/.test(l)).length
  const lineCount = lines.filter((l) => LINE_CHARS.some((c) => l.includes(c))).length
  const pieCount = lines.filter((l) => PIE_CHARS.some((c) => l.includes(c)) && /\d+%/.test(l)).length

  if (lineCount > 1) return "line"
  if (pieCount >= 2) return "pie"
  if (barCount >= 2) return "bar"
  return "unknown"
}

export function looksLikeAsciiChart(code: string): boolean {
  const lines = code.split("\n").filter((l) => l.trim())
  if (lines.length < 3) return false

  let dataLines = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (SEP_PATTERN.test(trimmed)) { dataLines++; continue }
    const hasChart = ALL_CHART_CHARS.some((c) => trimmed.includes(c))
    const hasPercentage = /\d+%/.test(trimmed)
    const hasPipeValue = /\|\s*[█■▓░]/.test(trimmed)
    const hasPipeNumber = /\|\s*\d+/.test(trimmed)
    if (hasChart || hasPercentage || hasPipeValue || hasPipeNumber) {
      dataLines++
    }
  }

  return lines.length > 0 && dataLines / lines.length >= 0.25
}

export function parseAsciiChart(code: string): ParsedChart {
  const lines = code.split("\n").filter((l) => l.trim())
  let title = ""
  const entries: ChartEntry[] = []
  const series: DataSeries[] = []
  const labels: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (SEP_PATTERN.test(trimmed)) continue
    if (title === "" && !/[█■▓░▁▂▃▄▅▆▇]/.test(trimmed) && !/\|/.test(trimmed) && !SEP_PATTERN.test(trimmed)) {
      title = trimmed
      continue
    }
  }

  const chartType = detectChartType(lines)

  if (chartType === "bar") {
    parseBarChart(lines, entries)
  } else if (chartType === "line") {
    parseLineChart(lines, series, labels)
  } else if (chartType === "pie") {
    parsePieChart(lines, entries)
  } else {
    parseBarChart(lines, entries)
  }

  return { type: chartType, title, entries, series, labels }
}

function parseBarChart(lines: string[], entries: ChartEntry[]) {
  for (const line of lines) {
    const trimmed = line.trim()
    if (SEP_PATTERN.test(trimmed)) continue

    const barMatch = trimmed.match(/^\s*(.+?)\s*[|:│]\s*[█■▓░]+\s*(\d+)/)
    if (barMatch) {
      let label = barMatch[1].trim().replace(/\.$/, "")
      const value = parseInt(barMatch[2], 10)
      if (label && !isNaN(value)) {
        entries.push({ label, value })
        continue
      }
    }

    const percentMatch = trimmed.match(/(\d+)%/)
    if (percentMatch) {
      const value = parseInt(percentMatch[1], 10)
      const labelPart = trimmed
        .replace(/[█■▓░]{2,}.*$/, "")
        .replace(/\s*\d+\s*%/, "")
        .replace(/^[▸▶>\s]+/, "")
        .replace(/[:\s]+$/, "")
        .trim()
      if (labelPart && !SEP_PATTERN.test(labelPart)) {
        entries.push({ label: labelPart, value })
      }
    }
  }
}

function parseLineChart(lines: string[], series: DataSeries[], labels: string[]) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const match = trimmed.match(/^(.+?)\s*[|:]\s*([▁▂▃▄▅▆▇█▉▊▋▌▍▎▏\s]+)/)
    if (match) {
      const label = match[1].trim()
      const sparkRaw = match[2]
      const values: number[] = []
      for (const ch of sparkRaw) {
        const idx = "▁▂▃▄▅▆▇█".indexOf(ch)
        if (idx >= 0) values.push(Math.round((idx + 1) / 8 * 100))
      }
      if (values.length > 0) {
        series.push({ label, values })
      }
    }
  }
}

function parsePieChart(lines: string[], entries: ChartEntry[]) {
  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(/[■●○]\s*(.+?)\s*[:\-]\s*(\d+)%/)
    if (match) {
      const label = match[1].trim()
      const value = parseInt(match[2], 10)
      if (label && !isNaN(value)) {
        entries.push({ label, value })
      }
    }
  }
}
