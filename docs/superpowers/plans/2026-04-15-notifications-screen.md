# Notifications Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the TopNav bell icon to a live-data NotificationsScreen that shows paginated notifications with template-based filter chips and mark-as-read support.

**Architecture:** Add `showNotifications` nav state to `useAppNavigation`, create a `NotificationsScreen` that fetches from `notificationsApi`, and update `TopNav` to accept a live unread badge count + tap handler. `App.jsx` polls `useUnreadCount` every 60s, passes count + handler to TopNav, and renders `NotificationsScreen` when `nav.showNotifications` is true.

**Tech Stack:** React 19, CSS Modules, existing `notificationsApi.js` service, existing `useUnreadCount` hook.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/hooks/useAppNavigation.js` | Add `showNotifications` state + open/close actions |
| Create | `src/screens/NotificationsScreen.jsx` | Full notifications screen with chips + list |
| Create | `src/screens/NotificationsScreen.module.css` | Scoped styles |
| Modify | `src/components/layout/TopNav.jsx` | Add `notifCount` prop + `onNotificationsPress` prop |
| Modify | `src/App.jsx` | Poll unread count, pass to TopNav, render NotificationsScreen branch |

---

## Task 1: Add `showNotifications` to navigation state

**Files:**
- Modify: `src/hooks/useAppNavigation.js`

- [ ] **Step 1: Add `showNotifications` to `initialState`**

In `useAppNavigation.js`, find the `initialState` object and add the new field after `composeReply`:

```js
const initialState = {
  activeTab:       'explore',
  selectedArticle: null,
  selectedVideo:   null,
  showGalleries:   false,
  selectedGallery: null,
  activeStory:     null,
  selectedTopic:   null,
  selectedProfileUser: null,
  composeToUser:       null,
  selectedCeleb:   null,
  drilledForum:    null,
  selectedTag:     null,
  drawerOpen:      false,
  selectedFanfic:           null,
  selectedFanficChapter:    null,
  showFanficAuthors:        false,
  selectedFanficAuthor:     null,
  selectedWebStory:         null,
  composeReply:             null,
  showNotifications:        false,   // ← add this
};
```

- [ ] **Step 2: Add reducer cases for OPEN/CLOSE_NOTIFICATIONS**

In the `navReducer` `switch` block, add two cases before the `'RESET'` case:

```js
    case 'OPEN_NOTIFICATIONS':
      return { ...state, showNotifications: true };
    case 'CLOSE_NOTIFICATIONS':
      return { ...state, showNotifications: false };
```

- [ ] **Step 3: Add action callbacks to the returned `actions` object**

In the `actions` object inside `useAppNavigation`, add after `clearComposeReply`:

```js
    openNotifications:  useCallback(() => dispatch({ type: 'OPEN_NOTIFICATIONS' }), []),
    closeNotifications: useCallback(() => dispatch({ type: 'CLOSE_NOTIFICATIONS' }), []),
```

- [ ] **Step 4: Verify the file looks correct, then commit**

```bash
cd indiaforums
git add src/hooks/useAppNavigation.js
git commit -m "feat: add showNotifications nav state"
```

---

## Task 2: Create `NotificationsScreen`

**Files:**
- Create: `src/screens/NotificationsScreen.jsx`
- Create: `src/screens/NotificationsScreen.module.css`

- [ ] **Step 1: Create `NotificationsScreen.module.css`**

```css
/* src/screens/NotificationsScreen.module.css */
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

/* ── Filter chips row ─────────────────────────────────── */
.filtersRow {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--content-px);
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.filtersRow::-webkit-scrollbar { display: none; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: 5px var(--sp-3);
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border);
  background: var(--card);
  color: var(--text2);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}
.chip:hover {
  border-color: var(--brand-border);
  color: var(--brand);
}
.chipActive {
  background: var(--brand);
  border-color: var(--brand);
  color: var(--text-on-brand);
}
.chipActive:hover {
  background: var(--brand-hover);
  border-color: var(--brand-hover);
  color: var(--text-on-brand);
}
.chipBadge {
  background: rgba(255,255,255,0.3);
  border-radius: var(--radius-full);
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  text-align: center;
}
.chip:not(.chipActive) .chipBadge {
  background: var(--brand-light);
  color: var(--brand);
}

