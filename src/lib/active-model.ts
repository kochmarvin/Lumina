const STORAGE_KEY = "lumina-active-model"
export const DEFAULT_MODEL = "qwen3:14b"

export function loadActiveModel(): string {
  try {
    const value = localStorage.getItem(STORAGE_KEY)?.trim()
    if (value) return value
  } catch {
    // ignore
  }
  return DEFAULT_MODEL
}

export function saveActiveModel(model: string) {
  localStorage.setItem(STORAGE_KEY, model)
}
