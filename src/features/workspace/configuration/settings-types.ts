export type SettingsDialog =
  | { type: "edit-mcp"; name: string; serverId: string }
  | { type: "configure-map"; name: string }
  | null
