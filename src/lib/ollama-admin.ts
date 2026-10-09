export type LocalModel = {
  name: string
  size: number
  details?: {
    parameter_size?: string
    quantization_level?: string
    family?: string
  }
}

export type RunningModel = {
  name: string
  size: number
  size_vram?: number
  expires_at?: string
}

export type PullProgress = {
  status: string
  digest?: string
  total?: number
  completed?: number
  percent: number
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch("/api/tags", { method: "GET" })
    return response.ok
  } catch {
    return false
  }
}

export async function listLocalModels(): Promise<LocalModel[]> {
  const response = await fetch("/api/tags")
  if (!response.ok) {
    throw new Error("Modelle konnten nicht geladen werden.")
  }
  const data = (await response.json()) as { models?: LocalModel[] }
  return data.models ?? []
}

export async function listRunningModels(): Promise<RunningModel[]> {
  const response = await fetch("/api/ps")
  if (!response.ok) {
    throw new Error("Laufende Modelle konnten nicht geladen werden.")
  }
  const data = (await response.json()) as { models?: RunningModel[] }
  return data.models ?? []
}

export async function deleteModel(name: string): Promise<void> {
  const response = await fetch("/api/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(detail || `Löschen von ${name} fehlgeschlagen.`)
  }
}

/** Load model into memory. */
export async function startModel(name: string): Promise<void> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: name,
      prompt: "",
      stream: false,
      keep_alive: "30m",
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(detail || `Start von ${name} fehlgeschlagen.`)
  }
}

/** Unload model from memory. */
export async function stopModel(name: string): Promise<void> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: name,
      prompt: "",
      stream: false,
      keep_alive: 0,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(detail || `Stop von ${name} fehlgeschlagen.`)
  }
}

export async function pullModel(
  name: string,
  onProgress: (progress: PullProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch("/api/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name, stream: true }),
    signal,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(detail || `Download von ${name} fehlgeschlagen.`)
  }

  if (!response.body) {
    throw new Error("Keine Download-Antwort von Ollama.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let lastPercent = 0
  let lastTotal: number | undefined
  let lastCompleted: number | undefined

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
        const trimmed = line.trim()
        if (!trimmed) continue
        let chunk: {
          status?: string
          digest?: string
          total?: number
          completed?: number
          error?: string
        }
        try {
          chunk = JSON.parse(trimmed)
        } catch {
          continue
        }
        if (chunk.error) throw new Error(chunk.error)

        const total = chunk.total ?? 0
        const completed = chunk.completed ?? 0
        if (total > 0) {
          lastTotal = total
          lastCompleted = completed
          lastPercent = Math.min(100, Math.round((completed / total) * 100))
        } else if (
          chunk.status === "success" ||
          chunk.status === "complete"
        ) {
          lastPercent = 100
        }

        onProgress({
          status: chunk.status ?? "downloading",
          digest: chunk.digest,
          total: lastTotal,
          completed: lastCompleted,
          percent: lastPercent,
        })
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort)
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  )
  const value = bytes / 1024 ** index
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function openOllamaDownloadPage() {
  window.open("https://ollama.com/download", "_blank", "noopener,noreferrer")
}
