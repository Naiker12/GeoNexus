import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type GeoAgentsLogoProps = {
  className?: string
  variant?: "icon" | "compact" | "full"
}

const DARK_THEMES = new Set(["geo-dark", "midnight", "graphite"])

function RobotSvg({ className, dark }: { className?: string; dark?: boolean }) {
  const b = (light: string, darkVal: string) => dark ? darkVal : light
  return (
    <svg viewBox="0 0 420 430" aria-hidden="true" className={cn("size-8", className)}>
      <g transform="translate(14,10)">
        {/* Antenna */}
        <line x1="172" y1="28" x2="172" y2="66" stroke={b("#111","#ccc")} strokeWidth="6" strokeLinecap="round" />
        <circle cx="172" cy="19" r="12" fill={b("#fff","#222")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="172" cy="19" r="5" fill="var(--primary, #00BFFF)" />
        {/* Head */}
        <circle cx="172" cy="122" r="82" fill={b("#f5f5f5","#1a1a1a")} stroke={b("#111","#ccc")} strokeWidth="6" />
        {/* Ears */}
        <circle cx="88" cy="115" r="20" fill={b("#fff","#222")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="88" cy="115" r="11" fill="var(--primary, #00BFFF)" opacity="0.9" />
        <circle cx="256" cy="115" r="20" fill={b("#fff","#222")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="256" cy="115" r="11" fill="var(--primary, #00BFFF)" opacity="0.9" />
        {/* Eyes */}
        <circle cx="140" cy="110" r="24" fill={b("#111","#ccc")} />
        <circle cx="140" cy="110" r="18" fill="var(--primary, #00BFFF)" />
        <circle cx="140" cy="110" r="8" fill={b("#00EEFF","#88EEFF")} opacity="0.85" />
        <ellipse cx="147" cy="103" rx="5" ry="3.5" fill={b("#fff","#333")} opacity="0.85" transform="rotate(-20,147,103)" />
        <circle cx="204" cy="110" r="24" fill={b("#111","#ccc")} />
        <circle cx="204" cy="110" r="18" fill="var(--primary, #00BFFF)" />
        <circle cx="204" cy="110" r="8" fill={b("#00EEFF","#88EEFF")} opacity="0.85" />
        <ellipse cx="211" cy="103" rx="5" ry="3.5" fill={b("#fff","#333")} opacity="0.85" transform="rotate(-20,211,103)" />
        {/* Smile */}
        <path d="M138 152 Q172 174 206 152" stroke={b("#111","#ccc")} strokeWidth="5.5" fill="none" strokeLinecap="round" />
        {/* Neck */}
        <rect x="152" y="200" width="40" height="20" rx="8" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4" />
        {/* Body */}
        <rect x="80" y="216" width="184" height="140" rx="28" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="6" />
        <polygon points="172,238 192,270 152,270" fill="var(--primary, #00BFFF)" />
        <text x="172" y="318" textAnchor="middle" fontFamily="'Arial Black','Helvetica Neue',sans-serif" fontSize="44" fontWeight="900" fill={b("#111","#eee")}>A</text>
        {/* Left arm */}
        <circle cx="76" cy="234" r="18" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4.5" />
        <rect x="56" y="244" width="26" height="75" rx="13" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <rect x="44" y="308" width="46" height="26" rx="13" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4.5" />
        {/* Right arm */}
        <circle cx="268" cy="234" r="18" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4.5" />
        <path d="M278 238 Q296 252 300 278" stroke={b("#111","#ccc")} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M278 238 Q296 252 300 278" stroke={b("#E8E8E8","#2a2a2a")} strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="302" cy="284" r="10" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4" />
        {/* Hologram base */}
        <ellipse cx="330" cy="316" rx="34" ry="14" fill="var(--primary, #00BFFF)" opacity="0.3" />
        <ellipse cx="330" cy="314" rx="20" ry="7" fill="var(--primary, #00BFFF)" opacity="0.7" />
        {/* Hologram map */}
        <g transform="translate(295,198) rotate(-10)">
          <rect x="0" y="0" width="128" height="100" rx="14" fill="var(--primary, #00BFFF)" opacity="0.85" stroke="var(--primary, #00BFFF)" strokeWidth="3.5" />
          <line x1="8" y1="28" x2="120" y2="28" stroke="#fff" strokeWidth="2" opacity="0.7" />
          <line x1="8" y1="52" x2="120" y2="52" stroke="#fff" strokeWidth="2" opacity="0.6" />
          <line x1="8" y1="76" x2="120" y2="76" stroke="#fff" strokeWidth="2" opacity="0.55" />
          <line x1="36" y1="8" x2="36" y2="92" stroke="#fff" strokeWidth="2" opacity="0.55" />
          <line x1="72" y1="8" x2="72" y2="92" stroke="#fff" strokeWidth="2" opacity="0.55" />
          <line x1="108" y1="8" x2="108" y2="92" stroke="#fff" strokeWidth="2" opacity="0.5" />
          <circle cx="72" cy="38" r="13" fill="#EE1144" stroke="#fff" strokeWidth="2.5" />
          <circle cx="72" cy="38" r="5.5" fill="#fff" />
          <ellipse cx="72" cy="56" rx="5" ry="3" fill="#EE1144" opacity="0.3" />
          <polygon points="72,50 66,68 72,63 78,68" fill="#EE1144" />
          <path d="M95 60 L88 78 L92 74 L95 82 L98 74 L102 78 Z" fill="#EE1144" stroke="#fff" strokeWidth="1" />
        </g>
        {/* Hips & Legs */}
        <rect x="108" y="350" width="128" height="17" rx="8.5" fill={b("#D0D0D0","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4" />
        <rect x="104" y="363" width="52" height="62" rx="14" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="5.5" />
        <rect x="90" y="413" width="72" height="24" rx="12" fill={b("#D0D0D0","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <rect x="188" y="363" width="52" height="62" rx="14" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="5.5" />
        <rect x="182" y="413" width="72" height="24" rx="12" fill={b("#D0D0D0","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="130" cy="382" r="10" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="3" />
        <circle cx="214" cy="382" r="10" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="3" />
      </g>
    </svg>
  )
}

function FullLogoSvg({ className, dark }: { className?: string; dark?: boolean }) {
  const b = (light: string, darkVal: string) => dark ? darkVal : light
  return (
    <svg viewBox="0 0 1860 430" aria-hidden="true" className={cn("w-auto h-8 sm:h-10", className)}
      style={{ color: "var(--primary, #00BFFF)" } as React.CSSProperties}>
      <g transform="translate(14,10)">
        <line x1="172" y1="28" x2="172" y2="66" stroke={b("#111","#ccc")} strokeWidth="6" strokeLinecap="round" />
        <circle cx="172" cy="19" r="12" fill={b("#fff","#222")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="172" cy="19" r="5" fill="currentColor" />
        <circle cx="172" cy="122" r="82" fill={b("#f5f5f5","#1a1a1a")} stroke={b("#111","#ccc")} strokeWidth="6" />
        <circle cx="88" cy="115" r="20" fill={b("#fff","#222")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="88" cy="115" r="11" fill="currentColor" opacity="0.9" />
        <circle cx="256" cy="115" r="20" fill={b("#fff","#222")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="256" cy="115" r="11" fill="currentColor" opacity="0.9" />
        <circle cx="140" cy="110" r="24" fill={b("#111","#ccc")} />
        <circle cx="140" cy="110" r="18" fill="currentColor" />
        <circle cx="140" cy="110" r="8" fill={b("#00EEFF","#88EEFF")} opacity="0.85" />
        <ellipse cx="147" cy="103" rx="5" ry="3.5" fill={b("#fff","#333")} opacity="0.85" transform="rotate(-20,147,103)" />
        <circle cx="204" cy="110" r="24" fill={b("#111","#ccc")} />
        <circle cx="204" cy="110" r="18" fill="currentColor" />
        <circle cx="204" cy="110" r="8" fill={b("#00EEFF","#88EEFF")} opacity="0.85" />
        <ellipse cx="211" cy="103" rx="5" ry="3.5" fill={b("#fff","#333")} opacity="0.85" transform="rotate(-20,211,103)" />
        <path d="M138 152 Q172 174 206 152" stroke={b("#111","#ccc")} strokeWidth="5.5" fill="none" strokeLinecap="round" />
        <rect x="152" y="200" width="40" height="20" rx="8" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4" />
        <rect x="80" y="216" width="184" height="140" rx="28" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="6" />
        <polygon points="172,238 192,270 152,270" fill="currentColor" />
        <text x="172" y="318" textAnchor="middle" fontFamily="'Arial Black','Helvetica Neue',sans-serif" fontSize="44" fontWeight="900" fill={b("#111","#eee")}>A</text>
        <circle cx="76" cy="234" r="18" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4.5" />
        <rect x="56" y="244" width="26" height="75" rx="13" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <rect x="44" y="308" width="46" height="26" rx="13" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4.5" />
        <circle cx="268" cy="234" r="18" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4.5" />
        <path d="M278 238 Q296 252 300 278" stroke={b("#111","#ccc")} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M278 238 Q296 252 300 278" stroke={b("#E8E8E8","#2a2a2a")} strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="302" cy="284" r="10" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4" />
        <ellipse cx="330" cy="316" rx="34" ry="14" fill="currentColor" opacity="0.3" />
        <ellipse cx="330" cy="314" rx="20" ry="7" fill="currentColor" opacity="0.7" />
        <g transform="translate(295,198) rotate(-10)">
          <rect x="0" y="0" width="128" height="100" rx="14" fill="currentColor" opacity="0.85" stroke="currentColor" strokeWidth="3.5" />
          <line x1="8" y1="28" x2="120" y2="28" stroke="#fff" strokeWidth="2" opacity="0.7" />
          <line x1="8" y1="52" x2="120" y2="52" stroke="#fff" strokeWidth="2" opacity="0.6" />
          <line x1="8" y1="76" x2="120" y2="76" stroke="#fff" strokeWidth="2" opacity="0.55" />
          <line x1="36" y1="8" x2="36" y2="92" stroke="#fff" strokeWidth="2" opacity="0.55" />
          <line x1="72" y1="8" x2="72" y2="92" stroke="#fff" strokeWidth="2" opacity="0.55" />
          <line x1="108" y1="8" x2="108" y2="92" stroke="#fff" strokeWidth="2" opacity="0.5" />
          <circle cx="72" cy="38" r="13" fill="#EE1144" stroke="#fff" strokeWidth="2.5" />
          <circle cx="72" cy="38" r="5.5" fill="#fff" />
          <ellipse cx="72" cy="56" rx="5" ry="3" fill="#EE1144" opacity="0.3" />
          <polygon points="72,50 66,68 72,63 78,68" fill="#EE1144" />
          <path d="M95 60 L88 78 L92 74 L95 82 L98 74 L102 78 Z" fill="#EE1144" stroke="#fff" strokeWidth="1" />
        </g>
        <rect x="108" y="350" width="128" height="17" rx="8.5" fill={b("#D0D0D0","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="4" />
        <rect x="104" y="363" width="52" height="62" rx="14" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="5.5" />
        <rect x="90" y="413" width="72" height="24" rx="12" fill={b("#D0D0D0","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <rect x="188" y="363" width="52" height="62" rx="14" fill={b("#E8E8E8","#2a2a2a")} stroke={b("#111","#ccc")} strokeWidth="5.5" />
        <rect x="182" y="413" width="72" height="24" rx="12" fill={b("#D0D0D0","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="5" />
        <circle cx="130" cy="382" r="10" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="3" />
        <circle cx="214" cy="382" r="10" fill={b("#D8D8D8","#3a3a3a")} stroke={b("#111","#ccc")} strokeWidth="3" />
      </g>
      <text x="430" y="305" fontFamily="'Arial Black','Franklin Gothic Heavy',Impact,sans-serif" fontSize="216" fontWeight="900" letterSpacing="-4" fill="var(--foreground, #111)">GEO</text>
      <text x="856" y="305" fontFamily="'Arial Black','Franklin Gothic Heavy',Impact,sans-serif" fontSize="216" fontWeight="900" letterSpacing="-4" fill="currentColor">AGENTS</text>
    </svg>
  )
}

export function GeoAgentsLogo({ className, variant = "full" }: GeoAgentsLogoProps) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const check = () => {
      const cls = document.documentElement.classList
      setDark(DARK_THEMES.has(Array.from(cls).find(c => DARK_THEMES.has(c)) ?? ""))
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  if (variant === "icon") return <RobotSvg className={className} dark={dark} />
  if (variant === "compact") return <FullLogoSvg className={cn("h-7", className)} dark={dark} />
  return <FullLogoSvg className={cn("h-10 sm:h-14", className)} dark={dark} />
}
