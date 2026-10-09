import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import {
  Loader2Icon,
  SearchIcon,
  SendHorizontalIcon,
  SpellCheck2Icon,
  SquareIcon,
} from "lucide-react"

import { ChatSidebar } from "@/components/chat-sidebar"
import { CitedContent } from "@/components/cited-content"
import { CopyButton } from "@/components/copy-button"
import { Markdown } from "@/components/markdown"
import {
  PdfAttachmentChip,
  PdfDropzone,
  PdfUploadButton,
} from "@/components/pdf-dropzone"
import { PdfViewer } from "@/components/pdf-viewer"
import { ThinkLevelPicker } from "@/components/think-level-picker"
import { ThinkingPanel } from "@/components/thinking-panel"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Textarea } from "@/components/ui/textarea"
import { useChats } from "@/hooks/use-chats"
import { loadActiveModel } from "@/lib/active-model"
import { APP_NAME } from "@/lib/brand"
import { createId } from "@/lib/chats"
import { getActiveOllamaModel, streamChat, type ChatMessage } from "@/lib/ollama"
import { PARAPHRASE_SYSTEM_PROMPT } from "@/lib/paraphrase"
import { extractPdfText } from "@/lib/pdf"
import { buildPdfApiMessages, selectRelevantPages } from "@/lib/pdf-qa"
import {
  deletePdfForChat,
  getPdfForChat,
  savePdfForChat,
  type StoredPdf,
} from "@/lib/pdf-store"
import {
  loadThinkLevel,
  saveThinkLevel,
  type ThinkLevel,
} from "@/lib/thinking"
import { cn } from "@/lib/utils"
import { buildSearchApiMessages, fetchWebSearch } from "@/lib/web-search"

type ChatProps = {
  onOpenSettings?: () => void
}

