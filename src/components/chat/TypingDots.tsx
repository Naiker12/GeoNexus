export function TypingDots() {
  return (
    <div
      className="flex h-5 items-center gap-1 py-1"
      aria-label="Geo Agents esta escribiendo"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{ animationDelay: `${i * 150}ms` }}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
