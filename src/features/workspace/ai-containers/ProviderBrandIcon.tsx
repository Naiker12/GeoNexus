import type { ComponentType, SVGProps } from "react"
import { BotIcon, BrainCircuitIcon, CloudIcon, CpuIcon, KeyRoundIcon, ServerIcon, SparklesIcon, TerminalIcon, ZapIcon } from "lucide-react"
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
  const whiteIcons = ["ollama", "openai", "anthropic", "openrouter", "groq", "cohere", "xai", "together", "huggingface", "vllm"]
  const shouldInvert = whiteIcons.includes(providerId)

  if (svglRoute) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={cn(
          "size-4.5 object-contain",
          props.className,
          shouldInvert &&
            "dark:invert [.geo-dark_&]:invert [.graphite_&]:invert [.midnight_&]:invert"
        )}
        src={svglRoute}
        onError={(e) => {
          // Fallback if network fails
          e.currentTarget.style.display = "none"
        }}
      />
    )
  }

  const FallbackIcon = Fallback || defaultIcons[providerId] || BotIcon
  return <FallbackIcon className={props.className} />
}

const defaultIcons: Record<string, ComponentType<{ className?: string }>> = {
  ollama: TerminalIcon,
  lmstudio: TerminalIcon,
  vllm: CpuIcon,
  openai: BotIcon,
  anthropic: BrainCircuitIcon,
  gemini: SparklesIcon,
  deepseek: CloudIcon,
  groq: ZapIcon,
  mistral: CloudIcon,
  xai: BotIcon,
  together: ServerIcon,
  huggingface: BotIcon,
  cohere: CloudIcon,
  openrouter: CloudIcon,
  "custom-api": KeyRoundIcon,
}

const providerBrandRoutes: Record<string, string> = {
  ollama: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ollama/default.svg",
  lmstudio: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/lm-studio/default.svg",
  vllm: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/vllm/default.svg",
  openrouter: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/openrouter/default.svg",
  openai: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/openai/default.svg",
  anthropic: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/anthropic/default.svg",
  groq: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/groq/default.svg",
  cohere: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/cohere/default.svg",
  gemini: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google-gemini/default.svg",
  deepseek: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/deepseek/default.svg",
  mistral: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/mistral/default.svg",
  xai: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/xai/default.svg",
  together: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/together-ai/default.svg",
  huggingface: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/huggingface/default.svg",
  perplexity: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/perplexity/default.svg",
}
