# Forum Post Author Panel + Visit Profile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich each forum post card with a richer author header (rank, post count, badges, "Visit Profile" button) and wire "Visit Profile" to navigate to the existing ProfileScreen.

**Architecture:** Add `selectedProfileUser` to the nav reducer so profile visits are full-screen takeovers that sit above `selectedTopic` in the render tree — backing out returns to the thread. No new components or screens are created; ProfileScreen already accepts a `userId` prop.

**Tech Stack:** React 19, CSS Modules, Vite — no TypeScript, no routing library.

---

## File Map

| File | Change |
|---|---|
| `src/hooks/useAppNavigation.js` | Add `selectedProfileUser` state, `SELECT_PROFILE_USER` / `CLEAR_PROFILE_USER` reducer cases, `selectProfileUser` / `clearProfileUser` actions |
| `src/App.jsx` | Add `selectedProfileUser` render branch (above `selectedTopic`); pass `onVisitProfile` prop to `TopicDetailScreen` |
| `src/screens/TopicDetailScreen.jsx` | Accept `onVisitProfile` prop; add post count to meta row; add "Visit Profile" button after badges in post header |
| `src/screens/TopicDetailScreen.module.css` | Add `.postMemberMeta`, `.visitProfileBtn` styles |

---

## Task 1: Add `selectedProfileUser` nav state

**Files:**
- Modify: `src/hooks/useAppNavigation.js`

- [ ] **Step 1: Add `selectedProfileUser` to `initialState`**

In `src/hooks/useAppNavigation.js`, find the `initialState` object (line 3) and add one line:

```js
const initialState = {
  activeTab:       'explore',
  selectedArticle: null,
  selectedVideo:   null,
  showGalleries:   false,
  selectedGallery: null,
  activeStory:     null,
  selectedTopic:   null,
  selectedProfileUser: null,   // ← ADD THIS LINE
  selectedCeleb:   null,
  drilledForum:    null,
  selectedTag:     null,
  drawerOpen:      false,
  selectedFanfic:           null,
  selectedFanficChapter:    null,
  showFanficAuthors:        false,
  selectedFanficAuthor:     null,
  selectedWebStory:         null,
};
```

- [ ] **Step 2: Add reducer cases for `SELECT_PROFILE_USER` and `CLEAR_PROFILE_USER`**

In `navReducer`, after the `CLEAR_TOPIC` case (around line 64), add:

```js
    case 'SELECT_PROFILE_USER':
      return { ...state, selectedProfileUser: action.payload };
    case 'CLEAR_PROFILE_USER':
      return { ...state, selectedProfileUser: null };
```

- [ ] **Step 3: Add `selectProfileUser` and `clearProfileUser` to the actions object**

In the `actions` object inside `useAppNavigation` (after `clearTopic` around line 145), add:

```js
    selectProfileUser: useCallback((u) => dispatch({ type: 'SELECT_PROFILE_USER', payload: u }), []),
    clearProfileUser:  useCallback(()    => dispatch({ type: 'CLEAR_PROFILE_USER' }), []),
```

- [ ] **Step 4: Verify the dev server still starts**

```bash
cd indiaforums && npm run dev
```

Expected: No errors. Open the app in the browser — all existing screens work normally.

---

## Task 2: Wire `selectedProfileUser` into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the `selectedProfileUser` render branch**

In `App.jsx`, find the block starting at line 216:
```js
  } else if (nav.selectedTopic) {
```

Insert this block **immediately before** it (so profile visits sit above topics in priority):

```js
  } else if (nav.selectedProfileUser) {
    topNavTitle = nav.selectedProfileUser.username || 'Profile';
    topNavBack  = nav.clearProfileUser;
    content = (
      <ProfileScreen userId={nav.selectedProfileUser.userId} />
    );

  } else if (nav.selectedTopic) {
```

`ProfileScreen` is already imported at the top of `App.jsx` via `MySpaceScreen` → but it isn't directly imported in `App.jsx`. Add the import at the top with the other screen imports:

```js
import ProfileScreen from './screens/profile/ProfileScreen';
```

- [ ] **Step 2: Pass `onVisitProfile` to `TopicDetailScreen`**

Find the existing line (around line 218):
```js
    content     = <TopicDetailScreen topic={nav.selectedTopic} />;
```

Replace it with:
```js
    content     = (
      <TopicDetailScreen
        topic={nav.selectedTopic}
        onVisitProfile={nav.selectProfileUser}
      />
    );
```

- [ ] **Step 3: Smoke-test in the browser**

Run the dev server (`npm run dev`). Navigate to any forum → open a topic → the topic detail renders without errors. The back button still works.

---

## Task 3: Enrich post author header in `TopicDetailScreen.jsx`

**Files:**
- Modify: `src/screens/TopicDetailScreen.jsx`

This task makes three additions to the post card header area:
1. Show `post.postCount` next to the rank (e.g. "Senior Member · 2,341 posts")
2. Show the "Visit Profile" button after the badges row
3. Accept the `onVisitProfile` prop

- [ ] **Step 1: Accept `onVisitProfile` prop in the default export**

Find the function signature (line 190):
```js
export default function TopicDetailScreen({ topic }) {
```

Change to:
```js
export default function TopicDetailScreen({ topic, onVisitProfile }) {
```

- [ ] **Step 2: Add post count to the meta row**

Find the existing `postMetaRow` div inside the post card's `postAuthorInfo` (around line 522). It currently shows rank badge, dot, and time. Add post count after the rank badge:

