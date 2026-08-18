export type SettingsDialog =
  | { type: "edit-mcp"; name: string; serverId: string }
  | null
