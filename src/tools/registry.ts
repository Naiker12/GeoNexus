/** Central tool registry for agent tools (inspired by Hermes tools/). */

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.get(name)
    if (!tool) throw new Error(`Tool '${name}' not found`)
    return tool.execute(args)
  }
}

export const toolRegistry = new ToolRegistry()
