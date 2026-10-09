import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

export type PdfPageText = {
  page: number
  text: string
}

export type ExtractedPdf = {
  name: string
  pageCount: number
  pages: PdfPageText[]
}

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

async function extractPageText(
  document: PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await document.getPage(pageNumber)
  const content = await page.getTextContent()
  const parts: string[] = []

  for (const item of content.items) {
    if ("str" in item && typeof item.str === "string" && item.str.trim()) {
      parts.push(item.str)
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim()
}

export async function extractPdfText(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<ExtractedPdf> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Bitte eine PDF-Datei auswählen.")
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const document = await getDocument({ data }).promise
  const pageCount = document.numPages
  const pages: PdfPageText[] = []

  for (let page = 1; page <= pageCount; page++) {
    const text = await extractPageText(document, page)
    pages.push({ page, text })
    onProgress?.(page, pageCount)
  }

  await document.cleanup()

  return {
    name: file.name,
    pageCount,
    pages,
  }
}
