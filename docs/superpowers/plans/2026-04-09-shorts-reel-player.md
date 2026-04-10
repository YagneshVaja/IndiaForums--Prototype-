# Shorts Reel Player — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded-grid `ShortsScreen` with a vertical snap-scroll Reel player wired to `GET /api/v1/shorts`.

**Architecture:** New `shortsApi.js` service + `useShorts.js` hook handle all data fetching and transforms. `ShortsScreen.jsx` is a pure UI consumer — no API calls inline. An `IntersectionObserver` drives active-card detection, auto-advance progress bar, and load-more triggering.

**Tech Stack:** React 19, CSS Modules, axios (via shared `api` instance), `IntersectionObserver` (no polyfill needed — prototype targets modern Chrome/Safari).

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/services/shortsApi.js` | Single `getShorts()` function — all endpoint knowledge lives here |
| Create | `src/hooks/useShorts.js` | Fetch, transform, paginate, client-side category filter |
| Rewrite | `src/screens/ShortsScreen.jsx` | Reel UI — CategoryTabBar, ShortCard, SkeletonCard, observer wiring |
| Rewrite | `src/screens/ShortsScreen.module.css` | Snap-scroll layout, dark reel aesthetic, shimmer, progress bar |

`src/data/shorts.js` is kept on disk but is no longer the primary data source. `useShorts.js` imports only its `SHORTS_CATEGORIES` constant as a fallback when the API returns no categories.

---

## Task 1: API Service — `shortsApi.js`

**Files:**
- Create: `src/services/shortsApi.js`

- [ ] **Step 1.1 — Create the service file**

```js
// src/services/shortsApi.js
import api from './api';

export async function getShorts({ page = 1, pageSize = 20 } = {}) {
  return api.get('/shorts', { params: { pageNumber: page, pageSize } });
}
```

That's the entire file. The shared `api` axios instance already handles base URL (`/api/v1`), auth token, and token-refresh interceptor — no duplication needed.

- [ ] **Step 1.2 — Verify import resolves**

Open the browser dev server. In the browser console, paste:
```js
import('/src/services/shortsApi.js').then(m => console.log(Object.keys(m)));
```
Expected: `["getShorts"]`. If you see a module error, check the relative import path inside the file (`./api` not `../api`).

- [ ] **Step 1.3 — Commit**

```bash
git add indiaforums/src/services/shortsApi.js
git commit -m "feat: add shortsApi service for GET /api/v1/shorts"
```

---

## Task 2: Custom Hook — `useShorts.js`

**Files:**
- Create: `src/hooks/useShorts.js`

- [ ] **Step 2.1 — Create the hook**

```js
// src/hooks/useShorts.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { getShorts } from '../services/shortsApi';
import { extractApiError } from '../services/api';
import { SHORTS_CATEGORIES } from '../data/shorts';

// ── Visual fallbacks ─────────────────────────────────────────────────────────
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#ec4899)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];

