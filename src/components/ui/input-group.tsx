import * as React from "react"

import { cn } from "@/lib/utils"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "group/input-group flex min-w-0 items-end gap-2 rounded-2xl border border-input bg-background px-2 py-1.5 shadow-inner transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        className
      )}
      {...props}
    />
  )
}

function InputGroupAddon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn("flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  )
}

function InputGroupControl({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group-control"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon, InputGroupControl }
