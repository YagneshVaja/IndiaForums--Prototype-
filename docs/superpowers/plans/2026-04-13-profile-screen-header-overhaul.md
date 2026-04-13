# ProfileScreen Header Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the ProfileScreen header to match IndiaForums — cover banner, avatar overlap, rank pill, location/join row, signature, tappable stats bar, and a Message action button.

**Architecture:** Four sequential tasks — nav state first, App.jsx wiring second, JSX + CSS header overhaul third and fourth (committed together). No new files created. Tab content (Posts, Buddies, etc.) is completely untouched.

**Tech Stack:** React 19, CSS Modules, Vite. No TypeScript, no routing library, no test runner.

---

## File Map

| File | Change |
|---|---|
| `src/hooks/useAppNavigation.js` | Add `composeToUser` state + `SELECT_COMPOSE_USER` / `CLEAR_COMPOSE_USER` cases + 2 action callbacks |
| `src/App.jsx` | Import `ComposeScreen`; add `composeToUser` render branch above `selectedProfileUser`; pass `onMessageUser` to `ProfileScreen` |
| `src/screens/profile/ProfileScreen.jsx` | Replace header JSX with cover/avatar/identity/stats/actions; add `formatNum` helper; update `ProfileActions` to accept `onMessageUser` + `targetUsername`; accept `onMessageUser` prop |
| `src/screens/profile/ProfileScreen.module.css` | Replace old header styles with new cover, avatarWrap, identity, rankPill, locationRow, sigBio, statsBar, statBtn, statDivider classes; keep all tab + list styles untouched |

---

## Task 1: Add `composeToUser` nav state

**Files:**
- Modify: `src/hooks/useAppNavigation.js`

- [ ] **Step 1: Add `composeToUser` to `initialState`**

Open `src/hooks/useAppNavigation.js`. In the `initialState` object, after the `selectedProfileUser: null` line (which was added in the previous session), add:

```js
  composeToUser:       null,   // { userId, username } — pre-filled compose screen
```

- [ ] **Step 2: Add reducer cases**

In `navReducer`, immediately after the `CLEAR_PROFILE_USER` case, add:

```js
    case 'SELECT_COMPOSE_USER':
      return { ...state, composeToUser: action.payload };
    case 'CLEAR_COMPOSE_USER':
      return { ...state, composeToUser: null };
```

- [ ] **Step 3: Add action callbacks**

In the `actions` object, after `clearProfileUser`, add:

```js
    selectComposeUser: useCallback((u) => dispatch({ type: 'SELECT_COMPOSE_USER', payload: u }), []),
    clearComposeUser:  useCallback(()    => dispatch({ type: 'CLEAR_COMPOSE_USER' }), []),
```

- [ ] **Step 4: Verify dev server starts**

```bash
cd indiaforums && npm run dev
```

Expected: no errors, app loads normally.

- [ ] **Step 5: Commit**

```bash
git add indiaforums/src/hooks/useAppNavigation.js
git commit -m "feat: add composeToUser nav state for pre-filled message compose"
```

---

## Task 2: Wire `composeToUser` in App.jsx + pass `onMessageUser` to ProfileScreen

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `ComposeScreen` import**

At the top of `App.jsx`, with the other screen imports, add:

```js
import ComposeScreen from './screens/messages/ComposeScreen';
```

- [ ] **Step 2: Add `composeToUser` render branch**

In `App.jsx`, find the existing `selectedProfileUser` branch:

```js
  } else if (nav.selectedProfileUser) {
    topNavTitle = nav.selectedProfileUser.username || 'Profile';
    topNavBack  = nav.clearProfileUser;
    content = (
      <ProfileScreen userId={nav.selectedProfileUser.userId} />
    );
```

Insert this block **immediately before** it:

```js
  } else if (nav.composeToUser) {
    topNavTitle = 'New Message';
    topNavBack  = nav.clearComposeUser;
    content = (
      <ComposeScreen
        prefillTo={nav.composeToUser.username}
        onBack={nav.clearComposeUser}
      />
    );

  } else if (nav.selectedProfileUser) {
```

- [ ] **Step 3: Pass `onMessageUser` to `ProfileScreen`**

In the `selectedProfileUser` branch, update the `ProfileScreen` render:

