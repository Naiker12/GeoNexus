type InfoRowProps = {
  label: string
  value: string
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-md border border-border bg-muted/35 px-2 py-1.5">
      <span className="block text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-xs text-foreground">
        {value}
      </span>
    </div>
  )
}
