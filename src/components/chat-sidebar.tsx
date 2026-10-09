import { MessageSquarePlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatThread } from "@/lib/chats"

type ChatSidebarProps = {
  chats: ChatThread[]
  activeChatId: string
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp)
}

export function ChatSidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ChatSidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-muted/20">
      <div className="border-b p-3">
        <Button
          type="button"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <MessageSquarePlusIcon />
          Neuer Chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {chats.map((chat) => {
          const active = chat.id === activeChatId
          return (
            <div
              key={chat.id}
              className={cn(
                "group mb-1 flex items-start gap-1 rounded-lg px-2 py-2 transition-colors",
                active ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="truncate text-sm font-medium">{chat.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatTime(chat.updatedAt)}
                  {chat.messages.length > 0
                    ? ` · ${chat.messages.length} Nachrichten`
                    : ""}
                </div>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onDeleteChat(chat.id)}
                aria-label="Chat loeschen"
                title="Loeschen"
              >
                <Trash2Icon />
              </Button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
