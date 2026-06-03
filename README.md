<div align="center">
  <h1>Athletly</h1>
  <h3>AI Training Coach - a declarative, self-evaluating multi-agent system</h3>
  <p>
    <img src="https://img.shields.io/badge/backend-FastAPI-009688" alt="FastAPI">
    <img src="https://img.shields.io/badge/python-≥3.12-blue" alt="Python">
    <img src="https://img.shields.io/badge/web-Next.js-000000" alt="Next.js">
    <img src="https://img.shields.io/badge/mobile-Expo_/_React_Native-000020" alt="Expo">
    <img src="https://img.shields.io/badge/LLM-LiteLLM_(Claude)-orange" alt="LLM">
    <img src="https://img.shields.io/badge/DB-Supabase-3ECF8E" alt="Supabase">
    <img src="https://img.shields.io/badge/streaming-SSE-blueviolet" alt="SSE">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  </p>
</div>

---

An AI coaching engine built around a **declarative agent architecture**: an agent is just a **Skill + a Model**. Capabilities are authored as `SKILL.md` folders (the agent registry), not hardcoded. Training plans are produced by a **generator agent that spawns an evaluator agent** and revises until quality passes, and the whole plan agent is guarded by an **eval harness with an LLM judge and severity calibration**. The code computes the objective facts, the LLM only interprets them. One backend (FastAPI + Supabase + LiteLLM) serves two clients from a shared design system: an **Expo** mobile app and a **Next.js** web app.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Declarative Skill-Based Agents](#declarative-skill-based-agents)
- [Plan Generation: Generator + Evaluator](#plan-generation-generator--evaluator)
- [Eval Harness: Golden Fixtures + LLM Judge](#eval-harness-golden-fixtures--llm-judge)
- [Code Computes, the LLM Interprets](#code-computes-the-llm-interprets)
- [Cost Control: Prompt Caching + Credit Metering](#cost-control-prompt-caching--credit-metering)
- [Privacy by Design](#privacy-by-design)
- [Clients: Mobile + Web](#clients-mobile--web)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Design Decisions](#design-decisions)
- [License](#license)

---

## System Architecture

One backend serves both clients. The chat endpoint streams every token and tool call in real time over Server-Sent Events; plan generation runs as nested sub-agents inside the same request.

```mermaid
graph TB
    WEB(["Web App (Next.js)"])
    APP(["Mobile App (Expo)"])

    subgraph API["API Layer (FastAPI)"]
        CHAT["/chat/stream (SSE)"]
        AUTH["Supabase JWT (ES256)"]
        GATE["Consent + Credit Gates"]
    end

    subgraph Engine["Agent Engine"]
        COACH["Coach Agent (tool loop)"]
        SPAWN["Sub-agent Spawner"]
        SKILLS["SKILL.md Registry"]
    end

    subgraph AI["LiteLLM Gateway"]
        CLAUDE["Claude (Sonnet)"]
        OTHER["Gemini / others"]
    end

    subgraph Data["Persistence (Supabase)"]
        PG[("PostgreSQL + RLS")]
    end

    GARMIN["Garmin (garth)"]

    WEB -->|"JWT + SSE"| CHAT
    APP -->|"JWT + SSE"| CHAT
    CHAT --> AUTH & GATE
    CHAT --> COACH
    COACH <-->|"reason + tools"| CLAUDE
    CLAUDE -.->|"configurable"| OTHER
    COACH --> SPAWN --> SKILLS
    COACH --> PG
    GARMIN -.-> PG

    style WEB fill:#7C3AED,stroke:#4F46E5,color:#fff
    style APP fill:#7C3AED,stroke:#4F46E5,color:#fff
    style CHAT fill:#2563EB,stroke:#1D4ED8,color:#fff
    style AUTH fill:#2563EB,stroke:#1D4ED8,color:#fff
    style GATE fill:#2563EB,stroke:#1D4ED8,color:#fff
    style COACH fill:#4F46E5,stroke:#7C3AED,color:#fff
    style SPAWN fill:#4F46E5,stroke:#7C3AED,color:#fff
    style SKILLS fill:#4F46E5,stroke:#7C3AED,color:#fff
    style CLAUDE fill:#0F172A,stroke:#2563EB,color:#fff
    style OTHER fill:#0F172A,stroke:#2563EB,color:#fff
    style PG fill:#22C55E,stroke:#16A34A,color:#fff
```

---

## Declarative Skill-Based Agents

The central idea: **Agent = Skill + Model**. A skill is a `SKILL.md` folder whose frontmatter declares everything operational (its model, allowed tools, which child agents it may spawn, its terminal "submit" tool and output schema). Adding a capability means writing a skill, not wiring code.

```mermaid
flowchart LR
    SKILL["SKILL.md\n(name + tools + model + spawns)"] --> SPEC["AgentSpec"]
    SPEC --> ENGINE["run_subagent engine"]
    ENGINE -->|"+ model"| AGENT(["Running Agent"])
    AGENT -->|"may spawn"| CHILD(["Child Agent"])

    style SKILL fill:#7C3AED,stroke:#4F46E5,color:#fff
    style ENGINE fill:#2563EB,stroke:#1D4ED8,color:#fff
    style AGENT fill:#4F46E5,stroke:#7C3AED,color:#fff
    style CHILD fill:#4F46E5,stroke:#7C3AED,color:#fff
```

**How it works:**
1. Each skill is a folder with a `SKILL.md` (frontmatter: `name`, `allowed-tools`, and a `metadata.athletly` block with model, spawnable children, terminal tool + strict schema).
2. `agents.py` turns a skill into an `AgentSpec`; `subagent.py` is the generic engine that runs any spec as a tool-calling loop.
3. A spawnable skill is exposed to its parent as a tool, so the coach can spawn a specialist mid-conversation; spawns can nest.
4. All operational config lives in the skill, all plumbing in two modules. New behavior = a new `SKILL.md`.

| Concern | Lives in |
|---|---|
| What an agent can do, which model, which children | The skill's `SKILL.md` frontmatter |
| How any agent actually runs (tool loop, retries, output) | `subagent.py` (generic engine) |
| Wiring skills to the engine, nesting, spawn-as-tool | `agents.py` |
| Domain knowledge (training, coaching) | The skill body + the model |

---

## Plan Generation: Generator + Evaluator

A training plan is not produced in one shot. A **generator** agent drafts a plan in a universal session grammar, **spawns an evaluator** agent that scores it against the rubric, then revises against the feedback until it passes (bounded round cap) and submits.

```mermaid
flowchart LR
    A["Gather athlete data"] --> B["Generator drafts plan"]
    B --> C["Spawn Evaluator"]
    C --> D{Approved?}
    D -->|"No"| E["Feedback"]
    E --> B
    D -->|"Yes"| F(["Submit plan"])

    style B fill:#4F46E5,stroke:#7C3AED,color:#fff
    style C fill:#2563EB,stroke:#1D4ED8,color:#fff
    style D fill:#F59E0B,stroke:#D97706,color:#000
    style F fill:#22C55E,stroke:#16A34A,color:#fff
```

The generator and evaluator are themselves just two skills (`skills/plan`, `skills/evaluate-plan`) on the same generic engine. The evaluator returns structured, severity-tagged findings; approval is **deterministic** (a function of severities), not a vibe. Plans are written in a single **session grammar** so the same structure renders identically on web and mobile.

---

## Eval Harness: Golden Fixtures + LLM Judge

The plan agent is regression-tested by an **eval harness**: golden athlete fixtures run through the real agent, and an **LLM judge** scores each output against a rubric, with **severity calibration** so the judge's strictness stays stable across runs.

```mermaid
flowchart LR
    FIX["Golden Fixtures"] --> RUN["Run real plan agent"]
    RUN --> OUT["Plan output"]
    OUT --> JUDGE["LLM Judge + rubric"]
    JUDGE --> CAL["Severity calibration"]
    CAL --> REP["Scored report (pass/fail)"]

    style FIX fill:#7C3AED,stroke:#4F46E5,color:#fff
    style RUN fill:#4F46E5,stroke:#7C3AED,color:#fff
    style JUDGE fill:#2563EB,stroke:#1D4ED8,color:#fff
    style REP fill:#22C55E,stroke:#16A34A,color:#fff
```

Fixtures run concurrently with tight LLM timeouts and a single retry on transient failures. Reports are written to `services/api/app/evals/reports/`. This makes prompt and skill changes measurable rather than guesswork.

---

## Code Computes, the LLM Interprets

The objective fitness picture is computed in plain Python from the athlete's last 28 days of activities and 14 days of daily metrics. The LLM never does the math; it receives clean numbers and interprets them.

| Concern | Who handles it |
|---|---|
| Weekly volume, acute:chronic workload ratio (ACWR) | `athlete_state.py` (deterministic compute) |
| Typical paces / heart rate per sport, recovery baseline + trend | `athlete_state.py` |
| What this means for the athlete's readiness | The LLM, given the computed snapshot |
| How to phrase the next session or adjust load | The LLM, against the profile + beliefs |

`compute_state()` never crashes on sparse data and annotates data-quality caveats so the model can weigh them. The model's job is judgement, not arithmetic.

---

## Cost Control: Prompt Caching + Credit Metering

Two layers keep AI spend bounded. **Anthropic prompt caching** marks the large, stable system prompt as cacheable, cutting input cost on follow-up turns. A **credit meter** charges flat credits per user action (chat vs plan), enforced as a gate before any LLM call.

```mermaid
flowchart LR
    REQ(["User action"]) --> GATE{Credits left?}
    GATE -->|"No"| BLOCK["402 - upgrade / wait"]
    GATE -->|"Yes"| RUN["Run agent (cached system prompt)"]
    RUN --> METER["Record tokens + cost + credits"]

    style REQ fill:#7C3AED,stroke:#4F46E5,color:#fff
    style GATE fill:#F59E0B,stroke:#D97706,color:#000
    style RUN fill:#4F46E5,stroke:#7C3AED,color:#fff
    style METER fill:#22C55E,stroke:#16A34A,color:#fff
```

| Tier | Monthly credits | Source |
|---|---|---|
| Free | configurable (default 40) | the cost ceiling per user |
| Pro | configurable (default 1000) | RevenueCat subscription (webhook-driven) |
| Grandfather | unlimited | manual grant (founder / testers) |

A per-request meter (via `contextvars`) accumulates token usage across the chat turn and every spawned sub-agent into one charge. Real tokens and USD cost are logged to `ai_usage_events` for tuning. Subscriptions are handled with native in-app purchases through RevenueCat (the only viable path for App Store / Play Store digital subscriptions); the backend never sees a payment, only a tier flip via webhook.

---

## Privacy by Design

Health data is special-category data. Consent is explicit and gated server-side, and users can export or fully erase their data.

| Right | Implementation |
|---|---|
| Explicit consent (Art. 9) | Consent screen + an append-only `user_consents` audit trail; `/chat` returns 403 without a valid, current consent |
| Data export (Art. 20) | `GET /account/export` returns a portable JSON snapshot (no secrets/tokens) |
| Erasure (Art. 17) | `DELETE /account` wipes every account-scoped table and the auth user (all tables cascade) |
| Data minimization | Objective metrics are pseudonymous numbers; the LLM call avoids direct identifiers |

Garmin access uses the open-source `garth` library: because Garmin (unlike Strava) does not openly provide a developer API, this project uses `garth` to access the owner's own Garmin data. A production version would migrate to official Garmin OAuth.

---

## Clients: Mobile + Web

Both clients share one design system and the same backend. The web app exists because, without an App Store release, a browser app is the universal, zero-install client for desktop and mobile.

| | Mobile (`mobile/`) | Web (`web/`) |
|---|---|---|
| Framework | Expo / React Native, expo-router | Next.js App Router |
| Styling | NativeWind (Tailwind) | Tailwind |
| Design tokens + API types | `@athletly/shared` | `@athletly/shared` |
| Chat streaming | SSE via `react-native-sse` | SSE via `fetch` + `ReadableStream` |
| Payments | RevenueCat (native IAP) | n/a (mobile only) |
| Demo mode | - | seed data + scripted chat, no backend or key |
| PWA | - | manifest + service worker, add-to-home-screen |

The web app ships a **demo mode** (`NEXT_PUBLIC_DEMO_MODE=true`): seeded athlete data and a scripted coaching conversation, so the full UI can be deployed publicly with no backend, no API key, and no cost. With the flag off, it runs against the real backend.

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Backend** | FastAPI + Uvicorn | Async API + SSE streaming |
| **LLM Gateway** | LiteLLM | Provider-agnostic LLM calls (Claude default, Gemini configurable) |
| **Primary Model** | Claude (Sonnet) | Coach agent, plan generation, evaluation |
| **Database** | Supabase (PostgreSQL + RLS) | Persistence, row-level security, auth |
| **Auth** | Supabase JWT (ES256, JWKS) | Stateless token verification |
| **Wearables** | garth | Garmin Connect data access |
| **Billing** | RevenueCat | Native in-app subscriptions (webhook to backend) |
| **Mobile** | Expo / React Native + NativeWind | iOS/Android client |
| **Web** | Next.js + Tailwind | Universal browser client + PWA |
| **Shared** | `@athletly/shared` (npm workspace) | Design tokens + API contract types |
| **Eval** | Golden fixtures + LLM judge | Plan-agent regression testing |

---

## Project Structure

```
athletly/                        # npm-workspaces monorepo
├── services/api/                # FastAPI backend (Python)
│   ├── app/
│   │   ├── main.py              #   Routes: chat (SSE), garmin, profile, account, billing
│   │   ├── agent.py             #   Coach agent: LiteLLM streaming + tool loop + prompt caching
│   │   ├── agents.py            #   SKILL.md -> AgentSpec; spawn wiring + nesting
│   │   ├── subagent.py          #   Generic agent run engine (tool-calling loop)
│   │   ├── plan_agent.py        #   Plan entry: spawns the generator (which nests the evaluator)
│   │   ├── tools.py             #   Tool registry + schemas
│   │   ├── athlete_state.py     #   Objective fitness compute (ACWR, volume, paces, recovery)
│   │   ├── skills.py            #   Skill loading + frontmatter
│   │   ├── usage.py / billing.py#   Credit meter + tiers + RevenueCat webhook
│   │   ├── consent.py / account.py # GDPR consent, export, erasure
│   │   ├── auth.py / db.py / supabase_client.py
│   │   └── evals/               #   Golden fixtures + LLM judge + reports
│   ├── skills/                  #   plan/, evaluate-plan/, onboarding/ (SKILL.md folders)
│   └── supabase/migrations/     #   SQL migrations
│
├── web/                         # Next.js web client (+ demo mode + PWA)
│   └── src/{app,components,lib}  #   routes, ported components, hooks, demo seed/script
│
├── mobile/                      # Expo React Native client
│   └── {app,components,lib}      #   expo-router screens, components, hooks
│
└── packages/shared/             # @athletly/shared: design tokens + API types
```

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm (for web + mobile workspaces)
- Python 3.12+ (for the backend)
- A Supabase project (Postgres + Auth)
- An Anthropic API key (or another LiteLLM-supported provider)

### 1. Clone + install
```bash
git clone https://github.com/RomanRnlt/Athletly.git
cd Athletly
npm install                      # installs the web + mobile workspaces
```

### 2. Backend (`services/api`)
```bash
cd services/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # fill in the values below
uvicorn app.main:app --reload --port 8000
```
Required env (`services/api/.env`):
```
ANTHROPIC_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
# optional: ATHLETLY_CHAT_MODEL, ATHLETLY_CREDITS_FREE, REVENUECAT_WEBHOOK_TOKEN, ...
```
Apply the database schema with the Supabase CLI:
```bash
supabase db push                 # from services/api (migrations in supabase/migrations)
```

### 3. Web (`web`) - try it with zero backend
```bash
cd web
cp .env.example .env.local
# Demo mode: seeded data + scripted chat, no backend/key needed
echo "NEXT_PUBLIC_DEMO_MODE=true" >> .env.local
npm run dev                      # http://localhost:3000
```
For the real backend instead, set `NEXT_PUBLIC_DEMO_MODE=false` and provide
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 4. Mobile (`mobile`)
```bash
cd mobile
cp .env.example .env             # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, ANON_KEY
npx expo start
```

### 5. Run the eval harness (optional)
```bash
cd services/api && python -m app.evals.run
```

> Deploying the web demo: import the repo into Vercel, set **Root Directory = `web/`** (the npm workspace resolves automatically) and `NEXT_PUBLIC_DEMO_MODE=true`. No secrets required.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| **Agent = Skill + Model** | New capabilities are authored as `SKILL.md`, not code. The engine is generic. |
| **Generator + Evaluator loop** | A plan is critiqued by a second agent and revised, with deterministic approval, not one-shot. |
| **Eval harness with LLM judge** | Prompt/skill changes are measured against golden fixtures, with severity calibration. |
| **Code computes, LLM interprets** | All training math is deterministic Python; the model only reasons over clean numbers. |
| **LiteLLM over a direct SDK** | Provider-agnostic; switch models with one config value. |
| **Prompt caching + credit meter** | Bounded, predictable AI cost; the free cap is the per-user cost ceiling. |
| **One backend, two clients, shared package** | Web + mobile stay in sync via `@athletly/shared`; the web app is the zero-install universal client. |
| **Privacy by design** | Explicit consent gate, full export + erasure, data minimization at the LLM boundary. |
| **RevenueCat for subscriptions** | The only compliant path for digital subscriptions on the App Store / Play Store. |

---

## License

MIT - see [LICENSE](LICENSE).

> Status: this is an open-source / portfolio release, not a maintained commercial product.