**Current code (lines 522–540 approximately):**
```jsx
                    <div className={styles.postMetaRow}>
                      {post.rank && <RankBadge rank={post.rank} />}
                      {post.rank && <span className={styles.metaDot}>·</span>}
                      <span
                        className={styles.postTime}
                        title={post.rawTime ? new Date(post.rawTime).toLocaleString() : undefined}
                      >{post.time}</span>
                      {post.isEdited && (
                        <button
                          type="button"
                          className={styles.editedChip}
                          onClick={() => setHistoryForPostId(post.id)}
                          title="View edit history"
                        >
                          edited
                        </button>
                      )}
                    </div>
```

**Replace with:**
```jsx
                    <div className={styles.postMetaRow}>
                      {post.rank && <RankBadge rank={post.rank} />}
                      {post.postCount != null && (
                        <span className={styles.postMemberMeta}>
                          {post.rank ? ' · ' : ''}{formatNum(post.postCount)} posts
                        </span>
                      )}
                      {(post.rank || post.postCount != null) && <span className={styles.metaDot}>·</span>}
                      <span
                        className={styles.postTime}
                        title={post.rawTime ? new Date(post.rawTime).toLocaleString() : undefined}
                      >{post.time}</span>
                      {post.isEdited && (
                        <button
                          type="button"
                          className={styles.editedChip}
                          onClick={() => setHistoryForPostId(post.id)}
                          title="View edit history"
                        >
                          edited
                        </button>
                      )}
                    </div>
```

- [ ] **Step 3: Add "Visit Profile" button after the badges row**

Find the block that renders `post.badges` (around line 541):
```jsx
                    {/* Achievement badges inline under meta */}
                    {post.badges?.length > 0 && (
                      <div className={styles.userBadges}>
                        {post.badges.map(b => (
                          <img key={b.id} src={b.imageUrl} alt={b.name} title={b.name} className={styles.userBadgeImg} loading="lazy" decoding="async" />
                        ))}
                      </div>
                    )}
```

Immediately after the closing `)}` of that block (still inside `postAuthorInfo`), add:

```jsx
                    {post.authorId && onVisitProfile && (
                      <button
                        type="button"
                        className={styles.visitProfileBtn}
                        onClick={() => onVisitProfile({ userId: post.authorId, username: post.author })}
                      >
                        Visit Profile
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
```

- [ ] **Step 4: Verify in browser**

Open a topic with several posts. Each post should now show:
- Rank badge (unchanged)
- Post count next to rank (e.g. "Senior Member · 2,341 posts") — only if the API returns `post.postCount`
- Achievement badges (unchanged)
- "Visit Profile →" button below badges (only for posts where `authorId` is present)

If `post.postCount` is not in the API response yet, the line simply won't appear — that's correct (no crash).

---

## Task 4: Add CSS for the new elements

**Files:**
- Modify: `src/screens/TopicDetailScreen.module.css`

- [ ] **Step 1: Add `.postMemberMeta` and `.visitProfileBtn` styles**

Open `TopicDetailScreen.module.css`. Find the `.postMetaRow` block (around line 522 in the CSS). After the last rule in the "Post header" section, add:

```css
/* Member meta — post count shown next to rank */
.postMemberMeta {
  font-family: var(--font-body);
  font-size: 10.5px;
  color: var(--text3);
  white-space: nowrap;
}

/* Visit Profile link-button */
.visitProfileBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  font-family: var(--font-body);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--brand);
  background: var(--brand-light);
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-full);
  padding: 3px 10px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
  line-height: 1;
}
.visitProfileBtn:hover {
  background: var(--brand);
  color: var(--text-on-brand);
}
.visitProfileBtn svg {
  flex-shrink: 0;
}
```

- [ ] **Step 2: Verify dark mode**

In the browser, toggle dark mode via DevToolbar. The "Visit Profile" pill should use the dark-mode token values (`--brand-light` and `--brand-border` are already overridden in `[data-theme="dark"]` in `tokens.css`) — no hardcoded colors, so it adapts automatically.

---

## Task 5: End-to-end smoke test

**No test runner is configured — manual verification only.**

- [ ] **Step 1: Test the happy path**

1. Open the app → tap Forums tab → open any forum → tap any topic
2. Scroll through posts — confirm the author header is enriched (rank · post count if available, badges, "Visit Profile" button)
3. Tap "Visit Profile" on any post — the screen should transition to that user's ProfileScreen with their username in the TopNav title
4. Tap the back arrow (←) in TopNav — you should return to the topic thread at the same scroll position (the topic is still in `nav.selectedTopic`)

- [ ] **Step 2: Test with OP post**

The first post (`post.isOp === true`) has the brand-ring avatar. Confirm "Visit Profile" also appears on it.

- [ ] **Step 3: Test back-chain**

Forum list → Forum thread → Topic detail → Visit Profile → back → still on Topic detail → back → still on Forum thread → back → Forum list. Each back press should work correctly.

- [ ] **Step 4: Test dark mode**

Toggle dark mode — topic screen, post cards, and "Visit Profile" pill should all adapt correctly.

---

## Commit Sequence

After each task passes its verification step, commit:

```bash
# After Task 1
git add indiaforums/src/hooks/useAppNavigation.js
git commit -m "feat: add selectedProfileUser nav state for visit-profile flow"

# After Task 2
git add indiaforums/src/App.jsx
git commit -m "feat: wire selectedProfileUser render branch and onVisitProfile prop"

# After Tasks 3 + 4 (do together — JSX and CSS change together)
git add indiaforums/src/screens/TopicDetailScreen.jsx indiaforums/src/screens/TopicDetailScreen.module.css
git commit -m "feat: enrich post author header with post count and Visit Profile button"
```
