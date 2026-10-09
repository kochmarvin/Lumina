import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Loader2Icon, SendHorizontalIcon } from "lucide-react"

import { ChatSidebar } from "@/components/chat-sidebar"
import { CopyButton } from "@/components/copy-button"
import { Markdown } from "@/components/markdown"
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
import { OLLAMA_MODEL, streamChat, type ChatMessage } from "@/lib/ollama"

export function Chat() {
  const {
    chats,
    activeChat,
    activeChatId,
    messages,
    setChatMessages,
    selectChat,
    newChat,
    deleteChat,
    createMessageId,
  } = useChats()

  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeChatIdRef = useRef(activeChatId)

  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function stopStreaming() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }

  function handleNewChat() {
    stopStreaming()
    setError(null)
    setInput("")
    newChat()
    textareaRef.current?.focus()
  }

  function handleSelectChat(chatId: string) {
    if (chatId === activeChatId) return
    stopStreaming()
    setError(null)
    setInput("")
    selectChat(chatId)
  }

  function handleDeleteChat(chatId: string) {
    if (chatId === activeChatId) {
      stopStreaming()
      setError(null)
      setInput("")
    }
    deleteChat(chatId)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    const chatId = activeChatId
    setError(null)
    setInput("")

    const userMessage = {
      id: createMessageId(),
      role: "user" as const,
      content: text,
    }
    const assistantId = createMessageId()
    const assistantMessage = {
      id: assistantId,
      role: "assistant" as const,
      content: "",
    }

    const previousMessages = messages
    setChatMessages(chatId, [
      ...previousMessages,
      userMessage,
      assistantMessage,
    ])
    setIsStreaming(true)

    const apiMessages: ChatMessage[] = [
      ...previousMessages.map(({ role, content }) => ({ role, content })),
      { role: "user", content: text },
    ]

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat(
        apiMessages,
        (delta) => {
          setChatMessages(chatId, (current) =>
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

      if (activeChatIdRef.current === chatId) {
        setError(message)
      }
      setChatMessages(chatId, (current) =>
        current.filter(
          (item) => item.id !== assistantId || item.content.length > 0
        )
      )
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      if (activeChatIdRef.current === chatId) {
        setIsStreaming(false)
        textareaRef.current?.focus()
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium">
              {activeChat?.title ?? "Lokaler Chat"}
            </h1>
            <p className="text-xs text-muted-foreground">{OLLAMA_MODEL}</p>
          </div>
          {isStreaming ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              Antwortet…
            </div>
          ) : null}
        </header>

        <MessageScrollerProvider key={activeChatId}>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
                {messages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-24 text-center text-sm text-muted-foreground">
                    Schreib eine Nachricht, um mit {OLLAMA_MODEL} zu chatten.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isUser = message.role === "user"
                    const showPlaceholder =
                      !message.content && isStreaming && !isUser

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={isUser}
                      >
                        <Message align={isUser ? "end" : "start"}>
                          <MessageContent>
                            <MessageHeader>
                              {isUser ? "Du" : "Assistent"}
                            </MessageHeader>
                            <Bubble
                              variant={isUser ? "default" : "ghost"}
                              align={isUser ? "end" : "start"}
                              className={isUser ? undefined : "max-w-full"}
                            >
                              <BubbleContent
                                className={
                                  isUser
                                    ? "whitespace-pre-wrap"
                                    : "w-full max-w-full"
                                }
                              >
                                {showPlaceholder ? (
                                  "…"
                                ) : isUser ? (
                                  message.content
                                ) : (
                                  <Markdown>{message.content}</Markdown>
                                )}
                              </BubbleContent>
                            </Bubble>
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
              Enter zum Senden · Shift+Enter für neue Zeile · Chats lokal
              gespeichert
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
