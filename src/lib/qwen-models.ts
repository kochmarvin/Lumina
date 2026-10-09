export type QwenModelInfo = {
  id: string
  label: string
  sizeLabel: string
  description: string
}

/** Curated Qwen3 tags from the Ollama library. */
export const QWEN_MODELS: QwenModelInfo[] = [
  {
    id: "qwen3:0.6b",
    label: "Qwen3 0.6B",
    sizeLabel: "~0.5 GB",
    description: "Sehr schnell, leicht",
  },
  {
    id: "qwen3:1.7b",
    label: "Qwen3 1.7B",
    sizeLabel: "~1.4 GB",
    description: "Klein und flott",
  },
  {
    id: "qwen3:4b",
    label: "Qwen3 4B",
    sizeLabel: "~2.5 GB",
    description: "Guter Allrounder",
  },
  {
    id: "qwen3:8b",
    label: "Qwen3 8B",
    sizeLabel: "~5.2 GB",
    description: "Starke Qualität",
  },
  {
    id: "qwen3:14b",
    label: "Qwen3 14B",
    sizeLabel: "~9.3 GB",
    description: "Empfohlen für Lumina",
  },
  {
    id: "qwen3:30b",
    label: "Qwen3 30B",
    sizeLabel: "~19 GB",
    description: "MoE, sehr stark",
  },
  {
    id: "qwen3:32b",
    label: "Qwen3 32B",
    sizeLabel: "~20 GB",
    description: "Dense, top Qualität",
  },
]
