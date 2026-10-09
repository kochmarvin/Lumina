#!/usr/bin/env bash
set -euo pipefail

MODEL="qwen3:14b"
APP_URL="http://localhost:5173"
OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

CYAN=$'\033[36m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
RESET=$'\033[0m'

info() { printf "%s→%s %s\n" "$CYAN" "$RESET" "$*"; }
ok() { printf "%s✓%s %s\n" "$GREEN" "$RESET" "$*"; }
warn() { printf "%s!%s %s\n" "$YELLOW" "$RESET" "$*"; }
fail() { printf "%s✗%s %s\n" "$RED" "$RESET" "$*"; exit 1; }

print_banner() {
  cat <<EOF

${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   Lumina ist bereit                                      ║
║                                                          ║
║   Öffne im Browser:                                      ║
║   ${GREEN}${APP_URL}${CYAN}                                   ║
║                                                          ║
║   Modell: ${MODEL}                                       ║
║   Stoppen: Ctrl+C                                        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝${RESET}

EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ollama_api_up() {
  curl -fsS --max-time 2 "$OLLAMA_HOST/api/tags" >/dev/null 2>&1
}

model_installed() {
  ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx "$MODEL" \
    || ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -q "^${MODEL}"
}

install_ollama() {
  warn "Ollama ist nicht installiert."
  if require_cmd brew; then
    info "Installiere Ollama mit Homebrew…"
    brew install ollama
  else
    info "Installiere Ollama mit dem offiziellen Installer…"
    curl -fsSL https://ollama.com/install.sh | sh
  fi
  require_cmd ollama || fail "Ollama-Installation fehlgeschlagen. Bitte manuell von https://ollama.com installieren."
  ok "Ollama installiert."
}

ensure_ollama_running() {
  if ollama_api_up; then
    ok "Ollama läuft bereits."
    return
  fi

  info "Starte Ollama…"
  if [[ -d "/Applications/Ollama.app" ]]; then
    open -a Ollama || true
  fi

  nohup ollama serve >/tmp/local-llm-ollama.log 2>&1 &
  disown || true

  for _ in $(seq 1 30); do
    if ollama_api_up; then
      ok "Ollama ist gestartet."
      return
    fi
    sleep 1
  done

  fail "Ollama konnte nicht gestartet werden. Log: /tmp/local-llm-ollama.log"
}

ensure_model() {
  if model_installed; then
    ok "Modell ${MODEL} ist installiert."
    return
  fi

  warn "Modell ${MODEL} fehlt – lade herunter (kann dauern)…"
  ollama pull "$MODEL"
  model_installed || fail "Modell ${MODEL} konnte nicht installiert werden."
  ok "Modell ${MODEL} installiert."
}

warmup_model() {
  info "Prüfe, ob ${MODEL} antwortet…"
  if curl -fsS --max-time 120 "$OLLAMA_HOST/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$MODEL\",\"prompt\":\"hi\",\"stream\":false,\"think\":false,\"options\":{\"num_predict\":1}}" \
    >/dev/null 2>&1; then
    ok "Modell ${MODEL} ist bereit."
  else
    warn "Modell-Warmup fehlgeschlagen – die App startet trotzdem. Beim ersten Chat kann es länger dauern."
  fi
}

ensure_node() {
  require_cmd node || fail "Node.js fehlt. Bitte von https://nodejs.org installieren."
  require_cmd npm || fail "npm fehlt. Bitte Node.js neu installieren."
  ok "Node.js $(node -v) / npm $(npm -v)"
}

ensure_deps() {
  if [[ ! -d node_modules ]]; then
    info "Installiere npm-Abhängigkeiten…"
    npm install
  else
    ok "npm-Abhängigkeiten vorhanden."
  fi
}

main() {
  printf "\n%s%sLumina - Start%s\n\n" "$BOLD" "$CYAN" "$RESET"

  ensure_node

  if ! require_cmd ollama; then
    install_ollama
  else
    ok "Ollama gefunden ($(ollama --version 2>/dev/null | head -n1))"
  fi

  ensure_ollama_running
  ensure_model
  warmup_model
  ensure_deps

  print_banner
  info "Starte die App…"
  echo
  npm run dev -- --host 127.0.0.1 --port 5173
}

main "$@"
