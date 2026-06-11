import { describe, expect, it } from "vitest"
import { parseContent } from "@/utils/parseContent"

describe("parseContent", () => {
  it("returns a single text segment for plain text", () => {
    const result = parseContent("Hola mundo")
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ kind: "text", value: "Hola mundo" })
  })

  it("detects a connect_card JSON block", () => {
    const content = 'Necesito acceso.\n{"type":"connect_card","connectorId":"onedrive","reason":"Para acceder a archivos"}'
    const result = parseContent(content)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ kind: "text", value: "Necesito acceso.\n" })
    expect(result[1]).toEqual({
      kind: "connect_card",
      value: { type: "connect_card", connectorId: "onedrive", reason: "Para acceder a archivos" },
    })
  })

  it("handles connect_card without reason", () => {
    const content = 'Texto\n{"type":"connect_card","connectorId":"local"}'
    const result = parseContent(content)
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual({
      kind: "connect_card",
      value: { type: "connect_card", connectorId: "local" },
    })
  })

  it("extracts multiple connect_card blocks", () => {
    const content = 'A\n{"type":"connect_card","connectorId":"a"}\nB\n{"type":"connect_card","connectorId":"b"}'
    const result = parseContent(content)
    expect(result).toHaveLength(4)
    expect(result[0].kind).toBe("text")
    expect(result[1].kind).toBe("connect_card")
    expect((result[1].value as { connectorId: string }).connectorId).toBe("a")
    expect(result[2].kind).toBe("text")
    expect((result[2].value as string).trim()).toBe("B")
    expect(result[3].kind).toBe("connect_card")
    expect((result[3].value as { connectorId: string }).connectorId).toBe("b")
  })

  it("falls back to text segment when JSON is malformed", () => {
    const content = '{"type":"connect_card","connectorId":"x" invalid}'
    const result = parseContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe("text")
  })

  it("returns a single text segment when there is no match", () => {
    const result = parseContent("Hola, esto es una respuesta normal.")
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe("text")
  })

  it("handles connect_card at the start of content", () => {
    const content = '{"type":"connect_card","connectorId":"qgis"}\nAhora puedes usar QGIS.'
    const result = parseContent(content)
    expect(result).toHaveLength(2)
    expect(result[0].kind).toBe("connect_card")
    expect(result[1].kind).toBe("text")
    expect(result[1].value).toBe("\nAhora puedes usar QGIS.")
  })

  it("handles empty content", () => {
    const result = parseContent("")
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe("text")
    expect(result[0].value).toBe("")
  })

  it("handles content ending with a connect_card", () => {
    const content = 'Procesando...\n{"type":"connect_card","connectorId":"s3"}'
    const result = parseContent(content)
    expect(result).toHaveLength(2)
    expect(result[1].kind).toBe("connect_card")
    expect((result[1].value as { connectorId: string }).connectorId).toBe("s3")
  })
})
