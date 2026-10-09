import {
  MessageSquarePlusIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import type { ChatThread } from "@/lib/chats"
import { cn } from "@/lib/utils"

type ChatSidebarProps = {
  chats: ChatThread[]
  activeChatId: string
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onOpenSettings?: () => void
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
  onOpenSettings,
}: ChatSidebarProps) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-muted/30">
      <div className="space-y-3 border-b px-3 py-4">
        <div>
          <p className="text-base font-semibold tracking-tight text-violet-700 dark:text-violet-300">
            {APP_NAME}
          </p>
          <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
        </div>
        <Button
          type="button"
          className="w-full justify-center gap-2"
          onClick={onNewChat}
        >
          <MessageSquarePlusIcon />
          Neuer Chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Noch keine Chats
          </p>
        ) : (
          chats.map((chat) => {
            const active = chat.id === activeChatId
            return (
              <div
                key={chat.id}
                className={cn(
                  "group flex h-14 items-center gap-1 rounded-xl px-2 transition-colors",
                  active
                    ? "bg-violet-100 text-violet-950 dark:bg-violet-950/50 dark:text-violet-50"
                    : "hover:bg-muted/80"
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col justify-center text-left"
                  onClick={() => onSelectChat(chat.id)}
                >
                  <span className="truncate text-sm font-medium">
                    {chat.title}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[11px]",
                      active
                        ? "text-violet-800/80 dark:text-violet-200/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatTime(chat.updatedAt)}
                    {chat.pdf ? " · PDF" : ""}
                    {chat.messages.length > 0
                      ? ` · ${chat.messages.length}`
                      : ""}
                  </span>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    "shrink-0 text-destructive opacity-0 transition-opacity",
                    "hover:bg-destructive/10 hover:text-destructive",
                    "group-hover:opacity-100 focus-visible:opacity-100",
                    active && "opacity-100"
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteChat(chat.id)
                  }}
                  aria-label="Chat löschen"
                  title="Löschen"
                >
                  <Trash2Icon />
                </Button>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onOpenSettings}
        >
          <SettingsIcon />
          Einstellungen
        </Button>
      </div>
    </aside>
  )
}
