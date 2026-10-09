import type { ChatMessage } from "@/lib/ollama"

export type WebSearchResult = {
  title: string
  url: string
  description: string
}

export const SEARCH_SYSTEM_PROMPT = `Du beantwortest Fragen mit Hilfe von Web-Suchtreffern.

Regeln
Nutze nur die gelieferten Suchtreffer. Erfinde keine Fakten.
Sage klar, wenn die Treffer nicht ausreichen.
Nenne relevante Quellen als Markdown-Links mit Titel und URL.
Antworte auf Deutsch, außer die Frage ist in einer anderen Sprache.
Schreibe klar und knapp.`

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").trim()
}

export async function fetchWebSearch(query: string): Promise<WebSearchResult[]> {
  const response = await fetch("/web-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })

  const data = (await response.json().catch(() => null)) as {
    results?: WebSearchResult[]
    error?: string
  } | null

  if (!response.ok) {
    throw new Error(data?.error || "Web-Suche fehlgeschlagen.")
  }

  return (data?.results ?? []).map((item) => ({
    title: stripHtml(item.title ?? ""),
    url: item.url ?? "",
    description: stripHtml(item.description ?? ""),
  }))
}

function buildSearchContext(results: WebSearchResult[]) {
  return results
    .map((result, index) => {
      const lines = [
        `[${index + 1}] ${result.title}`,
        `URL: ${result.url}`,
      ]
      if (result.description) {
        lines.push(`Snippet: ${result.description}`)
      }
      return lines.join("\n")
    })
    .join("\n\n")
}

export function buildSearchApiMessages(
  question: string,
  results: WebSearchResult[],
  history: ChatMessage[] = []
): ChatMessage[] {
  const context = buildSearchContext(results)
  const recent = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-4)

  return [
    { role: "system", content: SEARCH_SYSTEM_PROMPT },
    ...recent,
    {
      role: "user",
      content: `Nutze ausschließlich diese Web-Suchtreffer.\n\n${context}\n\nFrage: ${question}`,
    },
  ]
}