```js
  } else if (nav.selectedProfileUser) {
    topNavTitle = nav.selectedProfileUser.username || 'Profile';
    topNavBack  = nav.clearProfileUser;
    content = (
      <ProfileScreen
        userId={nav.selectedProfileUser.userId}
        onMessageUser={nav.selectComposeUser}
      />
    );
```

- [ ] **Step 4: Verify**

In the browser, navigate Forums → open topic → tap "Visit Profile" on a post. The ProfileScreen should load. No Message button yet (that's Task 3), but no errors.

- [ ] **Step 5: Commit**

```bash
git add indiaforums/src/App.jsx
git commit -m "feat: wire composeToUser render branch and onMessageUser prop to ProfileScreen"
```

---

## Task 3: Overhaul ProfileScreen.jsx header

**Files:**
- Modify: `src/screens/profile/ProfileScreen.jsx`

This task replaces the header section of `ProfileScreen`. Everything below the header (tabs, tab content components) is **untouched**.

- [ ] **Step 1: Add `formatNum` helper at the top of the file**

After the imports (after line 10, before the `BASE_TABS` constant), add:

```js
function formatNum(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}
```

- [ ] **Step 2: Accept `onMessageUser` prop in the default export**

Find the function signature (line 34):
```js
export default function ProfileScreen({ userId }) {
```

Change to:
```js
export default function ProfileScreen({ userId, onMessageUser }) {
```

- [ ] **Step 3: Replace the header JSX**

Find the entire profile header block inside the `return` (currently lines 52–77):

```jsx
      {/* ── Profile header ──────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile.avatar
            ? <img className={styles.avatarImg} src={profile.avatar} alt={profile.displayName || profile.userName} decoding="async" />
            : <span className={styles.avatarLetter}>{(profile.displayName || profile.userName || 'U')[0].toUpperCase()}</span>
          }
        </div>
        <div className={styles.info}>
          <div className={styles.displayName}>{profile.displayName || profile.userName}</div>
          <div className={styles.userName}>@{profile.userName}</div>
          {profile.joinDate && (
            <div className={styles.joined}>Joined {timeAgo(profile.joinDate)}</div>
          )}
        </div>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        <div className={styles.stats}>
          <Stat label="Posts" value={profile.postCount} />
          <Stat label="Buddies" value={profile.buddyCount} />
          <Stat label="Badges" value={profile.badgeCount} />
        </div>
        {!isOwnProfile && effectiveUserId && (
          <ProfileActions targetUserId={effectiveUserId} />
        )}
      </div>
```

Replace it with:

```jsx
      {/* ── Cover banner + Avatar ───────────────────────────────────────── */}
      <div className={styles.headerOuter}>
        <div className={styles.coverBanner}>
          {profile.coverUrl && (
            <img src={profile.coverUrl} alt="" className={styles.coverImg} decoding="async" />
          )}
        </div>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {profile.avatar
              ? <img className={styles.avatarImg} src={profile.avatar} alt={profile.displayName || profile.userName} decoding="async" />
              : <span className={styles.avatarLetter}>{(profile.displayName || profile.userName || 'U')[0].toUpperCase()}</span>
            }
          </div>
        </div>
      </div>

      {/* ── Identity ────────────────────────────────────────────────────── */}
      <div className={styles.identity}>
        <div className={styles.displayName}>{profile.displayName || profile.userName}</div>
        <div className={styles.userName}>@{profile.userName}</div>
        {profile.rank && (
          <div className={styles.rankPill}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {profile.rank}
          </div>
        )}
        {(profile.location || profile.joinDate) && (
          <div className={styles.locationRow}>
            {profile.location && (
              <span className={styles.locationItem}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                {profile.location}
              </span>
            )}
            {profile.location && profile.joinDate && <span className={styles.locationDot}>·</span>}
            {profile.joinDate && (
              <span className={styles.locationItem}>
                Member since {new Date(profile.joinDate).getFullYear()}
              </span>
            )}
          </div>
        )}
        {(profile.signature || profile.bio) && (
          <p className={styles.sigBio}>{profile.signature || profile.bio}</p>
        )}
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <button className={styles.statBtn} onClick={() => setActiveTab('posts')}>
          <span className={styles.statVal}>{formatNum(profile.postCount)}</span>
          <span className={styles.statLbl}>Posts</span>
        </button>
        <div className={styles.statDivider} />
        <button className={styles.statBtn} onClick={() => setActiveTab('buddies')}>
          <span className={styles.statVal}>{formatNum(profile.buddyCount)}</span>
          <span className={styles.statLbl}>Buddies</span>
        </button>
        <div className={styles.statDivider} />
        <button className={styles.statBtn} onClick={() => setActiveTab('badges')}>
          <span className={styles.statVal}>{formatNum(profile.badgeCount)}</span>
          <span className={styles.statLbl}>Badges</span>
        </button>
      </div>

      {/* ── Profile actions (other-user only) ────────────────────────────── */}
      {!isOwnProfile && effectiveUserId && (
        <ProfileActions
          targetUserId={effectiveUserId}
          targetUsername={profile.userName}
          onMessageUser={onMessageUser}
        />
      )}
```

- [ ] **Step 4: Update the `ProfileActions` component**

Find the existing `ProfileActions` function (around line 125). It currently accepts only `{ targetUserId }`. Update its signature and add the Message button:

```jsx
function ProfileActions({ targetUserId, targetUsername, onMessageUser }) {
  const [busy, setBusy]       = useState(false);
  const [status, setStatus]   = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [blocked, setBlocked] = useState(false);

  async function handleAddBuddy() {
    if (busy || requestSent) return;
    setBusy(true);
    setStatus(null);
    try {
      await buddiesApi.sendFriendRequest(targetUserId);
      setRequestSent(true);
      setStatus({ kind: 'ok', text: 'Friend request sent' });
    } catch (err) {
      setStatus({ kind: 'err', text: extractApiError(err, 'Failed to send friend request') });
    } finally {
      setBusy(false);
    }
  }

  async function handleBlock() {
    if (busy) return;
    const next = !blocked;
    if (next && !confirm('Block this user? They will not be able to message or interact with you.')) return;
    setBusy(true);
    setStatus(null);
    try {
      await buddiesApi.blockUser({ blockedUserId: targetUserId, block: next });
      setBlocked(next);
      setStatus({ kind: 'ok', text: next ? 'User blocked' : 'User unblocked' });
    } catch (err) {
      setStatus({ kind: 'err', text: extractApiError(err, next ? 'Failed to block user' : 'Failed to unblock user') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={handleAddBuddy}
          disabled={busy || requestSent}
        >
          {requestSent ? 'Request Sent' : '+ Add Buddy'}
        </button>
        {onMessageUser && (
          <button
            className={styles.secondaryBtn}
            onClick={() => onMessageUser({ userId: targetUserId, username: targetUsername })}
            disabled={busy}
          >
            ✉ Message
          </button>
        )}
        <button
          className={`${styles.secondaryBtn} ${styles.blockBtn}`}
          onClick={handleBlock}
          disabled={busy}
          title={blocked ? 'Unblock user' : 'Block user'}
        >
          {blocked ? 'Unblock' : 'Block'}
        </button>
      </div>
      {status && (
        <div className={`${styles.actionStatus} ${status.kind === 'err' ? styles.actionStatusErr : ''}`}>
          {status.text}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 5: Remove the old `Stat` component**

Find and delete the old `Stat` function (around line 112–119):
```js
function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value ?? 0}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
```

It's no longer used — `statBtn` buttons are inline in the JSX now.

- [ ] **Step 6: Do NOT commit yet** — Task 3 and Task 4 commit together.

---

## Task 4: Replace ProfileScreen.module.css header styles

**Files:**
- Modify: `src/screens/profile/ProfileScreen.module.css`

- [ ] **Step 1: Replace the entire header section in the CSS**

Open `ProfileScreen.module.css`. Find and **replace** everything from `/* ── Profile header ───── */` down to the end of `.stat` / `.statLabel` / `.statValue` blocks (lines 9–177 approximately). Keep everything from `/* ── Profile actions ── */` onwards untouched — specifically keep `.actions`, `.primaryBtn`, `.secondaryBtn`, `.actionStatus`, `.actionStatusErr` unchanged.

The new header section to put in place of the old one:

```css
/* ── Header outer — cover + avatar overlap ────────────────────────────────── */
.headerOuter {
  position: relative;
  background: var(--card);
  padding-bottom: 44px; /* half the avatar height — creates overlap space */
}

