interface ActionSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

export function ActionSuggestions({
  suggestions,
  onSelect,
}: ActionSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-[12.5px] px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors text-foreground text-left"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
