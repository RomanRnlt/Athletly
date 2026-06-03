# Athletly Web

A Next.js (App Router) + Tailwind web app that is a 1:1 port of the Expo/React
Native mobile app in `../mobile`. Same visual design, same screens, same
behavior, same backend.

It talks to the SAME API as the mobile app (`../services/api`): chat SSE
streaming, Supabase auth, plan view, settings with usage/paywall/consent/GDPR,
and the onboarding chat.

## Prerequisites

- Node 18+ (tested on Node 20+)
- The backend API running (see `../services/api`), reachable at the URL you set
  in `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
- A Supabase project (the same one the mobile app uses)

## Setup

```bash
cd web
npm install
cp .env.example .env.local
# then edit .env.local
```

Set these env vars in `.env.local`. They mirror the mobile `EXPO_PUBLIC_*`
names, renamed to `NEXT_PUBLIC_*`:

| Web var | Mobile equivalent | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `EXPO_PUBLIC_API_URL` | Backend base URL, e.g. `http://localhost:8000` |
| `NEXT_PUBLIC_SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (not a secret) |

## Run

```bash
npm run dev      # dev server on http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run typecheck
```

### Backend CORS

The API (`services/api/app/main.py`) restricts origins via `settings.cors_origins`.
Make sure the web origin (e.g. `http://localhost:3000`) is included there, or the
browser will block requests. Auth uses a Bearer token (not cookies), so
`allow_credentials=False` is fine.

## Routes

| Route | Mirrors mobile screen |
|---|---|
| `/login` | `app/login.tsx` |
| `/consent` | `app/consent.tsx` |
| `/paywall` | `app/paywall.tsx` |
| `/plan` | `app/(tabs)/plan.tsx` (tab) |
| `/chat` | `app/(tabs)/chat.tsx` (tab) |
| `/settings` | `app/(tabs)/settings.tsx` (tab) |
| `/athlete-profile` | `app/athlete-profile.tsx` |
| `/synced-data` | `app/synced-data.tsx` |
| `/activity/[id]` | `app/activity/[id].tsx` |
| `/health/[date]` | `app/health/[date].tsx` |
| `/` | redirects to `/plan` (like `app/index.tsx`) |

Auth/consent gating (`src/app/providers.tsx`) reproduces `app/_layout.tsx`:
no session -> `/login`; session but consent needed -> `/consent`; otherwise the
app, and signed-in users are kept out of `/login` and `/consent`.

## How the design was ported

- **Colors:** `src/lib/colors.ts` and `tailwind.config.ts` are ported 1:1 from
  `mobile/lib/colors.ts` + `mobile/tailwind.config.js`. The SAME NativeWind class
  names are reused (`bg-primary`, `text-text-primary`, `bg-error-light`,
  `sport.*`, ...), so the ported JSX needed no color-class rewrites.
- **Gradient:** the mobile `LinearGradient` (`#2563EB -> #4F46E5 -> #7C3AED`) is a
  CSS gradient (`BRAND_GRADIENT`) used in the header, login, consent, and paywall.
- **Components:** every `mobile/components/*` was ported to web equivalents under
  `src/components/*` keeping the same structure, props, and Tailwind classes.
  `Pressable` -> `<button>`, RN `StyleSheet`/shadow objects -> CSS `box-shadow`,
  `react-native-svg` -> inline SVG, `lucide-react-native` -> `lucide-react`.
- **Phone frame:** the app renders in a centered, phone-width column
  (`AppFrame`) so the single-column mobile layout reads correctly on desktop.

## Networking + streaming

- `src/lib/api.ts` mirrors `mobile/lib/api.ts` (same endpoints, same Bearer-token
  request pattern, same `ApiError`).
- **Chat SSE:** the backend `POST /chat/stream` needs a Bearer header, which the
  browser's native `EventSource` cannot send. So `streamChat` uses `fetch` +
  `ReadableStream` and parses the SSE wire format by hand, dispatching the exact
  same events as mobile: `token`, `tool_call`, `tool_result`, `status`, `done`,
  `error`. The `useChat` hook is otherwise identical to the mobile one.

## What is stubbed or differs from mobile

- **Payments (paywall):** there is no RevenueCat native module on the web. The
  paywall UI is identical, but the purchase and restore CTAs are placeholders
  that show a notice pointing users to the mobile app. Wire up a web checkout
  (e.g. Stripe) in `src/app/paywall/page.tsx` when web billing is added. There is
  no `purchases.ts` equivalent.
