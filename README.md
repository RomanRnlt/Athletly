# Athletly v2

Monorepo: Expo mobile app + FastAPI chat backend with a pydantic-validated agent
streaming over litellm.

```
athletly_v2/
  mobile/         Expo SDK 54 + NativeWind v4 (3 tabs: Plan / Chat / Einstellungen)
  services/
    api/          FastAPI + litellm + SSE streaming, model-agnostic chat
```

## Quick start

Two terminals:

### Backend

```bash
cd services/api
uv venv --python 3.13
uv pip install -e .
# .env already has working keys; .env.example documents what is needed
uv run uvicorn app.main:app --reload --port 8000
```

Health: `curl http://localhost:8000/health`

### Mobile

```bash
cd mobile
npx expo start
```

Press `i` for iOS Simulator, scan the QR with Expo Go on a real device, or `w` for web.

The mobile app auto-discovers the backend URL from Expo's Metro host, so it
works on simulator AND real device on the same Wifi with zero config (port
8000 on the same machine that runs `expo start`). The backend binds to
`0.0.0.0` by default so the device can reach it.

Override only when needed (tunnel mode, deployed backend, web in a browser):

```
# mobile/.env
EXPO_PUBLIC_API_URL=https://athletly-api.fly.dev
```

## Switching LLM models

Edit `services/api/.env`:

```
ATHLETLY_CHAT_MODEL=anthropic/claude-sonnet-4-5
# or
ATHLETLY_CHAT_MODEL=gemini/gemini-2.5-flash
```

Any litellm-compatible identifier works. Per-request override via the `model`
field on `POST /chat` or `POST /chat/stream`.

## Layout decisions

- `mobile/` and `services/api/` are independent projects, no npm/uv workspace
  layer on purpose. Each has its own lockfile and toolchain.
- The chat screen calls `services/api` over SSE via `react-native-sse`.
- Backend validates request bodies through pydantic, agent system prompt is in
  `services/api/app/agent.py`.
- `.env` is per service and gitignored. `.env.example` is committed.
