import { useEffect, useRef, useState } from "react"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type PdfViewerProps = {
  open: boolean
  blob: Blob | null
  fileName: string
  initialPage: number
  pageCount?: number
  onClose: () => void
}

export function PdfViewer({
  open,
  blob,
  fileName,
  initialPage,
  pageCount,
  onClose,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(pageCount ?? 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setPage(Math.max(1, initialPage))
  }, [open, initialPage])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
      if (event.key === "ArrowLeft") {
        setPage((current) => Math.max(1, current - 1))
      }
      if (event.key === "ArrowRight") {
        setPage((current) => Math.min(totalPages, current + 1))
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose, totalPages])

  useEffect(() => {
    if (!open || !blob || !canvasRef.current) return

    const currentBlob = blob
    let cancelled = false

    async function render() {
      setLoading(true)
      setError(null)

      try {
        const data = new Uint8Array(await currentBlob.arrayBuffer())
        const document = await getDocument({ data }).promise
        if (cancelled) {
          await document.cleanup()
          return
        }

        setTotalPages(document.numPages)
        const safePage = Math.min(Math.max(1, page), document.numPages)
        if (safePage !== page) {
          setPage(safePage)
          await document.cleanup()
          return
        }

        const pdfPage = await document.getPage(safePage)
        const viewport = pdfPage.getViewport({ scale: 1.25 })
        const canvas = canvasRef.current
        if (!canvas || cancelled) {
          await document.cleanup()
          return
        }

        const context = canvas.getContext("2d")
        if (!context) {
          await document.cleanup()
          return
        }

        canvas.height = viewport.height
        canvas.width = viewport.width
        await pdfPage.render({ canvasContext: context, viewport, canvas }).promise
        await document.cleanup()
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "PDF konnte nicht angezeigt werden."
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [open, blob, page])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`PDF Viewer ${fileName}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              Seite {page} von {totalPages}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Vorherige Seite"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Nächste Seite"
            >
              <ChevronRightIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Schließen"
            >
              <XIcon />
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-auto bg-muted/30 p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Seite wird geladen…
            </div>
          ) : null}
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : null}
          <canvas
            ref={canvasRef}
            className="mx-auto block max-w-full rounded shadow-sm"
          />
        </div>
      </div>
    </div>
  )
}