/* ── Mark all read bar ────────────────────────────────── */
.markAllBar {
  display: flex;
  justify-content: flex-end;
  padding: var(--sp-2) var(--content-px);
  background: var(--card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.markAllBtn {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  color: var(--brand);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.markAllBtn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Scrollable list ──────────────────────────────────── */
.list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Notification item ────────────────────────────────── */
.item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--content-px);
  background: var(--card);
  border-bottom: 1px solid var(--border);
  position: relative;
  transition: background var(--duration-fast) var(--ease-out);
}
.item:active { background: var(--surface); }

.itemUnread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--brand);
  border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
}

/* Avatar */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.avatarInitials {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-on-brand);
  flex-shrink: 0;
}

/* Text content */
.itemBody {
  flex: 1;
  min-width: 0;
}
.itemTitle {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
  line-height: 1.35;
}
.itemMessage {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--text2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.itemTime {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--text3);
  margin-top: var(--sp-1);
}

/* Unread dot */
.unreadDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
  flex-shrink: 0;
  margin-top: 4px;
}

/* ── States ───────────────────────────────────────────── */
.center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-10) var(--content-px);
  color: var(--text3);
  font-family: var(--font-body);
  font-size: 14px;
}

.loadMoreBtn {
  display: block;
  width: 100%;
  padding: var(--sp-4);
  background: var(--card);
  border: none;
  border-top: 1px solid var(--border);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  color: var(--brand);
  cursor: pointer;
  text-align: center;
}
.loadMoreBtn:disabled {
  color: var(--text3);
  cursor: default;
}
```

- [ ] **Step 2: Create `NotificationsScreen.jsx`**

```jsx
// src/screens/NotificationsScreen.jsx
import { useState, useEffect, useCallback } from 'react';
import * as notificationsApi from '../services/notificationsApi';
import styles from './NotificationsScreen.module.css';

