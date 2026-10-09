<p align="center">
  <img src="docs/lumina.png" alt="Lumina" width="280" />
</p>

<h1 align="center">Lumina</h1>

<p align="center">
  <strong>Lokale AI. Schnell. Privat.</strong><br />
  Chat-UI für Ollama mit Qwen3 — Streaming, PDF-Fragen, Paraphrasieren und Web-Suche.
</p>

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) 20+
- [Ollama](https://ollama.com/download) (wird von den Start-Skripten bei Bedarf mitinstalliert)

## Installation

```bash
git clone <repo-url> local-llm
cd local-llm
npm install
```

## Starten

### Windows

Doppelklick auf `start.bat`, oder:

```powershell
.\start.bat
# alternativ:
npm run start:win
```

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
# alternativ:
npm run start:mac
```

Die Skripte prüfen Ollama, laden bei Bedarf `qwen3:14b` und starten den Dev-Server unter:

**http://localhost:5173**

Stoppen mit `Ctrl+C`.

### Nur Frontend (Ollama läuft schon)

```bash
npm run dev
```

## Features

- **Chat** mit Streaming gegen lokale Qwen3-Modelle über Ollama
- **Denkmodus** (Aus / Kurz / Mittel / Lang)
- **Paraphrasieren** — Text umschreiben, Inhalt bleibt
- **PDF** — Datei ablegen, Fragen stellen, Seiten-Zitate
- **Web-Suche** — DuckDuckGo-Treffer als Kontext für Antworten
- **Einstellungen** — Ollama-Status, Modelle downloaden / starten / stoppen / aktiv setzen
- **Mehrere Chats** — lokal im Browser gespeichert

## Modelle wählen

In der App unter **Einstellungen** Qwen3-Varianten (0.6B–32B) herunterladen und mit **Für Chat nutzen** aktivieren.

Standard beim ersten Start: `qwen3:14b`.

## Projektstruktur (kurz)

| Pfad | Inhalt |
|------|--------|
| `src/components/` | Chat, Settings, PDF-UI |
| `src/lib/` | Ollama-Client, PDF, Suche, Prompts |
| `vite-plugin-web-search.ts` | DuckDuckGo-Suche im Dev-Server |
| `start.bat` / `start.ps1` / `start.sh` | One-Click-Start |

## Lizenz

Privat / lokal nutzbar — siehe Repository-Einstellungen.
