# Forum Post Author Panel + Visit Profile — Design Spec

**Date:** 2026-04-13  
**Status:** Approved

---

## Goal

Enrich the forum thread (TopicDetailScreen) with a richer per-post author header matching
the IndiaForums data model, and wire "Visit Profile" to navigate to the existing ProfileScreen.

---

## 1. Post Card Author Header (mobile-native vertical layout)

Each post card in `TopicDetailScreen` replaces the current minimal author row with a richer
header block — same vertical stacking, more information:

```
┌────────────────────────────────────────┐
│ [Avatar] Username      [OP] 🇮🇳   #12  │
│          Senior Member · 2,341 posts   │
│          [🏆 badge] [🥇 badge]         │
│          [Visit Profile →]             │
├────────────────────────────────────────┤
│ Post content here…                     │
├────────────────────────────────────────┤
│ 👍 Like  💬 Reply  " Quote            │
└────────────────────────────────────────┘
```

### Data fields used (already in API response):
| Field | Source | Display |
|---|---|---|
| `post.author` | existing | username |
| `post.authorId` | existing | used for Visit Profile nav |
| `post.avatarUrl` | existing | avatar image |
| `post.avatarAccent` | existing | avatar fallback color |
| `post.isOp` | existing | "OP" badge |
| `post.countryCode` | existing | flag emoji |
| `post.rank` | existing | rank title (RankBadge component) |
| `post.postCount` | existing (may be null) | "X posts" meta |
| `post.badges` | existing | badge images |
| `post.realName` | existing | display under username |

### Visit Profile button
- Appears under the badges row for every post where `post.authorId` is truthy
- Tap calls `onVisitProfile({ userId: post.authorId, username: post.author })`
- Styled as a small ghost/text button — not a primary action

---

## 2. Visit Profile Navigation

### Nav state addition (`useAppNavigation.js`)
```
selectedProfileUser: null  // { userId, username }
```

New actions:
- `selectProfileUser({ userId, username })` → `SELECT_PROFILE_USER`
- `clearProfileUser()` → `CLEAR_PROFILE_USER`

### Priority in App.jsx render tree
```
selectedWebStory
  → (story screens)
    → selectedProfileUser   ← NEW (above selectedTopic so back returns to thread)
      → selectedTopic
        → selectedTag
          → ...
```

### App.jsx rendering
```jsx
} else if (nav.selectedProfileUser) {
  topNavTitle = nav.selectedProfileUser.username || 'Profile';
  topNavBack  = nav.clearProfileUser;
  content = (
    <ProfileScreen userId={nav.selectedProfileUser.userId} />
  );
```

### TopicDetailScreen wiring
- Receives new prop: `onVisitProfile`
- Passed from `App.jsx` line where `TopicDetailScreen` is rendered
- "Visit Profile" button in each post calls `onVisitProfile?.({ userId: post.authorId, username: post.author })`

---

## 3. Files Changed

| File | Change |
|---|---|
| `src/hooks/useAppNavigation.js` | Add `selectedProfileUser` state + 2 reducer cases + 2 actions |
| `src/App.jsx` | Add `selectedProfileUser` render branch; pass `onVisitProfile` to `TopicDetailScreen` |
| `src/screens/TopicDetailScreen.jsx` | Accept `onVisitProfile` prop; enhance post author header UI |
| `src/screens/TopicDetailScreen.module.css` | Add styles for richer author header + visit-profile button |

---

## 4. Out of Scope

- "Visit Profile" from the OP author chip at the top of the topic card (topic API may not return `posterId` consistently — defer)
- Profile navigation from forum list / thread list views (separate task)
- Any changes to ProfileScreen itself
