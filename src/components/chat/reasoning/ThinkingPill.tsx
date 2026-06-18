import { cn } from "@/lib/utils"

export function ThinkingPill({ className }: { className?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3.5 py-1.5",
      "rounded-full border border-stone-200 bg-stone-50",
      "text-sm text-stone-500",
      className,
    )}>
      <div className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-[5px] w-[5px] rounded-full bg-stone-400"
            style={{
              animation: "gn-bounce 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
      <span>Pensando</span>
      <style>{`
        @keyframes gn-bounce {
          0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
          40%            { transform: scale(1.35); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
