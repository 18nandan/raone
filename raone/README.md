# raone — Personal AI Assistant

## Quick Start (Web Dashboard)

### Prerequisites
- **Bun 1.3.11**: `npm install -g bun` or `curl -fsSL https://bun.sh/install | bash`

### 1. Start the Daemon (backend)
```bash
cd raone/assistant
bun install
bun run src/daemon/index.ts
```
The daemon starts on **http://localhost:7821**

### 2. Start the Web Dashboard (frontend)
Open a **second terminal**:
```bash
cd raone/web
bun install
bun run dev
```
The dashboard starts on **http://localhost:4000**

### 3. Open your browser
Visit **http://localhost:4000** — you'll see the raone chat interface.

---

## Dashboard Features
- **Conversation list** on the left
- **New Conversation** button to start fresh
- **Chat pane** with streaming responses
- **Daemon status indicator** (green = online, red = offline)
- Type messages and press Enter to send

---

## Full CLI Usage
```bash
raone hatch --name myassistant   # Create a new assistant
raone wake myassistant           # Start the daemon
raone ps                         # List running assistants
raone sleep myassistant          # Stop the daemon
raone client myassistant         # Terminal chat (alternative to web UI)
```

## Project Structure
```
raone/
├── assistant/     # Core daemon (conversations, memory, LLM)
├── gateway/       # Public-facing API (webhooks, channels)
├── cli/           # raone command-line tool
├── credential-executor/  # Secure credential handling
├── web/           # Next.js web dashboard ← YOU ARE HERE
├── packages/      # Shared libraries
├── skills/        # Plugin system (browser, gmail, etc.)
└── docker/        # Container deployment
```

## Architecture
```
Browser → Web Dashboard (:4000) → Assistant Daemon (:7821) → LLM Provider
                                                                ↓
                                                          Memory System
                                                                ↓
                                                          Skills / CES
```
