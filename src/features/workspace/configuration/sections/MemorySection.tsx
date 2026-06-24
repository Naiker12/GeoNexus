import { useState, useEffect } from "react"
import { PencilIcon, CheckIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/ui/native-select"
import {
  CompactCheckRow,
  Field,
  SideMetric,
} from "@/features/workspace/configuration/settings-ui"
import { invoke } from "@/api/invoke"

interface CuratedFact {
  id: string
  fact: string
  category: string
  source: string
  confidence: number
  created_at: number
  updated_at: number
  access_count: number
  tags: string[]
}

export function MemorySection() {
  const [facts, setFacts] = useState<CuratedFact[]>([])
  const [newFact, setNewFact] = useState("")
  const [newCategory, setNewCategory] = useState("project")
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [editCategory, setEditCategory] = useState("")

  const loadFacts = async () => {
    setLoading(true)
    try {
      const result = await invoke<CuratedFact[]>("list_curated_facts", {})
      setFacts(result)
    } catch (e) {
      console.error("Error loading curated facts:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFacts()
  }, [])

  const handleAddFact = async () => {
    if (!newFact.trim()) return
    try {
      await invoke("add_curated_fact", {
        fact: newFact.trim(),
        category: newCategory,
        source: "manual",
        confidence: 1.0,
        tags: [],
      })
      setNewFact("")
      loadFacts()
    } catch (e) {
      console.error("Error adding fact:", e)
    }
  }

  const handleDeleteFact = async (id: string) => {
    try {
      await invoke("delete_curated_fact", { factId: id })
      loadFacts()
    } catch (e) {
      console.error("Error deleting fact:", e)
    }
  }

  const startEdit = (fact: CuratedFact) => {
    setEditingId(fact.id)
    setEditText(fact.fact)
    setEditCategory(fact.category)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText("")
    setEditCategory("")
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    try {
      await invoke("update_curated_fact", {
        factId: id,
        fact: editText.trim(),
        category: editCategory,
      })
      setEditingId(null)
      loadFacts()
    } catch (e) {
      console.error("Error updating fact:", e)
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Memoria y vectores
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          ChromaDB local, colecciones, chunk size y memoria curada.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Chunk POT">
          <NativeSelect className="w-full">
            <option>512 tokens</option>
            <option>768 tokens</option>
            <option>1024 tokens</option>
          </NativeSelect>
        </Field>

        <Field label="Modelo de embeddings">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Sin modelo configurado
          </div>
        </Field>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SideMetric label="Coleccion documental" value="Sin coleccion" />
        <SideMetric label="Coleccion GIS" value="Sin coleccion" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <CompactCheckRow label="Citar pagina y seccion" checked />
        <CompactCheckRow label="Cache semantico" />
        <CompactCheckRow label="Re-indexar al guardar" checked />
        <CompactCheckRow label="Embedding incremental" checked />
      </div>

      {/* Curated Memory */}
      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Memoria curada
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Hechos extraidos por el agente durante las conversaciones.
          Editables y consultables directamente.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFact()}
            placeholder="Nuevo hecho..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <NativeSelect
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-28"
          >
            <option value="project">Proyecto</option>
            <option value="user">Usuario</option>
            <option value="tech">Tecnologia</option>
            <option value="decision">Decision</option>
            <option value="goal">Objetivo</option>
            <option value="constraint">Restriccion</option>
          </NativeSelect>
          <button
            onClick={handleAddFact}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Agregar
          </button>
        </div>

        {loading ? (
          <p className="mt-2 text-xs text-muted-foreground">Cargando...</p>
        ) : facts.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No hay hechos curados aun.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {facts.map((fact) => (
              <li
                key={fact.id}
                className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs"
              >
                {editingId === fact.id ? (
                  <>
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEdit(fact.id)}
                      className="flex-1 rounded border border-primary/50 bg-background px-1.5 py-0.5 text-xs outline-none"
                      autoFocus
                    />
                    <NativeSelect
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-24"
                    >
                      <option value="project">Proyecto</option>
                      <option value="user">Usuario</option>
                      <option value="tech">Tecnologia</option>
                      <option value="decision">Decision</option>
                      <option value="goal">Objetivo</option>
                      <option value="constraint">Restriccion</option>
                    </NativeSelect>
                    <button
                      onClick={() => saveEdit(fact.id)}
                      className="shrink-0 text-emerald-600 hover:text-emerald-500"
                      title="Guardar"
                    >
                      <CheckIcon className="size-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      title="Cancelar"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {fact.category}
                    </span>
                    <span className="flex-1">{fact.fact}</span>
                    <button
                      onClick={() => startEdit(fact)}
                      className="shrink-0 text-muted-foreground hover:text-primary"
                      title="Editar"
                    >
                      <PencilIcon className="size-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteFact(fact.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
