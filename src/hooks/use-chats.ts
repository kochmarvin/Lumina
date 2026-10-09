import { useEffect, useMemo, useState } from "react"

import {
  createChat,
  createId,
  loadChatStore,
  saveChatStore,
  titleFromMessage,
  type ChatPdfMeta,
  type ChatStore,
  type UiMessage,
} from "@/lib/chats"
import { deletePdfForChat } from "@/lib/pdf-store"

export function useChats() {
  const [store, setStore] = useState<ChatStore>(() => loadChatStore())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setStore(loadChatStore())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      saveChatStore(store)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [store, hydrated])

  const activeChat = useMemo(
    () =>
      store.chats.find((chat) => chat.id === store.activeChatId) ??
      store.chats[0],
    [store]
  )

  const sortedChats = useMemo(
    () => [...store.chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [store.chats]
  )

  function setChatMessages(
    chatId: string,
    messages: UiMessage[] | ((current: UiMessage[]) => UiMessage[])
  ) {
    setStore((current) => ({
      ...current,
      chats: current.chats.map((chat) => {
        if (chat.id !== chatId) return chat

        const nextMessages =
          typeof messages === "function" ? messages(chat.messages) : messages

        const firstUser = nextMessages.find(
          (message) => message.role === "user" && message.content.trim()
        )

        return {
          ...chat,
          messages: nextMessages,
          updatedAt: Date.now(),
          title:
            chat.title === "Neuer Chat" && firstUser
              ? titleFromMessage(firstUser.content)
              : chat.title,
        }
      }),
    }))
  }

  function setChatPdf(chatId: string, pdf: ChatPdfMeta | undefined) {
    setStore((current) => ({
      ...current,
      chats: current.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              pdf,
              updatedAt: Date.now(),
            }
          : chat
      ),
    }))
  }

  function selectChat(chatId: string) {
    setStore((current) => {
      if (!current.chats.some((chat) => chat.id === chatId)) return current
      return { ...current, activeChatId: chatId }
    })
  }

  function newChat() {
    const chat = createChat()
    setStore((current) => ({
      activeChatId: chat.id,
      chats: [chat, ...current.chats],
    }))
    return chat.id
  }

  function deleteChat(chatId: string) {
    void deletePdfForChat(chatId)
    setStore((current) => {
      const remaining = current.chats.filter((chat) => chat.id !== chatId)
      if (remaining.length === 0) {
        const chat = createChat()
        return { activeChatId: chat.id, chats: [chat] }
      }

      const activeChatId =
        current.activeChatId === chatId
          ? remaining.sort((a, b) => b.updatedAt - a.updatedAt)[0].id
          : current.activeChatId

      return { activeChatId, chats: remaining }
    })
  }

  return {
    chats: sortedChats,
    activeChat,
    activeChatId: store.activeChatId,
    messages: activeChat?.messages ?? [],
    setChatMessages,
    setChatPdf,
    selectChat,
    newChat,
    deleteChat,
    createMessageId: createId,
  }
}
