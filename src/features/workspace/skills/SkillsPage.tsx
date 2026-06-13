import { useState, useMemo } from "react"
import { useSkills } from "@/features/workspace/skills/hooks/useSkills"
import { SkillCard } from "@/features/workspace/skills/SkillCard"
import { SkillDetailDrawer } from "@/features/workspace/skills/SkillDetailDrawer"
import { InstallSkillDialog } from "@/features/workspace/skills/InstallSkillDialog"
import { cn } from "@/lib/utils"
import type { Skill, SkillCategory } from "@/types/skills"
import { Loader2Icon } from "lucide-react"

const CATEGORIES: Array<{ id: SkillCategory | "all"; label: string }> = [
  { id: "all",       label: "Todos" },
  { id: "gis",       label: "GIS" },
  { id: "research",  label: "Research" },
  { id: "data",      label: "Datos" },
  { id: "agent",     label: "Agentes" },
  { id: "tool",      label: "Tools" },
  { id: "connector", label: "Conectores" },
]

export function SkillsPage() {
  const {
    skills, loading, error,
    installFromFile, installFromGithub,
    toggleSkill, readSkillMd, refresh,
  } = useSkills()

  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | "all">("all")
  const [search, setSearch] = useState("")
  const [viewingSkill, setViewingSkill] = useState<string | null>(null)
  const [installOpen, setInstallOpen] = useState(false)

  const filtered = useMemo(() => {
    return skills.filter(s => {
      const matchCat = selectedCategory === "all" || s.category === selectedCategory
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase()) ||
        s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [skills, selectedCategory, search])

  const handleUseInChat = (skill: Skill) => {
    window.dispatchEvent(new CustomEvent("geonexus:use-skill", { detail: skill }))
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-3">

        {/* Header */}
        <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
          <div className="p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight sm:text-lg">Skills</h1>
                  {loading && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Instala SKILL.md para dar instrucciones especializadas al agente.
                </p>
              </div>
              <button
                onClick={() => setInstallOpen(true)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                + Instalar skill
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3 text-center">
          <StatBadge label="Total" value={skills.length} />
          <StatBadge label="Activos" value={skills.filter(s => s.enabled).length} accent />
          <StatBadge label="Built-in" value={skills.filter(s => s.builtin).length} />
          <StatBadge label="Externos" value={skills.filter(s => !s.builtin).length} />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full transition-colors",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar skill..."
            className="ml-auto h-8 w-44 rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/50"
          />
        </div>

        {/* Grid o empty state */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2Icon className="mr-2 size-5 animate-spin" />
            Cargando skills...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <span className="text-4xl mb-3">🧩</span>
            {skills.length === 0 ? (
              <>
                <p className="text-sm font-medium mb-1">Sin skills instalados</p>
                <p className="text-xs text-muted-foreground mb-4 max-w-md">
                  Instala un skill desde GitHub o sube un archivo SKILL.md para darle
                  instrucciones especializadas al agente.
                </p>
                <button
                  onClick={() => setInstallOpen(true)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Instalar primer skill
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ningún skill coincide con el filtro actual.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onToggle={toggleSkill}
                onView={setViewingSkill}
                onUseInChat={handleUseInChat}
              />
            ))}
          </div>
        )}
      </div>

      <SkillDetailDrawer
        skillId={viewingSkill}
        onClose={() => setViewingSkill(null)}
        onReadSkillMd={readSkillMd}
        onUseInChat={(id) => {
          const skill = skills.find(s => s.id === id)
          if (skill) handleUseInChat(skill)
        }}
      />

      <InstallSkillDialog
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        onInstallFromFile={installFromFile}
        onInstallFromGithub={installFromGithub}
      />
    </section>
  )
}

function StatBadge({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex-1 rounded-lg border border-border/80 bg-card/50 px-3 py-2 text-center">
      <p className={cn("text-lg font-bold", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  )
}
