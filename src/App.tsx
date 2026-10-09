import { useState } from "react"

import { Chat } from "@/components/chat"
import { SettingsPage } from "@/components/settings-page"

type View = "chat" | "settings"

export function App() {
  const [view, setView] = useState<View>("chat")
  const [modelVersion, setModelVersion] = useState(0)

  if (view === "settings") {
    return (
      <SettingsPage
        onBack={() => setView("chat")}
        onActiveModelChange={() => setModelVersion((value) => value + 1)}
      />
    )
  }

  return (
    <Chat
      key={modelVersion}
      onOpenSettings={() => setView("settings")}
    />
  )
}

export default App