.coverBanner {
  height: 130px;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%);
  overflow: hidden;
  position: relative;
}

.coverImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatarWrap {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 0 0 3px var(--card), var(--shadow-brand);
}

.avatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarLetter {
  color: var(--text-on-brand);
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
}

/* ── Identity block ─────────────────────────────────────────────────────────── */
.identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-3) var(--content-px) var(--sp-4);
  background: var(--card);
  text-align: center;
  border-bottom: 1px solid var(--border);
}

.displayName {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--dark);
  letter-spacing: -0.3px;
  margin-top: var(--sp-1);
}

.userName {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text3);
  margin-top: 2px;
}

.rankPill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: var(--sp-2);
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--brand);
  background: var(--brand-light);
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-full);
  padding: 4px 12px;
}

.locationRow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--sp-2);
  font-family: var(--font-body);
  font-size: 11.5px;
  color: var(--text3);
}

.locationItem {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.locationDot {
  color: var(--border-strong);
}

.sigBio {
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--text2);
  font-style: italic;
  line-height: 1.55;
  margin: var(--sp-2) 0 0;
  max-width: 300px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Stats bar ─────────────────────────────────────────────────────────────── */
.statsBar {
  display: flex;
  background: var(--card);
  border-bottom: 1px solid var(--border);
}

.statBtn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--sp-3) 0;
  border: none;
  background: none;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.statBtn:hover {
  background: var(--surface);
}

