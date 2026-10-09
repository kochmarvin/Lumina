import type { ChatMessage } from "@/lib/ollama"
import type { PdfPageText } from "@/lib/pdf"

export const PDF_CHAR_BUDGET = 14000
export const PDF_MAX_PAGES = 12

export const PDF_QA_SYSTEM_PROMPT = `Du beantwortest Fragen zu einer PDF anhand der gelieferten Seitenauszüge.

Regeln
Nutze nur die gelieferten Auszüge. Erfinde nichts.
Sage klar, ob die Information in der PDF steht oder nicht gefunden wurde.
Wenn etwas gefunden wurde, nenne die Seite mit genau diesem Format [[Seite N]].
Füge nach dem Zitat einen kurzen Belegsatz aus dem Auszug an.
Wenn nichts passt, schreibe klar dass es in der PDF nicht gefunden wurde.
Antworte auf Deutsch, außer die Frage ist in einer anderen Sprache.`

const STOP_WORDS = new Set([
  "der",
  "die",
  "das",
  "und",
  "oder",
  "ein",
  "eine",
  "einer",
  "einem",
  "einen",
  "ist",
  "sind",
  "war",
  "was",
  "wie",
  "wo",
  "wer",
  "wen",
  "mit",
  "ohne",
  "für",
  "fur",
  "von",
  "im",
  "in",
  "am",
  "an",
  "auf",
  "zu",
  "zum",
  "zur",
  "den",
  "dem",
  "des",
  "nicht",
  "auch",
  "noch",
  "schon",
  "dass",
  "daß",
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "is",
  "are",
  "was",
  "were",
  "what",
  "where",
  "which",
  "who",
  "how",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zà-öø-ÿ0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

export function selectRelevantPages(
  pages: PdfPageText[],
  question: string,
  maxPages = PDF_MAX_PAGES,
  charBudget = PDF_CHAR_BUDGET
): PdfPageText[] {
  const tokens = tokenize(question)
  const scored = pages.map((page) => {
    const haystack = page.text.toLowerCase()
    let score = 0

    for (const token of tokens) {
      if (!haystack.includes(token)) continue
      const matches = haystack.split(token).length - 1
      score += matches * (token.length > 5 ? 2 : 1)
    }

    if (!page.text.trim()) score -= 100
    return { page, score }
  })

  scored.sort((a, b) => b.score - a.score || a.page.page - b.page.page)

  const hasSignal = scored.some((item) => item.score > 0)
  const candidates = hasSignal
    ? scored.filter((item) => item.score > 0)
    : pages.slice(0, maxPages).map((page) => ({ page, score: 0 }))

  const selected: PdfPageText[] = []
  let used = 0

  for (const item of candidates) {
    if (selected.length >= maxPages) break
    const text = item.page.text.slice(0, 2500)
    if (!text.trim()) continue
    if (used + text.length > charBudget && selected.length > 0) break
    selected.push({ page: item.page.page, text })
    used += text.length
  }

  if (selected.length === 0) {
    return pages
      .filter((page) => page.text.trim())
      .slice(0, Math.min(3, maxPages))
      .map((page) => ({ page: page.page, text: page.text.slice(0, 2500) }))
  }

  return selected.sort((a, b) => a.page - b.page)
}

export function buildPdfContext(pages: PdfPageText[]): string {
  return pages
    .map((page) => `--- Seite ${page.page} ---\n${page.text}`)
    .join("\n\n")
}

export function buildPdfApiMessages(
  question: string,
  pages: PdfPageText[],
  history: ChatMessage[] = []
): ChatMessage[] {
  const context = buildPdfContext(pages)
  const recent = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-4)

  return [
    { role: "system", content: PDF_QA_SYSTEM_PROMPT },
    ...recent,
    {
      role: "user",
      content: `Nutze ausschließlich diese PDF Auszüge.\n\n${context}\n\nFrage: ${question}`,
    },
  ]
}

export const PAGE_CITE_REGEX = /\[\[Seite\s+(\d+)\]\]/gi

export function extractCitedPages(content: string): number[] {
  const pages = new Set<number>()
  for (const match of content.matchAll(PAGE_CITE_REGEX)) {
    const page = Number(match[1])
    if (Number.isFinite(page) && page > 0) pages.add(page)
  }
  return [...pages].sort((a, b) => a - b)
}
