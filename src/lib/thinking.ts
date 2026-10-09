export type ThinkLevel = "off" | "short" | "medium" | "long"

export type ThinkOption = {
  id: ThinkLevel
  label: string
  hint: string
}

export const THINK_OPTIONS: ThinkOption[] = [
  { id: "off", label: "Aus", hint: "Direkt antworten" },
  { id: "short", label: "Kurz", hint: "Kurzes Nachdenken" },
  { id: "medium", label: "Mittel", hint: "Ausgewogen" },
  { id: "long", label: "Lang", hint: "Ausführlich nachdenken" },
]

export const THINK_STORAGE_KEY = "local-llm-think-level"

export function loadThinkLevel(): ThinkLevel {
  try {
    const value = localStorage.getItem(THINK_STORAGE_KEY)
    if (value === "off" || value === "short" || value === "medium" || value === "long") {
      return value
    }
  } catch {
    // ignore
  }
  return "medium"
}

export function saveThinkLevel(level: ThinkLevel) {
  localStorage.setItem(THINK_STORAGE_KEY, level)
}

/** Maps UI levels to Ollama think + output budget (thinking + answer share num_predict). */
export function toOllamaThinkConfig(level: ThinkLevel): {
  think: boolean
  options?: { num_predict: number }
} {
  switch (level) {
    case "off":
      return { think: false }
    case "short":
      return { think: true, options: { num_predict: 1024 } }
    case "medium":
      return { think: true, options: { num_predict: 4096 } }
    case "long":
      return { think: true, options: { num_predict: 16384 } }
  }
}
