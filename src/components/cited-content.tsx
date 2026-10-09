import type { ReactNode } from "react"
import { FileSearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type CitedContentProps = {
  content: string
  onOpenPage: (page: number) => void
  className?: string
}

const CITE_SPLIT = /(\[\[Seite\s+\d+\]\])/gi
const CITE_MATCH = /^\[\[Seite\s+(\d+)\]\]$/i

function renderSegment(
  text: string,
  onOpenPage: (page: number) => void,
  keyPrefix: string
): ReactNode[] {
  return text.split(CITE_SPLIT).map((part, index) => {
    const cite = part.match(CITE_MATCH)
    if (cite) {
      const page = Number(cite[1])
      return (
        <button
          key={`${keyPrefix}-cite-${index}`}
          type="button"
          onClick={() => onOpenPage(page)}
          className={cn(
            "mx-0.5 inline-flex translate-y-px items-center gap-1 rounded-md px-2 py-0.5 align-middle",
            "bg-violet-600 text-white",
            "text-xs font-semibold shadow-sm",
            "ring-2 ring-violet-400/50",
            "transition-colors hover:bg-violet-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
          )}
        >
          <FileSearchIcon className="size-3.5 shrink-0" />
          Seite {page}
        </button>
      )
    }

    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>
  })
}

export function CitedContent({
  content,
  onOpenPage,
  className,
}: CitedContentProps) {
  const paragraphs = content.split(/\n{2,}/)

  return (
    <div
      className={cn(
        "max-w-none text-sm leading-relaxed wrap-break-word",
        className
      )}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={`p-${index}`} className="my-2 whitespace-pre-wrap">
          {renderSegment(paragraph, onOpenPage, `p-${index}`)}
        </p>
      ))}
    </div>
  )
}
