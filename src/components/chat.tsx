import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Loader2Icon, SendHorizontalIcon } from "lucide-react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageContent,
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
import {
  OLLAMA_MODEL,
  streamChat,
  type ChatMessage,
} from "@/lib/ollama"

type UiMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

function createId() {
  return crypto.randomUUID()
}

export function Chat() {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    setError(null)
    setInput("")

    const userMessage: UiMessage = {
      id: createId(),
      role: "user",
      content: text,
    }
    const assistantId = createId()
    const assistantMessage: UiMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    }

    setMessages([...messages, userMessage, assistantMessage])
    setIsStreaming(true)

    const apiMessages: ChatMessage[] = [
      ...messages.map(({ role, content }) => ({ role, content })),
      { role: "user", content: text },
    ]

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat(
        apiMessages,
        (delta) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + delta }
                : message
            )
          )
        },
        controller.signal
      )
    } catch (err) {
      if (controller.signal.aborted) return

      const message =
        err instanceof Error
          ? err.message
          : "Unbekannter Fehler bei der Anfrage an Ollama."

      setError(message)
      setMessages((current) =>
        current.filter(
          (item) => item.id !== assistantId || item.content.length > 0
        )
      )
    } finally {
      abortRef.current = null
      setIsStreaming(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-sm font-medium">Lokaler Chat</h1>
          <p className="text-xs text-muted-foreground">{OLLAMA_MODEL}</p>
        </div>
        {isStreaming ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Antwortet…
          </div>
        ) : null}
      </header>

      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
              {messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-24 text-center text-sm text-muted-foreground">
                  Schreib eine Nachricht, um mit {OLLAMA_MODEL} zu chatten.
                </div>
              ) : (
                messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <Message align={message.role === "user" ? "end" : "start"}>
                      <MessageContent>
                        <MessageHeader>
                          {message.role === "user" ? "Du" : "Assistent"}
                        </MessageHeader>
                        <Bubble
                          variant={
                            message.role === "user" ? "default" : "secondary"
                          }
                          align={message.role === "user" ? "end" : "start"}
                        >
                          <BubbleContent className="whitespace-pre-wrap">
                            {message.content ||
                              (isStreaming ? "…" : "")}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="border-t bg-background px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht schreiben…"
              disabled={isStreaming}
              className="max-h-40 min-h-12 flex-1 resize-none"
              rows={2}
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void handleSend()}
              disabled={isStreaming || !input.trim()}
              aria-label="Nachricht senden"
            >
              {isStreaming ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SendHorizontalIcon />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter zum Senden · Shift+Enter für neue Zeile
          </p>
        </div>
      </div>
    </div>
  )
}