/* ── Avatar colour palette (cycles by first char of username) ── */
const AVATAR_COLORS = [
  '#3558F0','#E03A5C','#16A34A','#D97706',
  '#7C3AED','#0891B2','#DB2777','#EA580C',
];
function avatarColor(name) {
  const code = (name || 'U').charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

/* ── Relative time ───────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)    return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

/* ── Single notification row ─────────────────────────────────── */
function NotificationItem({ notification: n }) {
  const isUnread = n.read === 0 || n.read === '0';
  const user = n.user;
  const displayName = n.displayUserName || user?.userName || '';

  return (
    <div className={`${styles.item} ${isUnread ? styles.itemUnread : ''}`}>
      {/* Avatar */}
      {user?.thumbnailUrl ? (
        <img
          src={user.thumbnailUrl}
          alt={displayName}
          className={styles.avatar}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div
          className={styles.avatarInitials}
          style={{ background: avatarColor(displayName) }}
        >
          {initials(displayName)}
        </div>
      )}

      {/* Body */}
      <div className={styles.itemBody}>
        {n.title && <div className={styles.itemTitle}>{n.title}</div>}
        {n.message && <div className={styles.itemMessage}>{n.message}</div>}
        <div className={styles.itemTime}>{timeAgo(n.publishedWhen)}</div>
      </div>

      {/* Unread indicator */}
      {isUnread && <div className={styles.unreadDot} />}
    </div>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function NotificationsScreen() {
  const [notifications, setNotifications]   = useState([]);
  const [templates, setTemplates]           = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null); // null = All
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [markingAll, setMarkingAll]         = useState(false);

  /* ── Fetch ─────────────────────────────────────────────────── */
  const fetchPage = useCallback(async (templateId, pageNum) => {
    if (pageNum === 1) setLoading(true);
    else               setLoadingMore(true);

    try {
      const params = { pn: pageNum, ps: 20 };
      if (templateId != null) params.t = templateId;
      const res  = await notificationsApi.getNotifications(params);
      const data = res.data || {};
      const incoming = data.notifications || [];

      if (pageNum === 1) {
        setTemplates(data.notificationTemplates || []);
        setNotifications(incoming);
      } else {
        setNotifications(prev => [...prev, ...incoming]);
      }
      setTotalPages(data.totalPages || 1);
    } catch {
      // silently fail — don't crash the screen
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Re-fetch when template filter changes
  useEffect(() => {
    setPage(1);
    fetchPage(activeTemplate, 1);
  }, [activeTemplate, fetchPage]);

  // Auto mark-as-read when notifications load
  useEffect(() => {
    const unreadIds = notifications
      .filter(n => n.read === 0 || n.read === '0')
      .map(n => n.notificationId)
      .join(',');
    if (!unreadIds) return;
    notificationsApi.markAsRead({ ids: unreadIds }).catch(() => {});
  }, [notifications]);

  /* ── Actions ───────────────────────────────────────────────── */
  function handleTemplateChange(templateId) {
    setActiveTemplate(templateId);
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications
      .filter(n => n.read === 0 || n.read === '0')
      .map(n => n.notificationId)
      .join(',');
    if (!unreadIds) return;

    setMarkingAll(true);
    try {
      await notificationsApi.markAsRead({ ids: unreadIds });
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  function handleLoadMore() {
    if (page >= totalPages || loadingMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(activeTemplate, next);
  }

  /* ── Derived ───────────────────────────────────────────────── */
  const hasUnread = notifications.some(n => n.read === 0 || n.read === '0');

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className={styles.screen}>

      {/* Filter chips */}
      <div className={styles.filtersRow}>
        <button
          className={`${styles.chip} ${activeTemplate === null ? styles.chipActive : ''}`}
          onClick={() => handleTemplateChange(null)}
        >
          All
        </button>
        {templates.map(t => (
          <button
            key={t.templateId}
            className={`${styles.chip} ${activeTemplate === t.templateId ? styles.chipActive : ''}`}
            onClick={() => handleTemplateChange(t.templateId)}
          >
            {t.templateDesc}
            {t.notificationCount > 0 && (
              <span className={styles.chipBadge}>{t.notificationCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Mark all read bar */}
      {hasUnread && (
        <div className={styles.markAllBar}>
          <button
            className={styles.markAllBtn}
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        </div>
      )}

      {/* List */}
      <div className={styles.list}>
        {loading ? (
          <div className={styles.center}>Loading…</div>
        ) : notifications.length === 0 ? (
          <div className={styles.center}>No notifications yet</div>
        ) : (
          <>
            {notifications.map(n => (
              <NotificationItem key={n.notificationId} notification={n} />
            ))}
            {page < totalPages && (
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd indiaforums
git add src/screens/NotificationsScreen.jsx src/screens/NotificationsScreen.module.css
git commit -m "feat: add NotificationsScreen with filter chips and mark-as-read"
```

---

## Task 3: Update TopNav to show live badge count and handle bell tap

**Files:**
- Modify: `src/components/layout/TopNav.jsx`

- [ ] **Step 1: Replace the static bell button with a live-count badge version**

Replace the entire `TopNav.jsx` content with:

```jsx
import styles from './TopNav.module.css';

export default function TopNav({ title, onBack, onMenuOpen, notifCount = 0, onNotificationsPress }) {

  // ── Back-navigation mode ───────────────────────────────────────────────────
  if (onBack) {
    return (
      <div className={styles.topnav}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Go back">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M7.5 1.5L1.5 7.5l6 6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {title
          ? <div className={styles.screenTitle}>{title}</div>
          : <div className={styles.flex1} />
        }

        <div className={styles.backSpacer} />
      </div>
    );
  }

  // ── Default brand nav ──────────────────────────────────────────────────────
  return (
    <div className={styles.topnav}>

      {/* Hamburger */}
      <button className={styles.iconBtn} onClick={onMenuOpen} aria-label="Open menu">
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <rect y="0"   width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="6"   width="12" height="2" rx="1" fill="currentColor"/>
          <rect y="12"  width="7"  height="2" rx="1" fill="var(--brand)"/>
        </svg>
      </button>

      {/* Logo */}
      <div className={styles.logo}>
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
          <polygon points="13,0 23,6 13,13" fill="#16A34A"/>
          <polygon points="13,0 13,13 3,6"  fill="#22C55E"/>
          <polygon points="23,6 23,20 13,13" fill="#CA8A04"/>
          <polygon points="3,6  3,20 13,13"  fill="#7C3AED"/>
          <polygon points="23,20 13,26 13,13" fill="#EA580C"/>
          <polygon points="13,26  3,20 13,13" fill="#DB2777"/>
        </svg>
        <span className={styles.wordmark}>indiaforums</span>
      </div>

      {/* Right actions */}
      <div className={styles.right}>
        <button
          className={styles.iconBtn}
          aria-label="Notifications"
          style={{ position: 'relative' }}
          onClick={onNotificationsPress}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 015.5 5.5c0 1.8.5 3.2 1.1 3.8H2.4c.6-.6 1.1-2 1.1-3.8A5.5 5.5 0 019 2z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M7 15a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {notifCount > 0 ? (
            <span className={styles.notifBadge}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          ) : (
            <span className={styles.notifDot} />
          )}
        </button>

        <button className={styles.iconBtn} aria-label="Profile">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2.5 16a6.5 6.5 0 0113 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Add `.notifBadge` to `TopNav.module.css`**

Open `src/components/layout/TopNav.module.css` and add after the existing `.notifDot` rule:

```css
.notifBadge {
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: var(--red);
  border: 1.5px solid var(--card);
  color: #fff;
  font-family: var(--font-body);
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
```

- [ ] **Step 3: Commit**

```bash
cd indiaforums
git add src/components/layout/TopNav.jsx src/components/layout/TopNav.module.css
git commit -m "feat: wire TopNav bell with live badge count and tap handler"
```

---

## Task 4: Wire everything in `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports for `useUnreadCount` and `NotificationsScreen`**

At the top of `App.jsx`, add these two imports after the existing import block:

```js
import { useUnreadCount }    from './hooks/useNotifications';
import NotificationsScreen   from './screens/NotificationsScreen';
```

- [ ] **Step 2: Call `useUnreadCount` inside the `App` component**

Inside the `App()` function body, directly after the `const nav = useAppNavigation();` line, add:

```js
const { count: notifCount, refresh: refreshNotifCount } = useUnreadCount(60_000);
```

- [ ] **Step 3: Add `NotificationsScreen` branch to the navigation chain**

In the long `if / else if` chain that determines `content`, add a new branch **before** the `} else if (nav.composeToUser)` block:

```js
  } else if (nav.showNotifications) {
    topNavTitle = 'Notifications';
    topNavBack  = () => { nav.closeNotifications(); refreshNotifCount(); };
    content     = <NotificationsScreen />;

  }
```

- [ ] **Step 4: Pass `notifCount` and `onNotificationsPress` to `<TopNav>`**

Find the `<TopNav ... />` JSX in the render return and update it:

```jsx
      <TopNav
        title={topNavTitle}
        onBack={topNavBack}
        onMenuOpen={nav.openDrawer}
        notifCount={notifCount}
        onNotificationsPress={nav.openNotifications}
      />
```

- [ ] **Step 5: Commit**

```bash
cd indiaforums
git add src/App.jsx
git commit -m "feat: wire notifications screen into app — live badge, tap-to-open, refresh on close"
```

---

## Self-Review

**Spec coverage:**
- ✅ Full screen with TopNav + back button
- ✅ Filter chips (All + template chips with counts)
- ✅ Notification list with avatar, message, title, timestamp, unread indicator
- ✅ Unread count badge on bell (live, polls every 60s)
- ✅ Auto mark-as-read when screen loads (fires POST /user-notifications/read)
- ✅ "Mark all as read" button (shown only when unread items exist)
- ✅ Infinite scroll / Load more (uses totalPages + pn param)
- ✅ Refresh unread count on close

**Placeholder scan:** No TBDs or TODOs.

**Type consistency:** `notificationsApi.markAsRead({ ids: string })` matches `notificationsApi.js` line 5. `getNotifications(params)` matches line 3. `useUnreadCount` export matches `useNotifications.js` line 5.
