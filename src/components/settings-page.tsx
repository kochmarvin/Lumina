import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlayIcon,
  RefreshCwIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  loadActiveModel,
  saveActiveModel,
} from "@/lib/active-model"
import { APP_NAME } from "@/lib/brand"
import {
  checkOllamaHealth,
  deleteModel,
  formatBytes,
  listLocalModels,
  listRunningModels,
  openOllamaDownloadPage,
  pullModel,
  startModel,
  stopModel,
  type LocalModel,
  type PullProgress,
  type RunningModel,
} from "@/lib/ollama-admin"
import { QWEN_MODELS } from "@/lib/qwen-models"
import { cn } from "@/lib/utils"

type SettingsPageProps = {
  onBack: () => void
  onActiveModelChange?: (model: string) => void
}

export function SettingsPage({
  onBack,
  onActiveModelChange,
}: SettingsPageProps) {
  const [online, setOnline] = useState<boolean | null>(null)
  const [localModels, setLocalModels] = useState<LocalModel[]>([])
  const [runningModels, setRunningModels] = useState<RunningModel[]>([])
  const [activeModel, setActiveModel] = useState(() => loadActiveModel())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyModel, setBusyModel] = useState<string | null>(null)
  const [pullingModel, setPullingModel] = useState<string | null>(null)
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null)
  const pullAbortRef = useRef<AbortController | null>(null)

  const installedNames = useMemo(
    () => new Set(localModels.map((model) => model.name)),
    [localModels]
  )
  const runningNames = useMemo(
    () => new Set(runningModels.map((model) => model.name)),
    [runningModels]
  )

  const refresh = useCallback(async () => {
    setError(null)
    const healthy = await checkOllamaHealth()
    setOnline(healthy)
    if (!healthy) {
      setLocalModels([])
      setRunningModels([])
      setLoading(false)
      return
    }

    try {
      const [locals, running] = await Promise.all([
        listLocalModels(),
        listRunningModels(),
      ])
      setLocalModels(locals)
      setRunningModels(running)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Status konnte nicht geladen werden."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void refresh()
    }, 5000)
    return () => {
      window.clearInterval(timer)
      pullAbortRef.current?.abort()
    }
  }, [refresh])

  function selectActiveModel(model: string) {
    setActiveModel(model)
    saveActiveModel(model)
    onActiveModelChange?.(model)
  }

  async function handlePull(model: string) {
    if (pullingModel) return
    setError(null)
    setPullingModel(model)
    setPullProgress({ status: "Starte Download…", percent: 0 })

    const controller = new AbortController()
    pullAbortRef.current = controller

    try {
      await pullModel(
        model,
        (progress) => setPullProgress(progress),
        controller.signal
      )
      await refresh()
    } catch (err) {
      if (controller.signal.aborted) return
      setError(
        err instanceof Error ? err.message : `Download von ${model} fehlgeschlagen.`
      )
    } finally {
      if (pullAbortRef.current === controller) {
        pullAbortRef.current = null
      }
      setPullingModel(null)
      setPullProgress(null)
    }
  }

  function cancelPull() {
    pullAbortRef.current?.abort()
    pullAbortRef.current = null
    setPullingModel(null)
    setPullProgress(null)
  }

  async function handleStart(model: string) {
    setBusyModel(model)
    setError(null)
    try {
      await startModel(model)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Start von ${model} fehlgeschlagen.`
      )
    } finally {
      setBusyModel(null)
    }
  }

  async function handleStop(model: string) {
    setBusyModel(model)
    setError(null)
    try {
      await stopModel(model)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Stop von ${model} fehlgeschlagen.`
      )
    } finally {
      setBusyModel(null)
    }
  }

  async function handleDelete(model: string) {
    if (!window.confirm(`${model} wirklich löschen?`)) return
    setBusyModel(model)
    setError(null)
    try {
      await deleteModel(model)
      if (activeModel === model) {
        const next = localModels.find((item) => item.name !== model)?.name
        if (next) selectActiveModel(next)
      }
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Löschen von ${model} fehlgeschlagen.`
      )
    } finally {
      setBusyModel(null)
    }
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Zurück zum Chat"
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight">
              Einstellungen
            </h1>
            <p className="text-xs text-muted-foreground">{APP_NAME}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setLoading(true)
            void refresh()
          }}
        >
          <RefreshCwIcon className={cn(loading && "animate-spin")} />
          Aktualisieren
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <section className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Ollama</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Runtime für lokale Qwen Modelle
                </p>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  online
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                    : online === false
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    online
                      ? "bg-emerald-500"
                      : online === false
                        ? "bg-destructive"
                        : "bg-muted-foreground"
                  )}
                />
                {online === null
                  ? "Prüfe…"
                  : online
                    ? "Online"
                    : "Offline"}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={openOllamaDownloadPage}
              >
                <ExternalLinkIcon />
                Ollama installieren
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setLoading(true)
                  void refresh()
                }}
              >
                <RefreshCwIcon />
                Verbindung prüfen
              </Button>
            </div>

            {!online && online !== null ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Ollama ist nicht erreichbar. Installiere Ollama, starte die App
                (oder `ollama serve`) und prüfe erneut.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold">Qwen Modelle</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Downloaden, starten, stoppen und als aktives Chat Modell wählen
              </p>
              <p className="mt-2 text-xs">
                Aktiv im Chat:{" "}
                <span className="font-medium text-violet-700 dark:text-violet-300">
                  {activeModel}
                </span>
              </p>
            </div>

            {pullingModel && pullProgress ? (
              <div className="mb-4 rounded-xl border border-violet-300/60 bg-violet-50/70 p-3 dark:border-violet-500/30 dark:bg-violet-950/30">
                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-violet-950 dark:text-violet-50">
                    Lädt {pullingModel}
                  </span>
                  <span className="text-xs tabular-nums text-violet-800 dark:text-violet-200">
                    {pullProgress.percent}%
                  </span>
                </div>
                <Progress
                  value={pullProgress.percent}
                  max={100}
                  className="w-full [&_[data-slot=progress-indicator]]:bg-violet-600 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-violet-200/80 dark:[&_[data-slot=progress-indicator]]:bg-violet-400 dark:[&_[data-slot=progress-track]]:bg-violet-950/80"
                />
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-violet-800/90 dark:text-violet-200/90">
                  <span className="truncate">{pullProgress.status}</span>
                  <span className="shrink-0">
                    {pullProgress.total
                      ? `${formatBytes(pullProgress.completed ?? 0)} / ${formatBytes(pullProgress.total)}`
                      : ""}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={cancelPull}
                >
                  Download abbrechen
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              {QWEN_MODELS.map((model) => {
                const installed = installedNames.has(model.id)
                const running = runningNames.has(model.id)
                const isActive = activeModel === model.id
                const isBusy = busyModel === model.id
                const isPulling = pullingModel === model.id
                const local = localModels.find((item) => item.name === model.id)

                return (
                  <div
                    key={model.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center",
                      isActive &&
                        "border-violet-400/70 bg-violet-50/50 dark:border-violet-500/40 dark:bg-violet-950/20"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{model.label}</p>
                        {installed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                            <CheckCircle2Icon className="size-3" />
                            Installiert
                          </span>
                        ) : null}
                        {running ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                            Läuft
                          </span>
                        ) : null}
                        {isActive ? (
                          <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white">
                            Aktiv
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {model.description} · {model.sizeLabel}
                        {local ? ` · ${formatBytes(local.size)}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {!installed ? (
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1.5"
                          disabled={!online || Boolean(pullingModel)}
                          onClick={() => void handlePull(model.id)}
                        >
                          {isPulling ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <DownloadIcon />
                          )}
                          Download
                        </Button>
                      ) : (
                        <>
                          {!isActive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={isBusy || Boolean(pullingModel)}
                              onClick={() => selectActiveModel(model.id)}
                            >
                              Für Chat nutzen
                            </Button>
                          ) : null}
                          {running ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={isBusy || Boolean(pullingModel)}
                              onClick={() => void handleStop(model.id)}
                            >
                              {isBusy ? (
                                <Loader2Icon className="animate-spin" />
                              ) : (
                                <SquareIcon className="fill-current" />
                              )}
                              Stop
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={isBusy || Boolean(pullingModel)}
                              onClick={() => void handleStart(model.id)}
                            >
                              {isBusy ? (
                                <Loader2Icon className="animate-spin" />
                              ) : (
                                <PlayIcon />
                              )}
                              Start
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isBusy || Boolean(pullingModel)}
                            onClick={() => void handleDelete(model.id)}
                            aria-label={`${model.id} löschen`}
                            title="Löschen"
                          >
                            <Trash2Icon />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
