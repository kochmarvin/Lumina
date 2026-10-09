import { BrainIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type ThinkingIndicatorProps = {
  label?: string
  className?: string
}

export function ThinkingIndicator({
  label = "Denkt nach…",
  className,
}: ThinkingIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border border-violet-300/70 bg-violet-50 px-3 py-2 text-violet-950",
        "dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-50",
        className
      )}
    >
      <div className="relative flex size-8 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/30" />
        <span className="absolute inset-1 animate-pulse rounded-full bg-violet-400/20" />
        <BrainIcon className="relative size-4 animate-bounce" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-1 flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:120ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  )
}
