export type SettingsDialog =
  | { type: "add-model" }
  | { type: "edit-model"; name: string }
  | { type: "view-key"; name: string }
  | { type: "disable-model"; name: string }
  | { type: "delete-model"; name: string }
  | { type: "edit-mcp"; name: string; serverId: string }
  | { type: "disable-mcp"; name: string; serverId: string }
  | { type: "delete-mcp"; name: string; serverId: string }
  | { type: "configure-map"; name: string }
  | null
