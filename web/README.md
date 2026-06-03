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