function pickGradient(index) {
  return FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

// publishedWhen may be a Unix timestamp (seconds) or ISO string
function formatDate(publishedWhen) {
  if (!publishedWhen) return '';
  try {
    const ms = typeof publishedWhen === 'number' && publishedWhen < 1e12
      ? publishedWhen * 1000
      : publishedWhen;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function transformShort(raw, index) {
  return {
    id:          raw.shortId,
    title:       raw.title        || 'Untitled',
    description: raw.description  || '',
    pageUrl:     raw.pageUrl      || '',
    thumbnail:   raw.thumbnailUrl || raw.imageUrl || null,
    publishedAt: formatDate(raw.publishedWhen),
    category:    raw.categoryName || '',
    categoryId:  raw.categoryId   || 0,
    bg:          pickGradient(index),
  };
}

// Build tab array from API categories; prepend "All"
function buildCategories(rawCats) {
  if (!rawCats?.length) return SHORTS_CATEGORIES; // fallback to mock categories
  return [
    { id: 'all', label: 'All' },
    ...rawCats.map(c => ({ id: String(c.categoryId), label: c.categoryName })),
  ];
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useShorts(initialParams = {}) {
  const [allShorts,  setAllShorts]  = useState([]);
  const [categories, setCategories] = useState(SHORTS_CATEGORIES);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [params,     setParams]     = useState({ pageSize: 20, categoryId: 0, ...initialParams });
  const loadingRef = useRef(false);

  const load = useCallback(async (pageNum = 1, replace = true) => {
    if (!replace && loadingRef.current) return;
    loadingRef.current = true;
    if (replace) { setLoading(true); setError(null); }
    try {
      const res      = await getShorts({ page: pageNum, pageSize: params.pageSize });
      const envelope = res.data?.data || res.data || {};
      // Handle both { shorts: [] } and { data: [] } response shapes
      const rawList  = envelope.shorts || (Array.isArray(envelope.data) ? envelope.data : []);
      const rawCats  = envelope.categories || [];
      const rawPagination = res.data?.pagination || null;

      const items = rawList.map((s, i) => transformShort(s, i));
      setAllShorts(prev => replace ? items : [...prev, ...items]);
      if (replace) setCategories(buildCategories(rawCats));
      setPagination(rawPagination);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load shorts'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [params.pageSize]);

  useEffect(() => { load(1, true); }, [load]);

  const refresh  = useCallback(() => load(1, true), [load]);
  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loadingRef.current) {
      load((pagination.currentPage || 1) + 1, false);
    }
  }, [pagination, load]);

  // Client-side filter: 0 = show all
  const shorts = params.categoryId
    ? allShorts.filter(s => s.categoryId === params.categoryId)
    : allShorts;

  return { shorts, allShorts, categories, pagination, loading, error, params, setParams, refresh, loadMore };
}
```

- [ ] **Step 2.2 — Manual smoke test (console)**

Navigate to the Shorts screen in the running app. Open the browser console and verify:
- No import errors in the console
- Network tab shows a `GET /api/v1/shorts` request
- If the request returns data, the screen renders shorts (even if CSS is broken yet)
- If the request returns 404/500, the error message appears via `ErrorState`

- [ ] **Step 2.3 — Commit**

```bash
git add indiaforums/src/hooks/useShorts.js
git commit -m "feat: add useShorts hook with pagination, transform, and category filter"
```

---

## Task 3: CSS — `ShortsScreen.module.css`

**Files:**
- Rewrite: `src/screens/ShortsScreen.module.css`

- [ ] **Step 3.1 — Replace the entire CSS file**

```css
/* ────────────────────────────────────────────────────────────────────────────
   SHORTS SCREEN (Reel Player)  ·  8pt grid  ·  tokens.css
   ──────────────────────────────────────────────────────────────────────────── */

/* ── Screen ─────────────────────────────────────────────────────────────────── */
.screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #000;
  overflow: hidden;
}

/* ── Category tab bar ────────────────────────────────────────────────────────── */
.catBar {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 0 14px;
  flex-shrink: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.catScroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 10px 0;
}
.catScroll::-webkit-scrollbar { display: none; }

.catBtn {
  flex-shrink: 0;
  padding: 5px 16px;
  border-radius: 20px;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}
.catActive {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

/* ── Reel feed (snap-scroll container) ───────────────────────────────────────── */
.feed {
  flex: 1;
  min-height: 0;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.feed::-webkit-scrollbar { display: none; }

/* ── Short card ──────────────────────────────────────────────────────────────── */
.card {
  height: 100%;
  scroll-snap-align: start;
  flex-shrink: 0;
  position: relative;
  background: #111;
  overflow: hidden;
}

.thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbFallback {
  width: 100%;
  height: 100%;
  display: block;
}

/* Bottom-weighted gradient scrim */
.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.0)  0%,
    rgba(0, 0, 0, 0.0)  40%,
    rgba(0, 0, 0, 0.55) 65%,
    rgba(0, 0, 0, 0.88) 100%
  );
  pointer-events: none;
}

/* ── Progress bar ────────────────────────────────────────────────────────────── */
.progressTrack {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 4;
}
.progressFill {
  height: 100%;
  background: var(--brand);
  border-radius: 0 2px 2px 0;
  transition: width 0.1s linear;
}

/* ── Category chip (top-left badge) ─────────────────────────────────────────── */
.catChip {
  position: absolute;
  top: 14px;
  left: 14px;
  background: var(--brand);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-body);
  padding: 3px 9px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  z-index: 3;
}

/* ── Bottom overlay ──────────────────────────────────────────────────────────── */
.overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 16px 22px;
  z-index: 3;
}

