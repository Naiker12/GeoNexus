import type { AiConnector } from "@/features/workspace/workspace-data"

const summaries = [
  {
    label: "Online",
    getValue: (connectors: AiConnector[]) =>
      connectors.filter((connector) => connector.status === "online").length,
  },
  {
    label: "Local",
    getValue: (connectors: AiConnector[]) =>
      connectors.filter((connector) => connector.provider === "local").length,
  },
  {
    label: "MCP",
    getValue: (connectors: AiConnector[]) =>
      connectors.filter((connector) => connector.provider === "mcp").length,
  },
]

export function AiSummaryCards({ connectors }: { connectors: AiConnector[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {summaries.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-border bg-background/75 px-3 py-1.5"
        >
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-base font-semibold leading-5">
            {item.getValue(connectors)}
          </p>
        </div>
      ))}
    </div>
  )
}
