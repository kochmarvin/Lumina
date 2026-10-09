export type UiMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type ChatThread = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: UiMessage[]
}

export type ChatStore = {
  activeChatId: string
  chats: ChatThread[]
}

export const CHATS_STORAGE_KEY = "local-llm-chats"

export function createId() {
  return crypto.randomUUID()
}

export function createChat(partial?: Partial<ChatThread>): ChatThread {
  const now = Date.now()
  return {
    id: createId(),
    title: "Neuer Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    ...partial,
  }
}

export function createEmptyStore(): ChatStore {
  const chat = createChat()
  return {
    activeChatId: chat.id,
    chats: [chat],
  }
}

export function titleFromMessage(content: string) {
  const cleaned = content.replace(/\s+/g, " ").trim()
  if (!cleaned) return "Neuer Chat"
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned
}

export function loadChatStore(): ChatStore {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY)
    if (!raw) return createEmptyStore()

    const parsed = JSON.parse(raw) as Partial<ChatStore>
    if (!Array.isArray(parsed.chats) || parsed.chats.length === 0) {
      return createEmptyStore()
    }

    const chats = parsed.chats
      .filter((chat): chat is ChatThread => Boolean(chat?.id))
      .map((chat) => ({
        id: chat.id,
        title: chat.title || "Neuer Chat",
        createdAt: chat.createdAt || Date.now(),
        updatedAt: chat.updatedAt || chat.createdAt || Date.now(),
        messages: Array.isArray(chat.messages) ? chat.messages : [],
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)

    if (chats.length === 0) return createEmptyStore()

    const activeChatId =
      chats.find((chat) => chat.id === parsed.activeChatId)?.id ?? chats[0].id

    return { activeChatId, chats }
  } catch {
    return createEmptyStore()
  }
}

export function saveChatStore(store: ChatStore) {
  localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(store))
}