.title {
  color: #fff;
  font-family: var(--font-head);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.desc {
  color: rgba(255, 255, 255, 0.72);
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.45;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.metaRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.date {
  color: rgba(255, 255, 255, 0.45);
  font-family: var(--font-body);
  font-size: 11px;
  flex-shrink: 0;
}

.readBtn {
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
  flex-shrink: 0;
}
.readBtn:active { opacity: 0.85; }

/* ── Skeleton cards ──────────────────────────────────────────────────────────── */
.skeleton {
  height: 100%;
  scroll-snap-align: start;
  flex-shrink: 0;
  background: #1c1c1c;
  position: relative;
  overflow: hidden;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.04) 50%,
    transparent 100%
  );
  animation: shimmer 1.4s infinite;
  transform: translateX(-100%);
}
@keyframes shimmer {
  to { transform: translateX(100%); }
}

/* ── Error / empty centering ─────────────────────────────────────────────────── */
.center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Load-more sentinel / spinner ───────────────────────────────────────────── */
.sentinel {
  height: 80px;
  scroll-snap-align: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 3.2 — Verify CSS loads without errors**

Navigate to Shorts screen. Browser console should show no CSS module errors. The screen should be black (cards not rendered yet — that's OK at this stage).

- [ ] **Step 3.3 — Commit**

```bash
git add indiaforums/src/screens/ShortsScreen.module.css
git commit -m "feat: reel player CSS for ShortsScreen (snap-scroll, progress bar, dark theme)"
```

---

## Task 4: Reel Player Component — `ShortsScreen.jsx`

**Files:**
- Rewrite: `src/screens/ShortsScreen.jsx`

- [ ] **Step 4.1 — Replace the entire component file**

```jsx
// src/screens/ShortsScreen.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ShortsScreen.module.css';
import useShorts from '../hooks/useShorts';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return <div className={styles.skeleton} />;
}

/* ── Short card ───────────────────────────────────────────────────────────── */
// isActive   : this card is currently in the visible viewport
// onAdvance  : callback fired when the 5s auto-advance timer completes
// cardRef    : callback ref — caller stores DOM node for IntersectionObserver
function ShortCard({ short, isActive, onAdvance, cardRef }) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  // Auto-advance: run a 5s progress timer whenever this card becomes active
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!isActive) {
      setProgress(0);
      return;
    }
    const DURATION = 5000; // ms
    const TICK     = 100;  // ms per tick
    let elapsed    = 0;
    setProgress(0);
    intervalRef.current = setInterval(() => {
      elapsed += TICK;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        onAdvance();
      }
    }, TICK);
    return () => clearInterval(intervalRef.current);
  }, [isActive, onAdvance]);

  function handleRead() {
    if (!short.pageUrl) return;
    const url = short.pageUrl.startsWith('http')
      ? short.pageUrl
      : `https://www.indiaforums.com${short.pageUrl}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className={styles.card} ref={cardRef}>
      {/* Media layer */}
      {short.thumbnail ? (
        <img
          className={styles.thumb}
          src={short.thumbnail}
          alt={short.title}
          loading="lazy"
        />
      ) : (
        <div
          className={styles.thumbFallback}
          style={{ background: short.bg }}
        />
      )}

      {/* Bottom gradient scrim */}
      <div className={styles.scrim} />

      {/* Progress bar — visible on active card */}
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${isActive ? progress : 0}%` }}
        />
      </div>

      {/* Category chip */}
      {short.category && (
        <span className={styles.catChip}>{short.category}</span>
      )}

      {/* Bottom overlay: title, description, CTA */}
      <div className={styles.overlay}>
        <div className={styles.title}>{short.title}</div>
        {short.description && (
          <div className={styles.desc}>{short.description}</div>
        )}
        <div className={styles.metaRow}>
          {short.publishedAt && (
            <span className={styles.date}>{short.publishedAt}</span>
          )}
          <button className={styles.readBtn} onClick={handleRead}>
            Read Full Story →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main screen ──────────────────────────────────────────────────────────── */
export default function ShortsScreen({ onBack }) {
  const {
    shorts, categories, pagination,
    loading, error,
    params, setParams,
    loadMore, refresh,
  } = useShorts();

  const [activeIndex, setActiveIndex] = useState(0);

  // Refs
  const feedRef     = useRef(null);
  const cardRefs    = useRef([]);   // parallel array to `shorts`
  const sentinelRef = useRef(null);

  // Reset active card when category changes
  useEffect(() => {
    setActiveIndex(0);
    cardRefs.current = [];
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [params.categoryId]);

  // Intersection Observer: track active card + load-more sentinel
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          // Is it a short card?
          const idx = cardRefs.current.indexOf(entry.target);
          if (idx !== -1) {
            setActiveIndex(idx);
            return;
          }
          // Is it the load-more sentinel?
          if (entry.target === sentinelRef.current) {
            loadMore();
          }
        });
      },
      { root: feedRef.current, threshold: 0.6 },
    );

    cardRefs.current.forEach((el) => { if (el) observer.observe(el); });
    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [shorts.length, loadMore]);

  // Scroll to the next card when auto-advance fires
  const handleAdvance = useCallback(() => {
    const next = cardRefs.current[activeIndex + 1];
    if (next) next.scrollIntoView({ behavior: 'smooth' });
    // On the last card, nothing happens (progress stays at 100%)
  }, [activeIndex]);

  // Category tab selection
  function handleCatSelect(catId) {
    const numId = catId === 'all' ? 0 : Number(catId);
    setParams(prev => ({ ...prev, categoryId: numId }));
  }

  const activeCatId = params.categoryId || 0;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className={styles.screen}>

      {/* Category tab bar */}
      <div className={styles.catBar}>
        <div className={styles.catScroll}>
          {categories.map((cat) => {
            const isActive =
              cat.id === 'all' ? activeCatId === 0 : Number(cat.id) === activeCatId;
            return (
              <button
                key={cat.id}
                className={`${styles.catBtn} ${isActive ? styles.catActive : ''}`}
                onClick={() => handleCatSelect(cat.id)}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state (initial load failure) */}
      {error && shorts.length === 0 && (
        <div className={styles.center}>
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      {/* Reel feed */}
      {!error && (
        <div className={styles.feed} ref={feedRef}>

          {/* Initial load skeletons */}
          {loading && shorts.length === 0 && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* Empty state */}
          {!loading && shorts.length === 0 && (
            <div className={styles.center}>
              <EmptyState icon="⚡" title="No shorts available" subtitle="Check back soon" />
            </div>
          )}

          {/* Short cards */}
          {shorts.map((short, i) => (
            <ShortCard
              key={short.id}
              short={short}
              isActive={i === activeIndex}
              onAdvance={handleAdvance}
              cardRef={(el) => { cardRefs.current[i] = el; }}
            />
          ))}

          {/* Load-more sentinel — observed by IntersectionObserver */}
          {pagination?.hasNextPage && (
            <div className={styles.sentinel} ref={sentinelRef}>
              <div className={styles.spinner} />
            </div>
          )}

        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4.2 — Manual verification checklist**

Open the Shorts screen and confirm all of the following:

1. **Category tabs** render in the dark tab bar. Active tab has `--brand` background.
2. **API call fires** — Network tab shows `GET /api/v1/shorts?pageNumber=1&pageSize=20`.
3. **Skeletons** appear while loading (3 dark shimmer cards).
4. **Cards render** after data loads — thumbnail image (or gradient fallback) fills full card height.
5. **Progress bar** fills blue over ~5 seconds on the first visible card.
6. **Auto-advance** — after 5s, the player scrolls to card 2 automatically.
7. **Manual scroll** works — snap-scrolling between cards is smooth.
8. **Category filter** — tap a category tab; the feed scrolls to top, shows filtered cards.
9. **Read button** — tapping opens `pageUrl` in a new browser tab.
10. **Error state** — temporarily break the endpoint URL in `shortsApi.js` to `'/shorts-404'`, reload; confirm `ErrorState` with retry button appears.

Fix any failures before committing.

- [ ] **Step 4.3 — Commit**

```bash
git add indiaforums/src/screens/ShortsScreen.jsx
git commit -m "feat: replace ShortsScreen grid with vertical reel player (API-wired)"
```

---

## Task 5: Final Wiring & Cleanup

**Files:**
- Verify: `src/App.jsx` (no change needed — already wires `ShortsScreen`)
- Verify: `src/data/shorts.js` (kept, only SHORTS_CATEGORIES used as fallback)

- [ ] **Step 5.1 — Verify App.jsx needs no changes**

Open `src/App.jsx` and confirm line:
```jsx
content = <ShortsScreen onBack={nav.clearStory} />;
```
is already present under `nav.activeStory === 'shorts'`. No change needed.

- [ ] **Step 5.2 — Full end-to-end walkthrough**

1. From the home screen, tap the **Shorts** icon in the bottom nav or stories strip.
2. Shorts screen opens with the dark reel layout.
3. First card is visible, progress bar fills over 5s.
4. Player auto-advances to next card.
5. Manually swipe / scroll through several cards.
6. Tap "Read Full Story →" — opens IndiaForums article in browser tab.
7. Tap a category tab (e.g. TV) — feed resets, shows filtered shorts.
8. Scroll to the very last loaded card — if `hasNextPage` is true, a spinner appears and more shorts load automatically.

- [ ] **Step 5.3 — Commit**

```bash
git add indiaforums/src/App.jsx
git commit -m "chore: verify Shorts reel player wiring — no App.jsx changes needed"
```

> If App.jsx was unchanged, skip the `git add` and instead just commit a note:
> ```bash
> git commit --allow-empty -m "chore: shorts reel player feature complete — all tasks done"
> ```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| `GET /api/v1/shorts` API call | Task 1 — `shortsApi.js` |
| Use existing `api.js` + axios | Task 1 — imports `api` from `./api` |
| Dynamic base URL + version | Inherited from `api` instance |
| Replace all mock data | Task 2 — `useShorts` fetches from API; fallback is categories-only |
| Vertical snap scroll | Task 3 — `scroll-snap-type: y mandatory` on `.feed` |
| Full screen height cards | Task 3 — `.card { height: 100% }` |
| Thumbnail display | Task 4 — `<img className={styles.thumb}>` + gradient fallback |
| Title / caption | Task 4 — `.title` in `.overlay` |
| Auto-play (progress + advance) | Task 4 — `setInterval` in `ShortCard` effect |
| Pause when not in view | Task 4 — `isActive=false` clears interval, resets progress |
| Smooth scroll between videos | Task 3 — `scroll-snap-type` + Task 4 — `scrollIntoView` |
| `useShorts()` hook | Task 2 |
| API logic separate from UI | Tasks 1+2 vs Task 4 |
| Loading skeleton | Task 4 — `SkeletonCard × 3` |
| Error handling | Task 4 — `<ErrorState>` with retry |
| Lazy load | Task 4 — `loading="lazy"` on `<img>` |
| Intersection Observer | Task 4 — `useEffect` + `IntersectionObserver` |
| Load more | Task 4 — sentinel ref triggers `loadMore()` |
| Category filter | Tasks 2+4 — client-side filter via `params.categoryId` |
| Category fallback | Task 2 — `SHORTS_CATEGORIES` from `data/shorts.js` |
| Last-card behaviour | Task 4 — `onAdvance` is no-op when `cardRefs.current[activeIndex + 1]` is undefined |
| Open pageUrl in new tab | Task 4 — `window.open(url, '_blank', 'noopener,noreferrer')` |
| No 100vh | Task 3 — uses `height: 100%` + `flex: 1; min-height: 0` |

**Type / name consistency check:**

- `useShorts` returns `{ shorts, categories, pagination, loading, error, params, setParams, loadMore, refresh }` — used identically in `ShortsScreen.jsx`. ✓
- `transformShort` produces `{ id, title, description, pageUrl, thumbnail, publishedAt, category, categoryId, bg }` — all fields consumed in `ShortCard`. ✓
- `ShortCard` props: `{ short, isActive, onAdvance, cardRef }` — called correctly from `ShortsScreen`. ✓
- `EmptyState` called with `{ icon, title, subtitle }` — matches `EmptyState.jsx` signature. ✓
- `ErrorState` called with `{ message, onRetry }` — matches `ErrorState.jsx` signature. ✓

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code blocks are complete. ✓
