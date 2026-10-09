export const OLLAMA_MODEL = "qwen3:14b"

export type ChatRole = "user" | "assistant" | "system"

export type ChatMessage = {
  role: ChatRole
  content: string
}

type OllamaStreamChunk = {
  message?: {
    role?: string
    content?: string
  }
  done?: boolean
  error?: string
}

export async function streamChat(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: true,
      think: false,
    }),
    signal,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(
      detail.trim() ||
        `Ollama antwortet nicht (HTTP ${response.status}). Läuft der Server auf Port 11434?`
    )
  }

  if (!response.body) {
    throw new Error("Keine Streaming-Antwort von Ollama erhalten.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      let chunk: OllamaStreamChunk
      try {
        chunk = JSON.parse(trimmed) as OllamaStreamChunk
      } catch {
        continue
      }

      if (chunk.error) {
        throw new Error(chunk.error)
      }

      const content = chunk.message?.content
      if (content) {
        onDelta(content)
      }
    }
  }

  const leftover = buffer.trim()
  if (leftover) {
    try {
      const chunk = JSON.parse(leftover) as OllamaStreamChunk
      if (chunk.error) {
        throw new Error(chunk.error)
      }
      const content = chunk.message?.content
      if (content) {
        onDelta(content)
      }
    } catch (error) {
      if (error instanceof Error && error.message !== leftover) {
        throw error
      }
    }
  }
}
