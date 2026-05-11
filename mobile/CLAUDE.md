# CLAUDE.md — mobile app

Expo-managed React Native app for IndiaForums. Real backend, TypeScript, feature-sliced.

---

## Commands

```bash
npm run start     # expo start (Metro)
npm run android   # expo run:android
npm run ios       # expo run:ios
npm run lint      # eslint . --ext .ts,.tsx
npm run tsc       # tsc --noEmit (type-check only)
npm run test      # jest (configured, no tests committed yet)
```

Always run `npm run tsc` before declaring a task done — there is no CI yet.

---

## Stack

| Concern | Choice |
|---|---|
| Runtime | Expo 55, React Native 0.83, React 19 |
| Language | TypeScript (strict) |
| Styling | NativeWind 4 (Tailwind) + theme tokens in `src/theme/` |
| Client state | Zustand (`src/store/`) |
| Server state | React Query (`@tanstack/react-query`) |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Network | Axios via single client in `src/services/api.ts` |
| Storage | MMKV (`react-native-mmkv`) + `expo-secure-store` for tokens |
| Lists | FlashList (`@shopify/flash-list`) — prefer over FlatList |
| Animation | Reanimated 4 + Worklets |

---

## Architecture

**One-sentence model:** Zustand holds global client state, React Query holds server state, React Navigation decides which screen shows, axios talks to the backend, and screens are dumb — they just call hooks and render.

### Layout

```
mobile/
├── App.tsx                 # all global providers wired here
├── src/
│   ├── navigation/         # navigators + types.ts (every screen's params)
│   ├── services/           # axios client + per-domain API wrappers + storage
│   ├── store/              # Zustand slices (auth, theme, notifications, …)
│   ├── theme/              # color tokens (light/dark)
│   ├── components/         # shared UI (layout/, ui/)
│   └── features/<domain>/  # mini-app per domain
│        ├── screens/
│        ├── components/
│        ├── hooks/         # React Query hooks for this feature's data
│        ├── utils/
│        └── data/          # static seed / fixtures
```

When adding a feature: create a folder under `src/features/`, put screens + components + hooks there. Only promote to `src/components/` when used by 2+ features.

### Backend

- Base URL: `https://api2.indiaforums.com/api/v1`
- Auth: bearer token; the axios client in `src/services/api.ts` adds the header, refreshes expired tokens, and handles 401s with single-flight refresh.
- Never bypass the shared client — new endpoints go through it (or a per-domain wrapper that wraps it).

### Theming

Colors live in `src/theme/`. For theme-aware styles, memoize per render:

```ts
const styles = useMemo(() => makeStyles(colors), [colors]);
```

---

## Gotchas

- **`src/services/api.ts` is a god file.** It holds the axios client, error extractor, category maps, and transformers for several domains. When adding endpoints, prefer a new per-domain file (`authApi.ts` and `userProfileApi.ts` are the precedent).
- **MMKV via `require()` in some stores** — works, but ties platform gating into the store layer. Don't copy that pattern into new stores; gate inside the storage module.
- **No error boundaries yet.** Throws crash the whole screen.
- **Jest is configured but there are no test files.** Adding tests is welcome, not blocked.
- **Do not commit `.bak` files** — use git for rollback.
- **Static data in `features/*/data/`** (e.g. `galleries.ts`, `webStories.ts`) is intentional for now; flag if you replace it with API calls so callers can be migrated together.
- **Push notifications** — registration runs from `<PushBootstrap/>` mounted in `App.tsx`. Token is acquired via `services/pushNotifications.ts` (Expo push tokens). Tap routing is a pure mapping in `services/notificationRouter.ts`. Logout calls `DELETE /devices/{id}`.

---

## Further reading

- [LEARN_THIS_APP.md](LEARN_THIS_APP.md) — long-form walkthrough of the architecture with file/line references.
- [../docs/tracking/mobile-development-progress.md](../docs/tracking/mobile-development-progress.md) — what's built, what's pending.
- [../docs/tracking/screen-checklist.json](../docs/tracking/screen-checklist.json) — per-screen status.
