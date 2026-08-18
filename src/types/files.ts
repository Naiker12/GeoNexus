export interface FileNode {
  id: string
  name: string
  path: string
  type: "file" | "directory"
  children?: FileNode[]
  size?: number
  modifiedAt?: string
  status?: "pending" | "generating" | "done" | "error"
  content?: string
  language?: string
  lineCount?: number
  isOriginal?: boolean
}
