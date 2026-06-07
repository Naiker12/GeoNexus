import type { ComponentType, SVGProps } from "react"

type ProviderBrandIconProps = SVGProps<SVGSVGElement> & {
  providerId: string
  fallback?: ComponentType<{ className?: string }>
}

export function ProviderBrandIcon({
  providerId,
  fallback: Fallback,
  ...props
}: ProviderBrandIconProps) {
  const svglRoute = providerBrandRoutes[providerId]

  if (svglRoute) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={props.className}
        src={svglRoute}
      />
    )
  }

  return Fallback ? <Fallback className={props.className} /> : null
}

const providerBrandRoutes: Record<string, string> = {
  ollama: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ollama/default.svg",
  lmstudio: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/lm-studio/default.svg",
  openrouter: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/openrouter/default.svg",
  openai: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/openai/default.svg",
  anthropic: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/anthropic/default.svg",
}
