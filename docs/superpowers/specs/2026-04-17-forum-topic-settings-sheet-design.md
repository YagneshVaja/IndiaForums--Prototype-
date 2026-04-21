# Forum Topic Settings Sheet — Design Spec

**Date:** 2026-04-17  
**Status:** Approved

---

## Overview

A ⚙ gear icon button added to the `forumIdentity` row in `ForumThreadView.jsx` (to the right of the Follow button). Tapping it opens a bottom sheet listing up to 9 moderation/admin actions. Visibility of each action is driven by `forumDetail` permission flags already returned from `GET /api/v{version}/forums/{forumId}/topics`. All API functions needed already exist in `forumsApi.js`.

---

## Architecture

### New Files
| File | Purpose |
|------|---------|
| `src/components/forum/ForumTopicSettingsSheet.jsx` | Bottom sheet component |
| `src/components/forum/ForumTopicSettingsSheet.module.css` | Scoped styles |

### Modified Files
| File | Change |
|------|--------|
| `src/screens/forum/ForumThreadView.jsx` | Add gear button; wire `settingsOpen` state; pass required props into sheet |
| `src/screens/forum/ForumThreadView.module.css` | Gear button styles |

---

## Gear Button Visibility

The gear icon is rendered only when the current user has at least one moderation right:

```js
const hasModerationRights = forumDetail &&
  (forumDetail.priorityPosts > 0 || forumDetail.editPosts > 0 || forumDetail.deletePosts > 0);
```

Placed to the right of the **Follow** button in the `forumIdentity` row.

---

## Permission Model

Each action's visibility is derived from `forumDetail` (a `ForumDetailDto`):

| Action | Visible when |
|--------|-------------|
| Edit Topic | `editPosts > 0` |
| Migrate FF | `priorityPosts > 0` |
| Move Topic | `priorityPosts > 0` |
| Merge Topic | `priorityPosts > 0` |
| Lock / Unlock Topic | `priorityPosts > 0` |
| Trash Topic | `deletePosts > 0` |
| Topic History | `priorityPosts > 0 \|\| editPosts > 0` |
| Hide Signature | always |
| Team | always |

---

## Action → API Mapping

All functions are imported from `forumsApi.js` (already implemented).

| Action | API call | Interaction pattern |
|--------|----------|---------------------|
| Edit Topic | `updateTopicAdminSettings(topicId, {subject, locked, priority, flairId})` | Sub-view with subject input + lock toggle |
| Migrate FF | `moveTopic({topicId, toForumId})` | Sub-view: input target forum ID |
| Move Topic | `moveTopic({topicId, toForumId})` | Sub-view: input target forum ID |
| Merge Topic | `mergeTopic({topicId, newTopicId})` | Sub-view: input target topic ID |
| Lock Topic | `closeTopic({topicId, forumId})` if unlocked, `openTopic({topicId, forumId})` if locked | Confirm → direct call (label reflects current lock state) |
| Trash Topic | `trashTopics([topicId], [forumId])` | Confirm step before call |
| Topic History | `getTopicActionHistory({topicId})` | Sub-view: scrollable log list |
| Hide Signature | No API (UI toggle only, persisted in local component state) | Toggle, reflects immediately |
| Team | Parsed from `forumDetail.teamJson` | Sub-view: team member list |

---

## Topic Selection Model

Since the gear lives in the forum header (not on individual topic cards), any action sub-view that needs a `topicId` shows a compact inline topic picker at the top — a scrollable list of `{topicId, subject}` drawn from the already-loaded `topics` prop. The user taps to select, then fills in any additional field (e.g. target forum ID) and confirms.

No new state variable is added to `ForumThreadView` for tracking a "focused" topic — the sheet manages selection internally via its own `useState`.

---

## Sheet Layout

```
┌────────────────────────────┐
│  ▬▬▬  (drag handle)        │
│  Topic Settings            │ ← title
├────────────────────────────┤
│  ✏  Edit Topic             │
│  ↗  Migrate FF             │
│  📁  Move Topic            │
│  ⤵  Merge Topic           │
│  🔒  Lock Topic            │ ← "Unlock Topic" if locked
│  🗑  Trash Topic           │ ← destructive (red)
│  🕐  Topic History         │
│  👁  Hide Signature        │ ← shows a toggle
│  👥  Team                  │
└────────────────────────────┘
```

- Destructive actions (**Trash Topic**) rendered in red (`var(--color-error)` or `#dc2626`)
- Actions hidden based on permission flags are not rendered (no disabled state — simply omitted)
- Backdrop overlay closes the sheet on tap

---

## Sub-view Pattern

Actions that need additional input swap out the main list for a sub-view within the same sheet:

```
┌────────────────────────────┐
│  ←  Move Topic             │ ← back arrow + action title
├────────────────────────────┤
│  [topic selector OR        │
│   pre-filled topic title]  │
│                            │
│  Target Forum ID: [_____]  │
│                            │
│  [Confirm]                 │
└────────────────────────────┘
```

Confirmation / success / error is shown inline within the sheet (no separate toast system required — a text row below the confirm button).

---

## Error Handling

- All API calls use `extractApiError` from `api.js` for consistent error messages
- On 403 Forbidden: show "You don't have permission for this action"
- On network error: show the extracted message inline in the sheet
- On success: close sub-view, show a brief green success row, then auto-close sheet after 1.5 s

---

## Files Unchanged

- `useForumTopics.js` — `forumDetail` is already returned; no hook changes needed
- `forumsApi.js` — all API functions already exist; no additions required
- `api.js` — no changes

---

## Styling Rules

- Sheet uses `var(--color-background)` surface, `var(--text1)` primary text, `var(--text3)` secondary
- Gear button: `var(--color-primary)` tint, 32×32 px tap target, placed inline in `forumIdentity` row
- CSS Modules only; no hardcoded hex values
- Drag handle: 36×4 px centered pill, `var(--border-color)` fill
