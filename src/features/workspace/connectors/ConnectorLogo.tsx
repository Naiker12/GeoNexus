import { CloudIcon } from "lucide-react"

import type { ConnectorProvider } from "@/features/workspace/connectors/connector-types"
import { cn } from "@/lib/utils"

type ConnectorLogoProps = {
  provider: ConnectorProvider
  className?: string
}

export function ConnectorLogo({ provider, className }: ConnectorLogoProps) {
  if (provider.svglRoute) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={cn("object-contain", className)}
        src={provider.svglRoute}
      />
    )
  }

  if (provider.fallbackIcon) {
    const FallbackIcon = provider.fallbackIcon
    return <FallbackIcon className={className} />
  }

  return <CloudIcon className={className} />
}