- **Social sign-in:** mobile uses native Google/Apple SDKs with id-token sign-in.
  The web uses Supabase's OAuth redirect flow (`signInWithOAuth`) for both Google
  and Apple. Configure the providers + redirect URLs in the Supabase dashboard.
  Both buttons are shown on the login screen.
- **Native dialogs:** RN `Alert.alert` confirmations/notices map to the browser
  `confirm`/`alert` via `src/lib/dialog.ts` (same flows: sign out, reset, delete,
  withdraw consent, sync result, ...).
- **Data export:** mobile shares JSON via the OS share sheet; the web triggers a
  JSON file download instead (`src/lib/use-account.ts`).
- **Health day detail:** mobile passes the metric as a route param; the web
  stashes it in `sessionStorage` before navigating (`synced-data` ->
  `health/[date]`). Deep-linking straight to `/health/[date]` shows an empty
  state, matching mobile's behavior when the param is missing.
- **Apple Health, notifications/language/appearance rows, help, privacy policy:**
  placeholders in the mobile app too; left as placeholders here.
- **Voice input (mic button):** present in the chat input as in mobile, not wired
  to any speech API on either platform.

## Demo mode (no backend, no API key)

There is a single flag, `NEXT_PUBLIC_DEMO_MODE`, that turns the web app into a
fully self-contained public showcase. With it set to `true` the app needs NO
backend, NO Supabase project, and NO API key, and costs nothing to host.

| Var | Value | Effect |
|---|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Demo showcase mode (seed data, scripted chat, no network) |
| `NEXT_PUBLIC_DEMO_MODE` | unset / anything else | Normal mode: real Supabase auth + `services/api` backend (default) |

What flips when `DEMO_MODE` is on (`src/lib/demo/`):

- **Auth + consent bypassed** (`src/app/providers.tsx`): the app renders as a
  logged-in, consented user and lands on `/plan`. `/login` and `/consent` bounce
  to `/plan`.
- **Env is lenient** (`src/lib/supabase.ts`): missing `NEXT_PUBLIC_SUPABASE_*`
  no longer throws, so the build/prerender works with no backend env. Outside
  demo mode the env is still required.
- **Every `use-*` hook short-circuits** to seed data immediately, with zero
  network calls. The seed data (`src/lib/demo/seed.ts`) matches the real type
  shapes: athlete profile, a 2-week training plan (real session grammar, run
  through `plan-grammar`), activities, daily health metrics, a free-tier usage
  summary, and a connected Garmin status. Dates are relative to today.
- **Chat is scripted** (`src/lib/demo/script.ts`): instead of hitting
  `/chat/stream`, the app replays a hand-authored coaching conversation, emitting
  the same `token` / `tool_call` / `tool_result` / `status` / `done` events at a
  realistic cadence, so the "show work" UI animates as if live. Each user message
  advances to the next scripted turn (which includes a sub-agent plan generation).
  No LLM, no backend, no API key are ever touched.
- **Mutating CTAs are friendly no-ops:** paywall purchase/restore, account
  delete, data export, data reset, consent withdraw, and Garmin disconnect show a
  "Demo mode" notice instead of calling the backend.

Run the demo locally:

```bash
cd web
NEXT_PUBLIC_DEMO_MODE=true npm run dev
# or a production build:
NEXT_PUBLIC_DEMO_MODE=true npm run build && NEXT_PUBLIC_DEMO_MODE=true npm run start
```

## PWA

The app is installable and works offline (app shell):

- `src/app/manifest.ts` is the App Router manifest route
  (`/manifest.webmanifest`): name/short_name "Athletly", `display: standalone`,
  brand `theme_color`/`background_color` from `@athletly/shared` tokens, icons.
- Icons live in `public/` (`icon-192.png`, `icon-512.png`,
  `apple-touch-icon.png`), generated by `scripts/gen-icons.mjs` (a dependency-free
  brand-gradient "A" PNG generator). Regenerate with `node scripts/gen-icons.mjs`.
- `src/app/layout.tsx` adds the apple-touch-icon, `apple-mobile-web-app-capable`,
  and `theme-color` metadata.
- `public/sw.js` is a minimal service worker (network-first navigations with a
  cached app-shell fallback, cache-first static assets). It is registered by
  `src/components/ServiceWorkerRegistration.tsx`, which only runs in the browser
  in production.

## Deploying the demo to Vercel

1. New Vercel project from this repo.
2. **Root Directory:** `web/`.
3. **Framework Preset:** Next.js (autodetected).
4. **Environment Variables:** set `NEXT_PUBLIC_DEMO_MODE=true`. No Supabase or API
   vars are needed for the demo.
5. Deploy. Because demo mode needs no backend, the public showcase runs with zero
   running services and zero API cost.
