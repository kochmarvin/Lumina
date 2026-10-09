import { loadActiveModel } from "@/lib/active-model"
import { toOllamaThinkConfig, type ThinkLevel } from "@/lib/thinking"

/** @deprecated use loadActiveModel() — kept for quick imports in UI labels */
export function getActiveOllamaModel() {
  return loadActiveModel()
}

export type ChatRole = "user" | "assistant" | "system"

export type ChatMessage = {
  role: ChatRole
  content: string
}

type OllamaStreamChunk = {
  message?: {
    role?: string
    content?: string
    thinking?: string
  }
  done?: boolean
  error?: string
}

export type StreamChatHandlers = {
  onContent?: (text: string) => void
  onThinking?: (text: string) => void
}

export async function streamChat(
  messages: ChatMessage[],
  handlers: StreamChatHandlers,
  options?: {
    signal?: AbortSignal
    thinkLevel?: ThinkLevel
  }
): Promise<void> {
  const thinkLevel = options?.thinkLevel ?? "off"
  const thinkConfig = toOllamaThinkConfig(thinkLevel)
  const signal = options?.signal

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: loadActiveModel(),
      messages,
      stream: true,
      think: thinkConfig.think,
      ...(thinkConfig.options ? { options: thinkConfig.options } : {}),
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

  const onAbort = () => {
    void reader.cancel().catch(() => undefined)
  }
  signal?.addEventListener("abort", onAbort, { once: true })

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError")
      }

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        applyChunk(line, handlers)
      }
    }

    const leftover = buffer.trim()
    if (leftover) {
      applyChunk(leftover, handlers)
    }
  } finally {
    signal?.removeEventListener("abort", onAbort)
  }
}

function applyChunk(line: string, handlers: StreamChatHandlers) {
  const trimmed = line.trim()
  if (!trimmed) return

  let chunk: OllamaStreamChunk
  try {
    chunk = JSON.parse(trimmed) as OllamaStreamChunk
  } catch {
    return
  }

  if (chunk.error) {
    throw new Error(chunk.error)
  }

  const thinking = chunk.message?.thinking
  if (thinking) {
    handlers.onThinking?.(thinking)
  }

  const content = chunk.message?.content
  if (content) {
    handlers.onContent?.(content)
  }
}