export function Chat({ onOpenSettings }: ChatProps) {
  const {
    chats,
    activeChat,
    activeChatId,
    messages,
    setChatMessages,
    setChatPdf,
    selectChat,
    newChat,
    deleteChat,
    createMessageId,
  } = useChats()

  const [activeModel, setActiveModel] = useState(() => loadActiveModel())
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(
    null
  )
  const [thinkLevel, setThinkLevel] = useState<ThinkLevel>(() => loadThinkLevel())
  const [paraphraseMode, setParaphraseMode] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfProcessing, setPdfProcessing] = useState(false)
  const [pdfProgress, setPdfProgress] = useState<string | null>(null)
  const [storedPdf, setStoredPdf] = useState<StoredPdf | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerPage, setViewerPage] = useState(1)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const openPdfPickerRef = useRef<(() => void) | null>(null)
  const activeChatIdRef = useRef(activeChatId)

  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    setActiveModel(getActiveOllamaModel())
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!isStreaming) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      event.preventDefault()
      stopStreaming()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isStreaming])

  useEffect(() => {
    let cancelled = false

    async function loadPdf() {
      if (!activeChat?.pdf) {
        setStoredPdf(null)
        return
      }

      const pdf = await getPdfForChat(activeChatId)
      if (!cancelled) {
        setStoredPdf(pdf)
      }
    }

    void loadPdf()
    return () => {
      cancelled = true
    }
  }, [activeChatId, activeChat?.pdf?.id])

  function stopStreaming() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setStreamingAssistantId(null)
  }

  function handleThinkLevelChange(level: ThinkLevel) {
    setThinkLevel(level)
    saveThinkLevel(level)
  }

  function handleNewChat() {
    stopStreaming()
    setError(null)
    setInput("")
    setViewerOpen(false)
    newChat()
    textareaRef.current?.focus()
  }

  function handleSelectChat(chatId: string) {
    if (chatId === activeChatId) return
    stopStreaming()
    setError(null)
    setInput("")
    setViewerOpen(false)
    selectChat(chatId)
  }

  function handleDeleteChat(chatId: string) {
    if (chatId === activeChatId) {
      stopStreaming()
      setError(null)
      setInput("")
      setViewerOpen(false)
      setStoredPdf(null)
    }
    deleteChat(chatId)
  }

  async function handlePdfFile(file: File) {
    if (pdfProcessing || isStreaming) return

    setError(null)
    setPdfProcessing(true)
    setPdfProgress("PDF wird gelesen…")

    const chatId = activeChatId

    try {
      const extracted = await extractPdfText(file, (done, total) => {
        setPdfProgress(`Seite ${done} / ${total}`)
      })

      if (activeChatIdRef.current !== chatId) return

      const pdfId = createId()
      const saved = await savePdfForChat(chatId, file, extracted, pdfId)
      setChatPdf(chatId, {
        id: pdfId,
        name: extracted.name,
        pageCount: extracted.pageCount,
      })
      setStoredPdf(saved)
      setPdfProgress(null)
    } catch (err) {
      if (activeChatIdRef.current === chatId) {
        setError(
          err instanceof Error
            ? err.message
            : "PDF konnte nicht verarbeitet werden."
        )
      }
    } finally {
      if (activeChatIdRef.current === chatId) {
        setPdfProcessing(false)
        setPdfProgress(null)
      }
    }
  }

  async function handleRemovePdf() {
    const chatId = activeChatId
    await deletePdfForChat(chatId)
    setChatPdf(chatId, undefined)
    setStoredPdf(null)
    setViewerOpen(false)
  }

  function openPdfAtPage(page: number) {
    setViewerPage(Math.max(1, page))
    setViewerOpen(true)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming || pdfProcessing) return

    const chatId = activeChatId
    const usePdf =
      Boolean(activeChat?.pdf) && !paraphraseMode && !searchMode
    const messageMode = paraphraseMode
      ? ("paraphrase" as const)
      : searchMode
        ? ("search" as const)
        : usePdf
          ? ("pdf" as const)
          : undefined
    setError(null)
    setInput("")

    const userMessage = {
      id: createMessageId(),
      role: "user" as const,
      content: text,
      ...(messageMode ? { mode: messageMode } : {}),
    }
    const assistantId = createMessageId()
    const assistantMessage = {
      id: assistantId,
      role: "assistant" as const,
      content: "",
      ...(messageMode ? { mode: messageMode } : {}),
    }

    const previousMessages = messages
    setChatMessages(chatId, [
      ...previousMessages,
      userMessage,
      assistantMessage,
    ])
    setIsStreaming(true)
    setStreamingAssistantId(assistantId)

    const historyMessages: ChatMessage[] = previousMessages.map(
      ({ role, content }) => ({ role, content })
    )

    let apiMessages: ChatMessage[]
    const activeThinkLevel: ThinkLevel = paraphraseMode ? "off" : thinkLevel

    try {
      if (paraphraseMode) {
        apiMessages = [
          { role: "system", content: PARAPHRASE_SYSTEM_PROMPT },
          { role: "user", content: text },
        ]
      } else if (searchMode) {
        const results = await fetchWebSearch(text)
        if (results.length === 0) {
          throw new Error("Keine Suchtreffer gefunden.")
        }
        apiMessages = buildSearchApiMessages(text, results, historyMessages)
      } else if (usePdf) {
        const pdf =
          storedPdf?.chatId === chatId
            ? storedPdf
            : await getPdfForChat(chatId)

        if (!pdf) {
          throw new Error(
            "PDF-Daten nicht gefunden. Bitte die Datei erneut hochladen."
          )
        }

        const relevant = selectRelevantPages(pdf.pages, text)
        if (relevant.length === 0) {
          throw new Error(
            "In der PDF konnte kein Text gelesen werden. Gescannte PDFs ohne Textlayer werden nicht unterstützt."
          )
        }

        apiMessages = buildPdfApiMessages(text, relevant, historyMessages)
      } else {
        apiMessages = [...historyMessages, { role: "user", content: text }]
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Anfrage konnte nicht vorbereitet werden."
      setError(message)
      setChatMessages(chatId, (current) =>
        current.filter(
          (item) => item.id !== assistantId && item.id !== userMessage.id
        )
      )
      setIsStreaming(false)
      setStreamingAssistantId(null)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat(
        apiMessages,
        {
          onThinking: (delta) => {
            setChatMessages(chatId, (current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      thinking: (message.thinking ?? "") + delta,
                    }
                  : message
              )
            )
          },
          onContent: (delta) => {
            setChatMessages(chatId, (current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + delta }
                  : message
              )
            )
          },
        },
        {
          signal: controller.signal,
          thinkLevel: activeThinkLevel,
        }
      )
    } catch (err) {
      if (controller.signal.aborted) return

      const message =
        err instanceof Error
          ? err.message
          : "Unbekannter Fehler bei der Anfrage an Ollama."

      if (activeChatIdRef.current === chatId) {
        setError(message)
      }
      setChatMessages(chatId, (current) =>
        current.filter(
          (item) =>
            item.id !== assistantId ||
            item.content.length > 0 ||
            Boolean(item.thinking?.trim())
        )
      )
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      if (activeChatIdRef.current === chatId) {
        setIsStreaming(false)
        setStreamingAssistantId(null)
        textareaRef.current?.focus()
      }
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-svh bg-background">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={onOpenSettings}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b px-4">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              {activeChat?.title ?? APP_NAME}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {activeModel}
            </p>
          </div>
          {isStreaming ? (
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                <Loader2Icon className="size-3.5 animate-spin" />
                Antwortet…
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="gap-1.5"
                onClick={stopStreaming}
              >
                <SquareIcon className="size-3 fill-current" />
                Stop
              </Button>
            </div>
          ) : null}
        </header>

        <PdfDropzone
          disabled={isStreaming || pdfProcessing}
          isProcessing={pdfProcessing}
          openPickerRef={openPdfPickerRef}
          onFile={(file) => void handlePdfFile(file)}
        >
          <MessageScrollerProvider key={activeChatId}>
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
                  {messages.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center text-sm text-muted-foreground">
                      <p>
                        Schreib eine Nachricht, um mit {activeModel} zu
                        chatten.
                      </p>
                      <p>
                        Oder ziehe eine PDF hierher, um Fragen mit
                        Seitenangaben zu stellen.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isUser = message.role === "user"
                      const isParaphrase = message.mode === "paraphrase"
                      const isPdf = message.mode === "pdf"
                      const isSearch = message.mode === "search"
                      const isThinkingStream =
                        !isUser &&
                        isStreaming &&
                        message.id === streamingAssistantId
                      const showThinkingPanel =
                        !isUser &&
                        (Boolean(message.thinking?.trim()) ||
                          (isThinkingStream && thinkLevel !== "off"))

                      return (
                        <MessageScrollerItem
                          key={message.id}
                          messageId={message.id}
                          scrollAnchor={isUser}
                        >
                          <Message align={isUser ? "end" : "start"}>
                            <MessageContent>
                              <MessageHeader>
                                {isUser
                                  ? isParaphrase
                                    ? "Du · Paraphrasieren"
                                    : isSearch
                                      ? "Du · Suche"
                                      : isPdf
                                        ? "Du · PDF"
                                        : "Du"
                                  : isParaphrase
                                    ? "Paraphrase"
                                    : isSearch
                                      ? "Web-Suche"
                                      : isPdf
                                        ? "PDF Antwort"
                                        : "Assistent"}
                              </MessageHeader>
                              {showThinkingPanel ? (
                                <ThinkingPanel
                                  thinking={message.thinking ?? ""}
                                  isStreaming={
                                    isThinkingStream && !message.content
                                  }
                                />
                              ) : null}
                              {(message.content ||
                                (isThinkingStream && !showThinkingPanel)) && (
                                <Bubble
                                  variant={isUser ? "default" : "ghost"}
                                  align={isUser ? "end" : "start"}
                                  className={isUser ? undefined : "max-w-full"}
                                >
                                  <BubbleContent
                                    className={
                                      isUser || isParaphrase
                                        ? "whitespace-pre-wrap"
                                        : "w-full max-w-full"
                                    }
                                  >
                                    {!message.content && isThinkingStream ? (
                                      "…"
                                    ) : isUser || isParaphrase ? (
                                      message.content
                                    ) : isPdf ? (
                                      <CitedContent
                                        content={message.content}
                                        onOpenPage={openPdfAtPage}
                                      />
                                    ) : (
                                      <Markdown>{message.content}</Markdown>
                                    )}
                                  </BubbleContent>
                                </Bubble>
                              )}
                              {message.content ? (
                                <MessageFooter>
                                  <CopyButton text={message.content} />
                                </MessageFooter>
                              ) : null}
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      )
                    })
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

        </PdfDropzone>

        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <PdfAttachmentChip
              pdf={activeChat?.pdf}
              isProcessing={pdfProcessing}
              progressLabel={pdfProgress}
              onOpen={() => openPdfAtPage(1)}
              onRemove={() => void handleRemovePdf()}
            />

            <div className="flex flex-wrap items-center gap-2">
              <PdfUploadButton
                disabled={isStreaming || pdfProcessing}
                onClick={() => openPdfPickerRef.current?.()}
              />
              <Button
                type="button"
                size="sm"
                variant={paraphraseMode ? "default" : "outline"}
                className={cn(
                  "gap-1.5",
                  paraphraseMode &&
                    "bg-violet-600 text-white hover:bg-violet-600/90"
                )}
                aria-pressed={paraphraseMode}
                onClick={() => {
                  setParaphraseMode((value) => {
                    const next = !value
                    if (next) setSearchMode(false)
                    return next
                  })
                }}
                title="Text nur umschreiben Inhalt bleibt gleich"
              >
                <SpellCheck2Icon />
                Paraphrasieren
              </Button>
              <Button
                type="button"
                size="sm"
                variant={searchMode ? "default" : "outline"}
                className={cn(
                  "gap-1.5",
                  searchMode &&
                    "bg-violet-600 text-white hover:bg-violet-600/90"
                )}
                aria-pressed={searchMode}
                onClick={() => {
                  setSearchMode((value) => {
                    const next = !value
                    if (next) setParaphraseMode(false)
                    return next
                  })
                }}
                title="Im Web suchen und mit Treffern antworten"
              >
                <SearchIcon />
                Suche
              </Button>
              {!paraphraseMode ? (
                <ThinkLevelPicker
                  value={thinkLevel}
                  onChange={handleThinkLevelChange}
                  disabled={isStreaming || pdfProcessing}
                />
              ) : null}
            </div>

            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  paraphraseMode
                    ? "Text zum Paraphrasieren einfügen…"
                    : searchMode
                      ? "Im Web suchen…"
                      : activeChat?.pdf
                        ? "Frage zur PDF stellen…"
                        : "Nachricht schreiben…"
                }
                disabled={isStreaming || pdfProcessing}
                className="min-h-12 flex-1 resize-none overflow-hidden"
                rows={1}
              />
              {isStreaming ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="shrink-0"
                  onClick={stopStreaming}
                  aria-label="Antwort stoppen"
                  title="Stop"
                >
                  <SquareIcon className="fill-current" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  className="shrink-0"
                  onClick={() => void handleSend()}
                  disabled={pdfProcessing || !input.trim()}
                  aria-label="Nachricht senden"
                >
                  <SendHorizontalIcon />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PdfViewer
        open={viewerOpen}
        blob={storedPdf?.blob ?? null}
        fileName={storedPdf?.name ?? activeChat?.pdf?.name ?? "Dokument.pdf"}
        initialPage={viewerPage}
        pageCount={storedPdf?.pageCount ?? activeChat?.pdf?.pageCount}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}