.statDivider {
  width: 1px;
  background: var(--border);
  margin: var(--sp-2) 0;
}

.statVal {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 800;
  color: var(--dark);
  line-height: 1;
}

.statLbl {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
```

- [ ] **Step 2: Add `.blockBtn` modifier after `.secondaryBtn`**

After the existing `.secondaryBtn:disabled` block, add:

```css
/* Small modifier — makes Block button less visually prominent than Message */
.blockBtn {
  flex: 0 0 auto;
  font-size: 12px;
  padding: 8px 12px;
  color: var(--text3);
  border-color: var(--border);
}
```

- [ ] **Step 3: Update `.actions` padding**

Find the existing `.actions` block and ensure it has padding so it reads as its own section:

```css
.actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--content-px);
  background: var(--card);
  border-bottom: 1px solid var(--border);
  width: 100%;
}
```

Replace the existing `.actions` block with the above (remove `max-width: 320px` — the profile is full-width now).

- [ ] **Step 4: Commit Tasks 3 + 4 together**

```bash
git add indiaforums/src/screens/profile/ProfileScreen.jsx indiaforums/src/screens/profile/ProfileScreen.module.css
git commit -m "feat: overhaul ProfileScreen header with cover banner, rank pill, stats bar and Message button"
```

---

## Task 5: Smoke test

No test runner — manual verification only.

- [ ] **Step 1: Happy path — other-user profile**

1. Run `npm run dev` in `indiaforums/`
2. Forums → open any forum → open a topic → tap "Visit Profile" on any post
3. Confirm: gradient cover banner at top, avatar overlapping cover with white ring, display name + `@username` centered below, stats bar (Posts | Buddies | Badges) with tappable numbers
4. Tap Posts stat → Posts tab activates
5. Tap "✉ Message" button → navigates to ComposeScreen with the recipient's username pre-filled in the "To" field
6. Tap back → returns to ProfileScreen
7. Tap back again → returns to the topic thread

- [ ] **Step 2: Own profile (MySpace tab)**

Navigate to MySpace → Profile. The header should look identical but without the "Add Buddy" / "Message" / "Block" action row (own-profile hides actions).

- [ ] **Step 3: Dark mode**

Toggle dark mode via DevToolbar. The cover gradient, rank pill, stats bar, and identity block should all adapt — no hardcoded colors.

- [ ] **Step 4: Missing data graceful handling**

The rank pill, location row, and sigBio should not render if the API doesn't return those fields. Confirm no crashes when `profile.rank`, `profile.location`, or `profile.signature` are null/undefined.

---

## Commit Sequence

```
feat: add composeToUser nav state for pre-filled message compose          (Task 1)
feat: wire composeToUser render branch and onMessageUser prop             (Task 2)
feat: overhaul ProfileScreen header with cover banner, rank pill, stats   (Tasks 3+4)
```
