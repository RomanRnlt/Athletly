# Athletly API

Pydantic-validated chat backend over litellm. Streams responses via SSE so the
mobile chat feels live.

## Setup

```bash
cd services/api
uv venv --python 3.13
uv pip install -e .
cp .env.example .env   # then fill in keys, or copy from a working source
```

## Run

```bash
uv run uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Non-streaming chat:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi Ohm"}]}'
```

Streaming chat (SSE):

```bash
curl -N -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Was steht heute an?"}]}'
```

## Model switching

Set `ATHLETLY_CHAT_MODEL` in `.env`. Any litellm-compatible string works:

- `anthropic/claude-sonnet-4-5`
- `gemini/gemini-2.5-flash`
- `gemini/gemini-2.0-flash`

Per-request override via the `model` field on the request body.
