# ProfileScreen Header Overhaul — Design Spec

**Date:** 2026-04-13  
**Status:** Approved

---

## Goal

Redesign the ProfileScreen header to match the IndiaForums visual identity — cover banner, avatar overlap, rank title, location/join date, signature, prominent stats bar, and a Message action button. Tab content is untouched.

---

## 1. Visual Layout

```
┌──────────────────────────────────────┐
│  ░░░░░ Cover gradient banner ░░░░░░  │  130px tall, brand gradient
│           [ Avatar 88px ]            │  overlaps cover by 44px
├──────────────────────────────────────┤
│          Vijay Bhatkar               │  displayName — 20px bold
│           @vijay123                  │  userName — 13px muted
│        ★ Senior Member              │  rank pill — only if rank exists
│    📍 Mumbai  ·  Member since 2011   │  location + join year row
│    "Your journey shapes you..."      │  signature/bio — italic, 2 lines
├──────────────────────────────────────┤
│  5.2k    │    48    │    12           │
│  Posts   │ Buddies  │  Badges        │  tappable → jumps to tab
├──────────────────────────────────────┤
│  [+ Add Buddy]     [✉ Message]       │  other-user only
└──────────────────────────────────────┘
        [Tabs scrollable row]
```

---

## 2. Component Changes

### Cover Banner
- `div.coverBanner` — height 130px, `background: linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)`
- Optionally: if `profile.coverUrl` exists, show as `<img>` with `object-fit: cover`
- Position `relative` so avatar can overlap it

### Avatar
- Wrapped in `div.avatarWrap` — `position: absolute` bottom `-44px`, centered horizontally
- Avatar circle 88px with 3px white/card ring: `box-shadow: 0 0 0 3px var(--card)`
- Brand glow shadow underneath
- Falls back to initial letter if no `profile.avatar`

### Identity Block
- `div.identity` — centered, `padding-top: 52px` (accounts for avatar overlap)
- **Display name** — 20px, font-display, bold
- **@username** — 13px, text2
- **Rank pill** — `★ Senior Member` with small star SVG, brand-light background, only renders if `profile.rank`
- **Location + Join row** — `📍 {location} · Member since {year}` — only if either exists; uses `profile.location` and `profile.joinDate`
- **Signature/Bio** — `profile.signature || profile.bio`, 13px italic text2, clamped to 2 lines with "more" expand (simple `useState` toggle)

### Stats Bar
- 3-column flex row with `border-top` + `border-bottom`
- Each stat: `<button>` that calls `onStatPress(tabKey)` — clicking Posts jumps to `posts` tab, Buddies → `buddies`, Badges → `badges`
- Numbers formatted with `formatNum` (k/M suffix for large counts)

### Profile Actions (other-user only)
- **Add Buddy** — existing, already wired to `buddiesApi.sendFriendRequest`
- **Message** — new button, calls `onMessageUser({ userId, username })` prop
  - In `App.jsx` this navigates to `ComposeScreen` with the recipient pre-filled

---

## 3. Navigation Wiring (Message button)

### `useAppNavigation.js`
Add `composeToUser: null` state + `SELECT_COMPOSE_USER` / `CLEAR_COMPOSE_USER` reducer cases + action callbacks.

### `App.jsx`
- Add `composeToUser` render branch above `selectedProfileUser`
- Renders `<ComposeScreen recipient={nav.composeToUser} onBack={nav.clearComposeUser} />`
- Pass `onMessageUser={nav.selectComposeUser}` down to `ProfileScreen`

### `ProfileScreen.jsx`
- Accept `onMessageUser` prop
- Pass it to `ProfileActions` component
- `ProfileActions` renders `✉ Message` button calling `onMessageUser({ userId: targetUserId, username })`

---

## 4. Data Fields Used

| Field | Source | Use |
|---|---|---|
| `profile.avatar` | existing | avatar image |
| `profile.coverUrl` | new (may be null) | cover banner bg image |
| `profile.displayName` | existing | display name |
| `profile.userName` | existing | @username |
| `profile.rank` | new (may be null) | rank pill |
| `profile.location` | new (may be null) | location row |
| `profile.joinDate` | existing | member since year |
| `profile.signature` | new (may be null) | signature text |
| `profile.bio` | existing | fallback for signature |
| `profile.postCount` | existing | Posts stat |
| `profile.buddyCount` | existing | Buddies stat |
| `profile.badgeCount` | existing | Badges stat |

Fields marked "new" are optional — if the API doesn't return them, those UI elements simply don't render (no crash).

---

## 5. Files Changed

| File | Change |
|---|---|
| `src/hooks/useAppNavigation.js` | Add `composeToUser` state + 2 reducer cases + 2 actions |
| `src/App.jsx` | Add `composeToUser` render branch; pass `onMessageUser` to `ProfileScreen` |
| `src/screens/profile/ProfileScreen.jsx` | Replace header section with cover/avatar/identity/stats/actions; accept `onMessageUser` prop |
| `src/screens/profile/ProfileScreen.module.css` | Replace/add header styles (cover, avatarWrap, identity, rankPill, locationRow, sigBio, statsBar, action buttons) |

---

## 6. Out of Scope

- Tab content redesign (Posts, Buddies, Badges lists) — separate task
- ComposeScreen changes — it already accepts a `recipient` prop pattern
- Profile editing (own profile)
- Any changes to how ProfileScreen is launched (nav already wired in previous session)
