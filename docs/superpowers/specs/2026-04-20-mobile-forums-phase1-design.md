# Mobile Forums — Phase 1 (Browsing + Thread View)

**Date:** 2026-04-20
**Scope:** Read-only forum browsing for the RN mobile app, matching the web prototype. Post-detail, reply composer, follow, moderation, and new-topic flows are out of scope for this phase (UI affordances visible but non-functional per user direction).

---

## Screens

### 1. `ForumsMainScreen` (replaces ForumsMain placeholder)

**Top structure:** Back button + two pill tabs: **Forums** / **All Topics** (the prototype's `TOP_TABS`).

**Forums tab (`ForumListView`):**
- Search input ("Search forums…") — client-side filter by name/description
- Horizontal scroll of API category tabs (All + fetched categories)
- If category selected → horizontal sub-category chips
- Count row (`"1658 Forums"`)
- Vertical list of forum cards: avatar (thumbnail or emoji on gradient bg), name + hot badge, description, 3-stat trio (Rank / Topics / Flwrs)
- Infinite scroll via `useInfiniteQuery`

**All Topics tab (`AllTopicsView`):**
- Sort dropdown (Latest / Popular)
- View toggle (Detailed / Compact)
- Count pill (`"12.3k topics"`)
- Vertical list of topic cards (detailed: desc + image; compact: title + stats)

### 2. `ForumThreadScreen` (new — tapped from forum card)

- TopNavBack with forum name
- Forum banner image (if present)
- Forum identity row: avatar + name + description + **Follow** button + **settings gear** (non-functional per user direction — both visible)
- Stat bar: Topics / Posts / Followers / Rank
- Search input ("Search topics…") — client-side filter
- Flair filter dropdown + topic count + **New** button (non-functional)
- Topic list using `ThreadCard` component
- Infinite scroll

---

## Architecture

```
mobile/src/features/forums/
  screens/
    ForumsMainScreen.tsx      — tab switcher, hosts both views
    ForumThreadScreen.tsx     — drill-down thread view
  components/
    ForumCard.tsx             — list item for Forums tab
    ThreadCard.tsx            — list item for a topic
    TopicCard.tsx             — All Topics feed item (detailed + compact)
    ForumListView.tsx         — search + cats + list (composed in ForumsMain)
    AllTopicsView.tsx         — sort + view toggle + feed
    CategoryChips.tsx         — horizontal category row
    SubCategoryChips.tsx      — secondary chips
    SearchBar.tsx             — reusable search input
    FlairDropdown.tsx         — flair filter
    SortDropdown.tsx          — All Topics sort
    ViewToggle.tsx            — Detailed / Compact toggle
  hooks/
    useForumHome.ts           — categories + forums (React Query, infinite)
    useForumTopics.ts         — topics for one forum
    useAllForumTopics.ts      — cross-forum topic feed
```

---

## API additions (to `mobile/src/services/api.ts`)

- **Types:** `ForumCategory`, `Forum`, `ForumTopic`, `ForumFlair`, `ForumsHomePage`, `ForumTopicsPage`, `AllTopicsPage`
- **Transforms:** `transformForumCategory`, `transformForum`, `transformTopic` — ports of prototype logic
- **Functions:**
  - `fetchForumHome(categoryId, page, pageSize)` → `ForumsHomePage`
  - `fetchForumCategories()` → `{ categories, subCatMap }`
  - `fetchAllForumTopics(page, pageSize)` → `AllTopicsPage`
  - `fetchForumTopics(forumId, page, pageSize)` → `ForumTopicsPage`

Endpoints (same as prototype): `/forums/home`, `/forums/topics`, `/forums/{forumId}/topics`.

---

## Navigation

`ForumsStackParamList` update:
```ts
export type ForumsStackParamList = {
  ForumsMain: undefined;
  ForumThread: { forum: Forum };
  TopicDetail: { topicId: string };  // placeholder for phase 2
};
```

Drop the unused `ForumList` / `TopicList` routes from the placeholder stack.

---

## Design tokens used

Matches existing mobile patterns (from `videos` / `celebrities`):
- Primary: `#3558F0`
- Bg: `#F5F6F7`
- Card bg: `#FFFFFF`
- Text: `#1A1A1A`, muted `#7A7A7A`, `#A0A0A0`
- Border: `#E2E2E2`, `#EEEFF1`

---

## Out of scope (Phase 2+)

- TopicDetail posts list, reactions, reply composer
- New topic composer
- Follow API wiring
- Moderation settings sheet
- Live search API (client-side filter only for this phase)
