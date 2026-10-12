# terango — customer app

Expo / React Native customer-facing app (food, mart, pharmacy, Express
delivery, experiences/bookings). Own git repo — commit from inside this
directory, not from the workspace root (see `../CLAUDE.md`).

## Stack

- Expo SDK 54, React Native 0.81, React 19, `expo-router` (file-based
  routing under `app/`)
- Firebase (push), `axios` for API calls, `expo-secure-store` for tokens
- Backend: `../server` (Express/Prisma) — see that repo's `CLAUDE.md` for
  pricing, order flow, and API behavior. This app does not own business
  logic like pricing; it renders what the server returns.

## Commands

```bash
npm start              # expo start --dev-client
npm run android         # expo run:android
npm run ios             # expo run:ios
npm run build            # expo export --platform web
npm run lint
```

There is no test script — verification is manual (dev client / device) plus
`npm run lint` and TypeScript via the editor.

## Environment

Copy `.env.example` to `.env`. Keys:
- `EXPO_PUBLIC_API_URL` — backend base URL. `EXPO_PUBLIC_*` vars are inlined
  into the JS bundle at build time — never put a secret in one.
- `EXPO_PUBLIC_GOOGLE_MAPS_KEY` — Places/Geocoding/Maps SDK for the Express
  delivery flow's place search and map pickers. Without it, search hides and
  the flow falls back to map-pin + saved places (this is a real fallback,
  not a crash — don't assume the key is required for the app to function).

## OTA updates (EAS) — critical

`app.json`'s `expo.version` / `expo.runtimeVersion` is currently **1.1.3**.
Installed production builds are **not all on the same runtime** — Android
and iOS have shipped from different native builds historically, so an OTA
published to only one runtime can silently reach zero users on the other
platform.

**Always use the `publish-customer-ota` skill (`.claude/skills/` at the
workspace root) to publish an OTA rather than running `eas update` directly.**
It walks the multi-runtime toggle-and-restore procedure and the exit-code
verification `eas update` output needs (never trust a piped
`| grep`/`| tail` on that command).

Before publishing, check the actual runtime versions of the latest
production builds (EAS dashboard or `eas build:list`) rather than assuming
they match `app.json` — they can lag behind after a native build.

## Repo layout notes

- `app/` — expo-router routes (file-based); `(tabs)/` is the main tab
  navigator, `auth/`, `booking/`, `experiences/`, `browse/`, `kerspace/`,
  `custom-delivery/`, `menuitem/`, `furniture/` are route groups per
  vertical.
- `services/` — API clients; `context/` — app-wide React context (auth,
  cart, etc.); `hooks/`, `components/`, `lib/`, `utils/`, `constants/`.
- `dist/` is a build output folder, not source — don't hand-edit it.
- Root also has several one-off `.bat`/`.ps1`/`.js` utility scripts
  (`clear-cache.bat`, `fix-secure-storage.ps1`, `debug-service-fee.js`,
  etc.) from past debugging sessions — check what a script actually does
  before running it; they aren't part of the build pipeline.

## Related

`../server/CLAUDE.md` (API/pricing source of truth),
`../CLAUDE.md` (workspace orientation).
