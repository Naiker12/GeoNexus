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
  const BrandIcon = providerBrandIcons[providerId]

  if (BrandIcon) {
    return <BrandIcon {...props} />
  }

  return Fallback ? <Fallback className={props.className} /> : null
}

const providerBrandIcons: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  ollama: OllamaIcon,
  lmstudio: LmStudioIcon,
  openrouter: OpenRouterIcon,
  openai: OpenAiIcon,
  anthropic: AnthropicIcon,
  "memory-mcp": MemoryMcpIcon,
  "custom-api": CustomApiIcon,
}

function OllamaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M8.2 7.2C8.2 4.3 9.7 2 12 2s3.8 2.3 3.8 5.2v1.3c1.7 1.1 2.7 3 2.7 5.2 0 3.5-2.6 6.3-6.5 6.3s-6.5-2.8-6.5-6.3c0-2.2 1-4.1 2.7-5.2V7.2Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M8.5 8.4V6.9C8.5 4.4 9.9 2.5 12 2.5s3.5 1.9 3.5 4.4v1.5m-9.3 5.3c0-3.1 2.2-5.5 5.8-5.5s5.8 2.4 5.8 5.5-2.2 5.6-5.8 5.6-5.8-2.5-5.8-5.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 13.3h.1m4.6 0h.1M10.4 16.1c.8.5 2.4.5 3.2 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LmStudioIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M7.2 16.8V7.2h2.1v7.7h3.5v1.9H7.2Zm6.6 0V7.2h2l2 3.7 2-3.7h2v9.6h-2V11l-1.5 2.8h-1L15.8 11v5.8h-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function OpenRouterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M4 12h9.5m0 0-3.2-3.2M13.5 12l-3.2 3.2M14 6h2.8c1.8 0 3.2 1.4 3.2 3.2V10M14 18h2.8c1.8 0 3.2-1.4 3.2-3.2V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="12" r="2" fill="currentColor" opacity="0.18" />
      <circle cx="20" cy="10" r="1.8" fill="currentColor" />
      <circle cx="20" cy="14" r="1.8" fill="currentColor" />
    </svg>
  )
}

function OpenAiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M12 3.2a3.2 3.2 0 0 1 3.1 2.4 3.22 3.22 0 0 1 4 4 3.2 3.2 0 0 1-.8 5.5 3.22 3.22 0 0 1-4 4 3.2 3.2 0 0 1-5.5.8 3.22 3.22 0 0 1-4-4 3.2 3.2 0 0 1 .8-5.5 3.22 3.22 0 0 1 4-4A3.2 3.2 0 0 1 12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 6.6 12 8.5l3.4-1.9M5.7 10.4l3.4 2v3.9m9.2-5.9-3.4 2v3.9M8.8 19.1v-3.8l3.2-1.9 3.2 1.9v3.8M12 8.5v4.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AnthropicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M4.6 19.5 10.1 4.5h3.8l5.5 15h-3.3l-1.1-3.1H9l-1.1 3.1H4.6Z"
        fill="currentColor"
      />
      <path d="M9.9 13.8h4.2L12 7.6l-2.1 6.2Z" fill="currentColor" opacity="0.22" />
    </svg>
  )
}

function MemoryMcpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M5 7c0-2.2 3.1-4 7-4s7 1.8 7 4v10c0 2.2-3.1 4-7 4s-7-1.8-7-4V7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 7c0 2.2 3.1 4 7 4s7-1.8 7-4M5 12c0 2.2 3.1 4 7 4s7-1.8 7-4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9 18.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CustomApiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M8.5 8.5 5 12l3.5 3.5M15.5 8.5 19 12l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13 6-2 12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}
