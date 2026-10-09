import { useState } from "react"
import { ChevronDownIcon, SparklesIcon } from "lucide-react"

import { ThinkingIndicator } from "@/components/thinking-indicator"
import { cn } from "@/lib/utils"

type ThinkingPanelProps = {
  thinking: string
  isStreaming?: boolean
  className?: string
}

export function ThinkingPanel({
  thinking,
  isStreaming = false,
  className,
}: ThinkingPanelProps) {
  const [open, setOpen] = useState(false)
  const hasText = thinking.trim().length > 0

  if (!hasText && !isStreaming) return null

  return (
    <div className={cn("w-full max-w-full", className)}>
      {isStreaming && !hasText ? (
        <ThinkingIndicator />
      ) : (
        <div className="overflow-hidden rounded-xl border border-violet-300/70 bg-violet-50/80 dark:border-violet-500/40 dark:bg-violet-950/30">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-violet-950 dark:text-violet-50">
              <SparklesIcon
                className={cn(
                  "size-4",
                  isStreaming && "animate-spin [animation-duration:3s]"
                )}
              />
              {isStreaming ? "Denkt nach…" : "Gedankengang"}
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 text-violet-700 transition-transform dark:text-violet-200",
                open && "rotate-180"
              )}
            />
          </button>
          {open ? (
            <div className="border-t border-violet-200/80 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-violet-950/90 dark:border-violet-500/30 dark:text-violet-100/90">
              {thinking || "…"}
              {isStreaming ? (
                <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-violet-500 align-middle" />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
