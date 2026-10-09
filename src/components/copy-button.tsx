import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type CopyButtonProps = {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!text.trim()) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={className}
      onClick={() => void handleCopy()}
      disabled={!text.trim()}
      aria-label={copied ? "Kopiert" : "Nachricht kopieren"}
      title={copied ? "Kopiert" : "Kopieren"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}
