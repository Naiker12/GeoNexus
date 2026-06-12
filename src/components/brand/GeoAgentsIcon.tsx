import { cn } from "@/lib/utils"

type GeoAgentsIconProps = {
  className?: string
  variant?: "nexus" | "agent" | "terrain"
}

export function GeoAgentsIcon({
  className,
  variant = "nexus",
}: GeoAgentsIconProps) {
  if (variant === "agent") {
    return (
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn("size-5", className)}
      >
        <path
          d="M16 3.5c5.8 0 10.5 4.7 10.5 10.5v4.5c0 5-4 9-9 9h-3c-5 0-9-4-9-9V14C5.5 8.2 10.2 3.5 16 3.5Z"
          fill="currentColor"
          opacity=".18"
        />
        <path
          d="M11 14.2a5 5 0 0 1 10 0v1.2a5 5 0 0 1-10 0v-1.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8.5 24.5c1.4-3.1 4.1-4.8 7.5-4.8s6.1 1.7 7.5 4.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M23.5 8.5 27 6M8.5 8.5 5 6M16 3.5V1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    )
  }

  if (variant === "terrain") {
    return (
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn("size-5", className)}
      >
        <path
          d="M4 9.5c5-3.5 9-3.5 12 0s7 3.5 12 0M4 16c5-3.5 9-3.5 12 0s7 3.5 12 0M4 22.5c5-3.5 9-3.5 12 0s7 3.5 12 0"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
        <path
          d="M16 5.5v4M16 22.5v4M5.5 16h4M22.5 16h4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          opacity=".55"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <path
        d="M16 2.8c-5.2 0-9.4 4.2-9.4 9.4 0 7.3 9.4 18 9.4 18s9.4-10.7 9.4-18c0-5.2-4.2-9.4-9.4-9.4Z"
        fill="currentColor"
        opacity=".18"
      />
      <path
        d="M16 5.2a7 7 0 0 0-7 7c0 4.7 4.5 11.1 7 14.4 2.5-3.3 7-9.7 7-14.4a7 7 0 0 0-7-7Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M10.2 24.6 6 27.3l6.5 1.8L16 27l3.5 2.1 6.5-1.8-4.2-2.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        opacity=".7"
      />
      <circle cx="16" cy="12.2" r="3.2" fill="currentColor" />
      <path d="M16 9.4v5.6M13.2 12.2h5.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" className="text-primary-foreground" />
    </svg>
  )
}
