import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MutableRefObject,
  type ReactNode,
} from "react"
import { FileTextIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ChatPdfMeta } from "@/lib/chats"
import { cn } from "@/lib/utils"

type PdfDropzoneProps = {
  disabled?: boolean
  isProcessing?: boolean
  openPickerRef?: MutableRefObject<(() => void) | null>
  onFile: (file: File) => void
  children: ReactNode
  className?: string
}

export function PdfDropzone({
  disabled = false,
  isProcessing = false,
  openPickerRef,
  onFile,
  children,
  className,
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!openPickerRef) return
    openPickerRef.current = () => inputRef.current?.click()
    return () => {
      openPickerRef.current = null
    }
  }, [openPickerRef])

  function acceptFile(file: File | undefined | null) {
    if (!file || disabled || isProcessing) return
    onFile(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setIsDragging(false)
      }}
      onDrop={handleDrop}
    >
      {children}

      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-[1px]">
          <div className="rounded-xl border border-dashed border-violet-500 bg-violet-50 px-6 py-8 text-center shadow-sm dark:bg-violet-950/40">
            <UploadIcon className="mx-auto mb-2 size-6 text-violet-700 dark:text-violet-300" />
            <p className="text-sm font-medium">PDF hier ablegen</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Eine Datei pro Chat
            </p>
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          acceptFile(event.target.files?.[0])
          event.target.value = ""
        }}
      />
    </div>
  )
}

export function PdfAttachmentChip({
  pdf,
  isProcessing,
  progressLabel,
  onOpen,
  onRemove,
}: {
  pdf?: ChatPdfMeta
  isProcessing?: boolean
  progressLabel?: string | null
  onOpen?: () => void
  onRemove?: () => void
}) {
  if (!pdf && !isProcessing) return null

  return (
    <div className="flex h-12 items-center gap-2 rounded-xl border border-violet-300/70 bg-violet-50 px-2.5 text-violet-950 dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-50">
      {isProcessing ? (
        <>
          <Loader2Icon className="size-4 shrink-0 animate-spin text-violet-600" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {progressLabel || "PDF wird gelesen…"}
          </span>
        </>
      ) : pdf ? (
        <>
          <button
            type="button"
            className="flex h-full min-w-0 flex-1 items-center gap-2.5 text-left"
            onClick={onOpen}
            title="PDF öffnen"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-200/80 dark:bg-violet-900/70">
              <FileTextIcon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">
                {pdf.name}
              </span>
              <span className="block truncate text-[11px] opacity-75">
                {pdf.pageCount} Seiten · öffnen
              </span>
            </span>
          </button>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
              aria-label="PDF entfernen"
              title="PDF entfernen"
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function PdfUploadButton({
  disabled,
  onClick,
}: {
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={disabled}
      onClick={onClick}
      title="PDF hochladen"
    >
      <UploadIcon />
      PDF
    </Button>
  )
}
