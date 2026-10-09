import { BrainIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { THINK_OPTIONS, type ThinkLevel } from "@/lib/thinking"

type ThinkLevelPickerProps = {
  value: ThinkLevel
  onChange: (level: ThinkLevel) => void
  disabled?: boolean
}

export function ThinkLevelPicker({
  value,
  onChange,
  disabled = false,
}: ThinkLevelPickerProps) {
  const current = THINK_OPTIONS.find((option) => option.id === value)

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (
          next === "off" ||
          next === "short" ||
          next === "medium" ||
          next === "long"
        ) {
          onChange(next)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="min-w-40" title="Denkmodus">
        <BrainIcon className="size-3.5 text-violet-600" />
        <SelectValue>
          {current ? `${current.label} · ${current.hint}` : "Aus"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {THINK_OPTIONS.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <span className="flex flex-col gap-0.5">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
