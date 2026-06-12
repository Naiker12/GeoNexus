import type { ComponentType, SVGProps } from "react"

import { cn } from "@/lib/utils"

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
  const whiteIcons = ["ollama", "openai", "anthropic", "openrouter", "groq", "cohere"]
  const shouldInvert = whiteIcons.includes(providerId)

  if (svglRoute) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={cn(
          props.className,
          shouldInvert && "invert [.geo-dark_&]:invert-0 [.graphite_&]:invert-0 [.midnight_&]:invert-0"
        )}
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
  groq: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/groq/default.svg",
  cohere: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/cohere/default.svg",
  gemini: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google-gemini/default.svg",
  deepseek: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/deepseek/default.svg",
  mistral: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/mistral/default.svg",
}
