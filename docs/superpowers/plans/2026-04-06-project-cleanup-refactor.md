# Project Cleanup & Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all dead files, clean up root-level clutter, and refactor App.jsx navigation state, ForumScreen (720+ lines), and duplicated loading/error/empty patterns into shared components.

**Architecture:** Conservative refactoring of an existing React 19 + Vite prototype. Navigation state consolidation via `useReducer`. Large screen decomposition via child components. Shared UI feedback components (`LoadingState`, `ErrorState`, `EmptyState`) extracted from repeated patterns across 5+ screens.

**Tech Stack:** React 19, Vite 8, CSS Modules, JavaScript/JSX (no TypeScript, no routing library, no state library)

**Important:** This project has no test runner configured. Verification is via `npm run build` (production build) and `npm run lint` (ESLint).

---

## File Map

### Files to DELETE (Task 1 & 2)
- `indiaforums/src/App.css` — unused, not imported anywhere
- `indiaforums/src/index.css` — unused, not imported anywhere
- `indiaforums/src/assets/react.svg` — Vite boilerplate, not referenced
- `indiaforums/src/assets/vite.svg` — Vite boilerplate, not referenced
- `indiaforums/src/assets/hero.png` — not referenced anywhere
- `indiaforums/src/data/celebrities.js` — replaced by API hooks
- `indiaforums/src/data/forumData.js` — replaced by API hooks
- `indiaforums/src/screens/CreateTopicModal.jsx` — never imported
- `indiaforums/src/screens/CreateTopicModal.module.css` — CSS for unused component
- `indiaforums_app.html` — old 56KB single-file prototype
- `indiaforums/ARTICLE_API_ANALYSIS.md` — stale analysis doc

### Files to CREATE
- `indiaforums/src/components/ui/LoadingState.jsx` — shared skeleton loading component
- `indiaforums/src/components/ui/LoadingState.module.css` — styles for loading states
- `indiaforums/src/components/ui/ErrorState.jsx` — shared error display with retry
- `indiaforums/src/components/ui/ErrorState.module.css` — styles for error states
- `indiaforums/src/components/ui/EmptyState.jsx` — shared empty content display
- `indiaforums/src/components/ui/EmptyState.module.css` — styles for empty states
- `indiaforums/src/hooks/useAppNavigation.js` — useReducer-based navigation hook
- `indiaforums/src/screens/SearchScreen.module.css` — own CSS for SearchScreen
- `indiaforums/src/screens/MySpaceScreen.module.css` — own CSS for MySpaceScreen
- `indiaforums/src/screens/forum/ForumListView.jsx` — extracted forums list tab
- `indiaforums/src/screens/forum/ForumListView.module.css` — styles for forums list
- `indiaforums/src/screens/forum/ForumThreadView.jsx` — extracted thread drill-down
- `indiaforums/src/screens/forum/ForumThreadView.module.css` — styles for thread view
- `indiaforums/src/screens/forum/AllTopicsView.jsx` — extracted all-topics tab
- `indiaforums/src/screens/forum/AllTopicsView.module.css` — styles for all-topics
- `indiaforums/src/screens/forum/forumHelpers.js` — shared formatCount + constants

### Files to MODIFY
- `indiaforums/src/App.jsx` — replace 10+ useState with useAppNavigation hook
- `indiaforums/src/screens/ForumScreen.jsx` — slim down to orchestrator using sub-components
- `indiaforums/src/screens/ForumScreen.module.css` — remove styles moved to sub-components
- `indiaforums/src/screens/SearchScreen.jsx` — update CSS import
- `indiaforums/src/screens/MySpaceScreen.jsx` — update CSS import
- `indiaforums/src/screens/ExploreScreen.jsx` — use shared LoadingState/ErrorState
- `indiaforums/src/screens/NewsScreen.jsx` — use shared LoadingState/ErrorState
- `indiaforums/src/screens/VideoScreen.jsx` — use shared ErrorState
- `indiaforums/src/screens/GalleryScreen.jsx` — use shared ErrorState/EmptyState
- `indiaforums/src/screens/CelebritiesScreen.jsx` — use shared ErrorState

### Files to DELETE after refactor
- `indiaforums/src/screens/PlaceholderScreen.module.css` — replaced by individual CSS modules

---

## Task 1: Delete dead source files

**Files:**
- Delete: `indiaforums/src/App.css`
- Delete: `indiaforums/src/index.css`
- Delete: `indiaforums/src/assets/react.svg`
- Delete: `indiaforums/src/assets/vite.svg`
- Delete: `indiaforums/src/assets/hero.png`
- Delete: `indiaforums/src/data/celebrities.js`
- Delete: `indiaforums/src/data/forumData.js`
- Delete: `indiaforums/src/screens/CreateTopicModal.jsx`
- Delete: `indiaforums/src/screens/CreateTopicModal.module.css`

- [ ] **Step 1: Verify no imports reference these files**

Run from `indiaforums/` directory:
```bash
grep -r "App\.css\|index\.css\|react\.svg\|vite\.svg\|hero\.png\|from.*data/celebrities\|from.*data/forumData\|CreateTopicModal" src/ --include="*.jsx" --include="*.js" --include="*.css"
```
Expected: Only self-references within the files themselves (CreateTopicModal importing its own CSS). No external imports.

- [ ] **Step 2: Delete all 9 dead files**

```bash
cd indiaforums
rm src/App.css src/index.css src/assets/react.svg src/assets/vite.svg src/assets/hero.png src/data/celebrities.js src/data/forumData.js src/screens/CreateTopicModal.jsx src/screens/CreateTopicModal.module.css
```

- [ ] **Step 3: Verify build still passes**

```bash
cd indiaforums && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove 9 dead source files (unused CSS, assets, data, component)"
```

---

## Task 2: Clean up root-level clutter

**Files:**
- Delete: `indiaforums_app.html`
- Delete: `indiaforums/ARTICLE_API_ANALYSIS.md`

- [ ] **Step 1: Delete root-level clutter files**

```bash
rm indiaforums_app.html indiaforums/ARTICLE_API_ANALYSIS.md
```

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "chore: remove stale prototype HTML and analysis doc"
```

---

## Task 3: Fix PlaceholderScreen CSS naming

**Files:**
- Create: `indiaforums/src/screens/SearchScreen.module.css`
- Create: `indiaforums/src/screens/MySpaceScreen.module.css`
- Modify: `indiaforums/src/screens/SearchScreen.jsx:1`
- Modify: `indiaforums/src/screens/MySpaceScreen.jsx:1`
- Delete: `indiaforums/src/screens/PlaceholderScreen.module.css`

- [ ] **Step 1: Create SearchScreen.module.css**

Create `indiaforums/src/screens/SearchScreen.module.css`:
```css
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text3);
  background: var(--bg);
}

.icon {
  font-size: 40px;
  opacity: 0.4;
}

.label {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text3);
}

.sub {
  font-size: 12px;
  color: var(--text3);
}
```

- [ ] **Step 2: Create MySpaceScreen.module.css**

Create `indiaforums/src/screens/MySpaceScreen.module.css` with the same content as SearchScreen.module.css (identical placeholder styles).

- [ ] **Step 3: Update SearchScreen.jsx import**

In `indiaforums/src/screens/SearchScreen.jsx`, change line 1:
```jsx
// Before:
import styles from './PlaceholderScreen.module.css';
// After:
import styles from './SearchScreen.module.css';
```

- [ ] **Step 4: Update MySpaceScreen.jsx import**

In `indiaforums/src/screens/MySpaceScreen.jsx`, change line 1:
```jsx
// Before:
import styles from './PlaceholderScreen.module.css';
// After:
import styles from './MySpaceScreen.module.css';
```

- [ ] **Step 5: Delete PlaceholderScreen.module.css**

```bash
rm indiaforums/src/screens/PlaceholderScreen.module.css
```

- [ ] **Step 6: Verify build**

```bash
cd indiaforums && npm run build
```
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add indiaforums/src/screens/SearchScreen.module.css indiaforums/src/screens/MySpaceScreen.module.css indiaforums/src/screens/SearchScreen.jsx indiaforums/src/screens/MySpaceScreen.jsx
git add -u
git commit -m "refactor: give SearchScreen and MySpaceScreen their own CSS modules"
```

---

## Task 4: Extract shared LoadingState, ErrorState, EmptyState components

These patterns are duplicated across ExploreScreen, NewsScreen, ForumScreen, VideoScreen, GalleryScreen, and CelebritiesScreen. Extract once, reuse everywhere.

**Files:**
- Create: `indiaforums/src/components/ui/LoadingState.jsx`
- Create: `indiaforums/src/components/ui/LoadingState.module.css`
- Create: `indiaforums/src/components/ui/ErrorState.jsx`
- Create: `indiaforums/src/components/ui/ErrorState.module.css`
- Create: `indiaforums/src/components/ui/EmptyState.jsx`
- Create: `indiaforums/src/components/ui/EmptyState.module.css`

- [ ] **Step 1: Create ErrorState component**

Create `indiaforums/src/components/ui/ErrorState.jsx`:
```jsx
import styles from './ErrorState.module.css';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>!</div>
      <div className={styles.text}>{message || 'Something went wrong'}</div>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ErrorState.module.css**

Create `indiaforums/src/components/ui/ErrorState.module.css`:
```css
.wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-8) var(--sp-4);
}

.icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--red-surface);
  color: var(--red);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
}

.text {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text2);
  text-align: center;
  max-width: 240px;
}

.retryBtn {
  margin-top: var(--sp-1);
  padding: 6px 20px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--brand);
  background: transparent;
  color: var(--brand);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.retryBtn:hover {
  background: var(--brand-light);
}
```

- [ ] **Step 3: Create EmptyState component**

Create `indiaforums/src/components/ui/EmptyState.jsx`:
```jsx
import styles from './EmptyState.module.css';

export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div className={styles.wrap}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.title}>{title || 'Nothing here yet'}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Create EmptyState.module.css**

Create `indiaforums/src/components/ui/EmptyState.module.css`:
```css
.wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-8) var(--sp-4);
  color: var(--text3);
}

.icon {
  font-size: 32px;
  opacity: 0.5;
  margin-bottom: var(--sp-1);
}

.title {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--text2);
}

.subtitle {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--text3);
}
```

- [ ] **Step 5: Create LoadingState component**

Create `indiaforums/src/components/ui/LoadingState.jsx`:
```jsx
import styles from './LoadingState.module.css';

/**
 * Reusable skeleton loading component.
 * @param {'card'|'thread'|'hero'} variant — layout variant
 * @param {number} count — number of skeleton items to render
 */
export default function LoadingState({ variant = 'card', count = 4 }) {
  return (
    <div className={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles[variant] || styles.card}>
          <div className={styles.thumb} />
          <div className={styles.body}>
            <div className={styles.line} />
            <div className={`${styles.line} ${styles.lineShort}`} />
            {variant === 'thread' && (
              <div className={`${styles.line} ${styles.lineTiny}`} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create LoadingState.module.css**

Create `indiaforums/src/components/ui/LoadingState.module.css`:
```css
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--content-px);
}

@keyframes shimmer {
  0%   { opacity: 0.5; }
  50%  { opacity: 1; }
  100% { opacity: 0.5; }
}

.card, .thread {
  display: flex;
  gap: var(--sp-3);
  animation: shimmer 1.2s ease-in-out infinite;
}

.thumb {
  width: 80px;
  height: 64px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  flex-shrink: 0;
}

.thread .thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.line {
  height: 10px;
  border-radius: 4px;
  background: var(--surface);
  width: 100%;
}

.lineShort {
  width: 65%;
}

.lineTiny {
  width: 40%;
}

.hero {
  height: 160px;
  border-radius: var(--radius-md);
  background: var(--surface);
  animation: shimmer 1.2s ease-in-out infinite;
  margin-bottom: var(--sp-2);
}
```

- [ ] **Step 7: Verify build**

```bash
cd indiaforums && npm run build
```
Expected: Build succeeds (new components aren't imported yet, but CSS Modules should compile).

- [ ] **Step 8: Commit**

```bash
git add indiaforums/src/components/ui/LoadingState.jsx indiaforums/src/components/ui/LoadingState.module.css indiaforums/src/components/ui/ErrorState.jsx indiaforums/src/components/ui/ErrorState.module.css indiaforums/src/components/ui/EmptyState.jsx indiaforums/src/components/ui/EmptyState.module.css
git commit -m "feat: add shared LoadingState, ErrorState, EmptyState UI components"
```

---

## Task 5: Create useAppNavigation hook (useReducer)

**Files:**
- Create: `indiaforums/src/hooks/useAppNavigation.js`
- Modify: `indiaforums/src/App.jsx`

- [ ] **Step 1: Create useAppNavigation hook**

Create `indiaforums/src/hooks/useAppNavigation.js`:
```js
import { useReducer, useCallback } from 'react';

const initialState = {
  activeTab:       'explore',
  selectedArticle: null,
  selectedVideo:   null,
  showGalleries:   false,
  selectedGallery: null,
  activeStory:     null,
  selectedTopic:   null,
  selectedCeleb:   null,
  drilledForum:    null,
  selectedTag:     null,
  drawerOpen:      false,
};

function navReducer(state, action) {
  switch (action.type) {
    case 'SET_TAB':
      return { ...initialState, activeTab: action.payload };

    case 'SELECT_ARTICLE':
      return { ...state, selectedArticle: action.payload };
    case 'CLEAR_ARTICLE':
      return { ...state, selectedArticle: null };

    case 'SELECT_VIDEO':
      return { ...state, selectedVideo: action.payload };
    case 'CLEAR_VIDEO':
      return { ...state, selectedVideo: null };

    case 'OPEN_GALLERIES':
      return { ...state, showGalleries: true };
    case 'CLOSE_GALLERIES':
      return { ...state, showGalleries: false };

    case 'SELECT_GALLERY':
      return { ...state, selectedGallery: action.payload };
    case 'CLEAR_GALLERY':
      return { ...state, selectedGallery: null };

    case 'SET_STORY':
      return {
        ...state,
        activeStory:     action.payload,
        selectedArticle: null,
        selectedGallery: null,
        showGalleries:   false,
      };
    case 'CLEAR_STORY':
      return { ...state, activeStory: null };

    case 'SELECT_TOPIC':
      return { ...state, selectedTopic: action.payload };
    case 'CLEAR_TOPIC':
      return { ...state, selectedTopic: null };

    case 'SELECT_CELEB':
      return { ...state, selectedCeleb: action.payload };
    case 'CLEAR_CELEB':
      return { ...state, selectedCeleb: null };

    case 'DRILL_FORUM':
      return { ...state, drilledForum: action.payload };
    case 'CLEAR_DRILLED_FORUM':
      return { ...state, drilledForum: null };

    case 'SELECT_TAG':
      return { ...state, selectedTag: action.payload };
    case 'CLEAR_TAG':
      return { ...state, selectedTag: null };

    case 'OPEN_DRAWER':
      return { ...state, drawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export default function useAppNavigation() {
  const [state, dispatch] = useReducer(navReducer, initialState);

  const actions = {
    setTab:           useCallback((tab) => dispatch({ type: 'SET_TAB', payload: tab }), []),
    selectArticle:    useCallback((a)   => dispatch({ type: 'SELECT_ARTICLE', payload: a }), []),
    clearArticle:     useCallback(()    => dispatch({ type: 'CLEAR_ARTICLE' }), []),
    selectVideo:      useCallback((v)   => dispatch({ type: 'SELECT_VIDEO', payload: v }), []),
    clearVideo:       useCallback(()    => dispatch({ type: 'CLEAR_VIDEO' }), []),
    openGalleries:    useCallback(()    => dispatch({ type: 'OPEN_GALLERIES' }), []),
    closeGalleries:   useCallback(()    => dispatch({ type: 'CLOSE_GALLERIES' }), []),
    selectGallery:    useCallback((g)   => dispatch({ type: 'SELECT_GALLERY', payload: g }), []),
    clearGallery:     useCallback(()    => dispatch({ type: 'CLEAR_GALLERY' }), []),
    setStory:         useCallback((s)   => dispatch({ type: 'SET_STORY', payload: s }), []),
    clearStory:       useCallback(()    => dispatch({ type: 'CLEAR_STORY' }), []),
    selectTopic:      useCallback((t)   => dispatch({ type: 'SELECT_TOPIC', payload: t }), []),
    clearTopic:       useCallback(()    => dispatch({ type: 'CLEAR_TOPIC' }), []),
    selectCeleb:      useCallback((c)   => dispatch({ type: 'SELECT_CELEB', payload: c }), []),
    clearCeleb:       useCallback(()    => dispatch({ type: 'CLEAR_CELEB' }), []),
    drillForum:       useCallback((f)   => dispatch({ type: 'DRILL_FORUM', payload: f }), []),
    clearDrilledForum:useCallback(()    => dispatch({ type: 'CLEAR_DRILLED_FORUM' }), []),
    selectTag:        useCallback((t)   => dispatch({ type: 'SELECT_TAG', payload: t }), []),
    clearTag:         useCallback(()    => dispatch({ type: 'CLEAR_TAG' }), []),
    openDrawer:       useCallback(()    => dispatch({ type: 'OPEN_DRAWER' }), []),
    closeDrawer:      useCallback(()    => dispatch({ type: 'CLOSE_DRAWER' }), []),
    reset:            useCallback(()    => dispatch({ type: 'RESET' }), []),
  };

  return { ...state, ...actions };
}
```

- [ ] **Step 2: Rewrite App.jsx to use useAppNavigation**

Replace `indiaforums/src/App.jsx` with:
```jsx
import { useEffect } from 'react';
import { useDevToolbar } from './contexts/DevToolbarContext';
import useAppNavigation from './hooks/useAppNavigation';

import PhoneShell    from './components/layout/PhoneShell';
import DynamicIsland from './components/layout/DynamicIsland';
import StatusBar     from './components/layout/StatusBar';
import TopNav        from './components/layout/TopNav';
import BottomNav     from './components/layout/BottomNav';
import SideDrawer    from './components/layout/SideDrawer';

import ExploreScreen       from './screens/ExploreScreen';
import NewsScreen          from './screens/NewsScreen';
import ForumScreen         from './screens/ForumScreen';
import SearchScreen        from './screens/SearchScreen';
import MySpaceScreen       from './screens/MySpaceScreen';
import ArticleScreen       from './screens/ArticleScreen';
import GalleryScreen       from './screens/GalleryScreen';
import GalleryDetailScreen from './screens/GalleryDetailScreen';
import TopicDetailScreen   from './screens/TopicDetailScreen';
import CelebritiesScreen   from './screens/CelebritiesScreen';
import CelebrityDetailScreen from './screens/CelebrityDetailScreen';
import VideoScreen         from './screens/VideoScreen';
import VideoDetailScreen   from './screens/VideoDetailScreen';
import FanFictionScreen    from './screens/FanFictionScreen';
import QuizzesScreen       from './screens/QuizzesScreen';
import ShortsScreen        from './screens/ShortsScreen';
import WebStoriesScreen    from './screens/WebStoriesScreen';
import TagDetailScreen     from './screens/TagDetailScreen';

const TAB_SCREENS = {
  explore: ExploreScreen,
  news:    NewsScreen,
  forums:  ForumScreen,
  search:  SearchScreen,
  myspace: MySpaceScreen,
};

export default function App() {
  const nav = useAppNavigation();
  const { darkMode, toggleDarkMode, navResetTrigger } = useDevToolbar();

  /* Reset all navigation when toolbar reset button is pressed */
  useEffect(() => {
    if (navResetTrigger === 0) return;
    nav.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navResetTrigger]);

  /* Handlers */
  function handleStoryPress(story) {
    nav.setStory(story.label.toLowerCase());
  }

  function handleNavTabChange(tab) {
    nav.setTab(tab);
  }

  /* Drawer navigation */
  function handleDrawerNavigate(target) {
    nav.closeDrawer();
    const storyTargets = [
      'celebrities', 'videos', 'galleries', 'fan fictions',
      'quizzes', 'shorts', 'web stories',
    ];
    if (target === 'home') {
      handleNavTabChange('explore');
    } else if (target === 'news') {
      handleNavTabChange('news');
    } else if (target === 'forums') {
      handleNavTabChange('forums');
    } else if (storyTargets.includes(target)) {
      nav.setStory(target);
    }
  }

  /* Determine current view */
  let topNavTitle = null;
  let topNavBack  = null;
  let content     = null;

  if (nav.selectedGallery) {
    topNavTitle = nav.selectedGallery.title;
    topNavBack  = nav.clearGallery;
    content     = <GalleryDetailScreen gallery={nav.selectedGallery} onBack={nav.clearGallery} onGalleryPress={nav.selectGallery} />;

  } else if (nav.activeStory === 'galleries' || nav.showGalleries) {
    topNavTitle = 'Photo Gallery';
    topNavBack  = nav.showGalleries ? nav.closeGalleries : nav.clearStory;
    content     = <GalleryScreen onBack={topNavBack} onGalleryPress={nav.selectGallery} />;

  } else if (nav.selectedCeleb) {
    topNavTitle = nav.selectedCeleb.name;
    topNavBack  = nav.clearCeleb;
    content     = <CelebrityDetailScreen celebrity={nav.selectedCeleb} />;

  } else if (nav.activeStory === 'celebrities') {
    topNavTitle = 'Celebrities';
    topNavBack  = nav.clearStory;
    content     = <CelebritiesScreen onBack={nav.clearStory} onCelebPress={nav.selectCeleb} />;

  } else if (nav.selectedVideo) {
    topNavTitle = 'Video';
    topNavBack  = nav.clearVideo;
    content     = (
      <VideoDetailScreen
        video={nav.selectedVideo}
        onBack={nav.clearVideo}
        onVideoPress={nav.selectVideo}
      />
    );

  } else if (nav.activeStory === 'videos') {
    topNavTitle = 'Videos';
    topNavBack  = nav.clearStory;
    content     = <VideoScreen onBack={nav.clearStory} onVideoPress={nav.selectVideo} />;

  } else if (nav.activeStory === 'fan fictions') {
    topNavTitle = 'Fan Fictions';
    topNavBack  = nav.clearStory;
    content     = <FanFictionScreen onBack={nav.clearStory} />;

  } else if (nav.activeStory === 'quizzes') {
    topNavTitle = 'Fan Quizzes';
    topNavBack  = nav.clearStory;
    content     = <QuizzesScreen onBack={nav.clearStory} />;

  } else if (nav.activeStory === 'shorts') {
    topNavTitle = 'Shorts';
    topNavBack  = nav.clearStory;
    content     = <ShortsScreen onBack={nav.clearStory} />;

  } else if (nav.activeStory === 'web stories') {
    topNavTitle = 'Web Stories';
    topNavBack  = nav.clearStory;
    content     = <WebStoriesScreen onBack={nav.clearStory} />;

  } else if (nav.selectedTopic) {
    topNavBack  = nav.clearTopic;
    content     = <TopicDetailScreen topic={nav.selectedTopic} />;

  } else if (nav.selectedTag) {
    topNavTitle = nav.selectedTag.name;
    topNavBack  = nav.clearTag;
    content     = (
      <TagDetailScreen
        tag={nav.selectedTag}
        onBack={nav.clearTag}
        onArticlePress={nav.selectArticle}
        onVideoPress={nav.selectVideo}
        onGalleryPress={nav.selectGallery}
      />
    );

  } else if (nav.selectedArticle) {
    topNavTitle = 'Article';
    topNavBack  = nav.clearArticle;
    content     = (
      <ArticleScreen
        article={nav.selectedArticle}
        onArticlePress={nav.selectArticle}
        onTagPress={nav.selectTag}
      />
    );

  } else if (nav.activeTab === 'forums') {
    if (nav.drilledForum) {
      topNavBack = nav.clearDrilledForum;
    }
    content = (
      <ForumScreen
        onTopicPress={nav.selectTopic}
        onForumDrill={nav.drillForum}
        drilledForum={nav.drilledForum}
      />
    );

  } else {
    const ActiveScreen = TAB_SCREENS[nav.activeTab];
    content = (
      <ActiveScreen
        onArticlePress={nav.selectArticle}
        onVideoPress={nav.selectVideo}
        onGalleryPress={nav.selectGallery}
        onGalleriesOpen={nav.openGalleries}
        onStoryPress={handleStoryPress}
      />
    );
  }

  return (
    <PhoneShell darkMode={darkMode}>
      <DynamicIsland />
      <StatusBar />

      <TopNav
        title={topNavTitle}
        onBack={topNavBack}
        onMenuOpen={nav.openDrawer}
      />

      {content}

      <BottomNav
        activeTab={nav.activeTab}
        onTabChange={topNavBack ? handleNavTabChange : nav.setTab}
      />

      <SideDrawer
        open={nav.drawerOpen}
        onClose={nav.closeDrawer}
        darkMode={darkMode}
        onDarkModeToggle={toggleDarkMode}
        onNavigate={handleDrawerNavigate}
      />
    </PhoneShell>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd indiaforums && npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add indiaforums/src/hooks/useAppNavigation.js indiaforums/src/App.jsx
git commit -m "refactor: consolidate App.jsx navigation into useReducer hook"
```

---

## Task 6: Split ForumScreen into sub-components

ForumScreen.jsx is 720+ lines with 3 distinct views. Split into orchestrator + 3 child components.

**Files:**
- Create: `indiaforums/src/screens/forum/forumHelpers.js`
- Create: `indiaforums/src/screens/forum/ForumListView.jsx`
- Create: `indiaforums/src/screens/forum/ForumListView.module.css`
- Create: `indiaforums/src/screens/forum/ForumThreadView.jsx`
- Create: `indiaforums/src/screens/forum/ForumThreadView.module.css`
- Create: `indiaforums/src/screens/forum/AllTopicsView.jsx`
- Create: `indiaforums/src/screens/forum/AllTopicsView.module.css`
- Modify: `indiaforums/src/screens/ForumScreen.jsx`
- Modify: `indiaforums/src/screens/ForumScreen.module.css`

- [ ] **Step 1: Create forumHelpers.js**

Create `indiaforums/src/screens/forum/forumHelpers.js`:
```js
export const TOP_TABS = [
  { id: 'forums',     label: 'Forums' },
  { id: 'all-topics', label: 'All Topics' },
];

export function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
```

- [ ] **Step 2: Create ForumThreadView**

Create `indiaforums/src/screens/forum/ForumThreadView.jsx` — extract the thread drill-down section (lines 165-367 of current ForumScreen.jsx). This component receives `selectedForum`, `forumDetail`, `flairs`, topic-related hook data, and `onTopicPress` as props.

```jsx
import { useState, useMemo } from 'react';
import styles from './ForumThreadView.module.css';
import ThreadCard from '../../components/cards/ThreadCard';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { formatCount } from './forumHelpers';

export default function ForumThreadView({
  selectedForum, forumDetail, flairs,
  topics, topicsLoading, topicsLoadingMore,
  topicsError, topicsHasMore,
  loadMoreTopics, refreshTopics,
  onTopicPress,
}) {
  const [activeFlairId, setActiveFlairId]         = useState(null);
  const [flairDropdownOpen, setFlairDropdownOpen] = useState(false);

  const detail = forumDetail || selectedForum;

  const topicCards = useMemo(() => {
    const mapped = topics.map(t => ({
      ...t,
      forumName:  t.forumName || selectedForum?.name || '',
      forumBg:    selectedForum?.bg || 'linear-gradient(135deg,#1e3a5e,#2563eb)',
      forumEmoji: selectedForum?.emoji || '💬',
      ago:        t.time,
      comments:   t.replies,
    }));
    if (activeFlairId == null) return mapped;
    return mapped.filter(t => t.flairId === activeFlairId);
  }, [topics, selectedForum, activeFlairId]);

  const activeFlairLabel = useMemo(() => {
    if (activeFlairId == null) return 'All';
    return flairs.find(f => f.id === activeFlairId)?.name || 'All';
  }, [activeFlairId, flairs]);

  return (
    <div className={`${styles.screen} ${styles.slideIn}`}>

      {/* Forum banner */}
      {detail.bannerUrl && (
        <div className={styles.forumBanner}>
          <img src={detail.bannerUrl} alt="" className={styles.forumBannerImg} />
        </div>
      )}

      {/* Forum identity */}
      <div className={styles.forumIdentity}>
        <div className={styles.forumIdentityAvatar} style={{ background: detail.bg }}>
          {detail.thumbnailUrl
            ? <img src={detail.thumbnailUrl} alt="" className={styles.forumAvatarImg} />
            : detail.emoji
          }
        </div>
        <div className={styles.forumIdentityInfo}>
          <div className={styles.forumIdentityName}>{detail.name}</div>
          {detail.description && (
            <div className={styles.forumIdentityDesc}>{detail.description}</div>
          )}
        </div>
        <button className={styles.followBtn}>Follow</button>
      </div>

      {/* Forum stats bar */}
      <div className={styles.forumStatBar}>
        <div className={styles.forumStatItem}>
          <span className={styles.forumStatNum}>{formatCount(detail.topicCount)}</span>
          <span className={styles.forumStatLabel}>Topics</span>
        </div>
        <div className={styles.statDivider}/>
        <div className={styles.forumStatItem}>
          <span className={styles.forumStatNum}>{formatCount(detail.postCount ?? 0)}</span>
          <span className={styles.forumStatLabel}>Posts</span>
        </div>
        <div className={styles.statDivider}/>
        <div className={styles.forumStatItem}>
          <span className={styles.forumStatNum}>{formatCount(detail.followCount ?? 0)}</span>
          <span className={styles.forumStatLabel}>Followers</span>
        </div>
        <div className={styles.statDivider}/>
        <div className={styles.forumStatItem}>
          <span className={styles.forumStatNum}>#{detail.rank || '–'}</span>
          <span className={styles.forumStatLabel}>Ranked</span>
        </div>
      </div>

      {/* Flair filter bar */}
      <div className={styles.flairBar}>
        {flairs.length > 0 && (
          <div className={styles.flairFilterWrap}>
            <button
              className={`${styles.flairTrigger} ${flairDropdownOpen ? styles.flairTriggerOpen : ''}`}
              onClick={() => setFlairDropdownOpen(o => !o)}
            >
              {activeFlairId != null ? (
                <span
                  className={styles.flairDot}
                  style={{ background: flairs.find(f => f.id === activeFlairId)?.bgColor }}
                />
              ) : (
                <span className={styles.flairAllDot} />
              )}
              <span className={styles.flairTriggerLabel}>{activeFlairLabel}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
                className={`${styles.flairChevron} ${flairDropdownOpen ? styles.flairChevronOpen : ''}`}
              >
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {flairDropdownOpen && (
              <>
                <div className={styles.flairBackdrop} onClick={() => setFlairDropdownOpen(false)} />
                <div className={styles.flairDropdown}>
                  <div
                    className={`${styles.flairOption} ${activeFlairId == null ? styles.flairOptionActive : ''}`}
                    onClick={() => { setActiveFlairId(null); setFlairDropdownOpen(false); }}
                  >
                    <span className={styles.flairAllDot} />
                    <span className={styles.flairOptionName}>All</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.flairCheck}>
                      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className={styles.flairSeparator} />
                  {flairs.map(f => (
                    <div
                      key={f.id}
                      className={`${styles.flairOption} ${activeFlairId === f.id ? styles.flairOptionActive : ''}`}
                      onClick={() => { setActiveFlairId(f.id); setFlairDropdownOpen(false); }}
                    >
                      <span className={styles.flairDot} style={{ background: f.bgColor }} />
                      <span className={styles.flairOptionName}>{f.name}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.flairCheck}>
                        <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.flairBarRight}>
          {!topicsLoading && (
            <span className={styles.flairTopicCount}>
              {topicCards.length} topic{topicCards.length !== 1 ? 's' : ''}
            </span>
          )}
          <button className={styles.newTopicBtn}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New
          </button>
        </div>
      </div>

      {/* Loading */}
      {topicsLoading && (
        <div className={styles.threadList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonThread}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineTiny}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {topicsError && !topicsLoading && (
        <ErrorState message={topicsError} onRetry={refreshTopics} />
      )}

      {/* Topics list */}
      {!topicsLoading && !topicsError && (
        <div className={styles.threadList}>
          {topicCards.length === 0 ? (
            <EmptyState icon="📭" title="No topics yet" subtitle="Be the first to start a discussion!" />
          ) : topicCards.map((t, i) => (
            <div key={t.id} onClick={() => onTopicPress?.({ ...t, forumBg: detail.bg, forumEmoji: detail.emoji })}>
              <ThreadCard
                forumName={detail.name}
                bg={detail.bg}
                title={t.title}
                description={t.description}
                poster={t.poster}
                ago={t.time}
                likes={formatCount(t.likes)}
                comments={formatCount(t.replies)}
                views={formatCount(t.views)}
                lastBy={t.lastBy}
                lastTime={t.lastTime}
                locked={t.locked}
                pinned={t.pinned}
                tags={t.tags}
                topicImage={t.topicImage}
                delay={i * 0.04}
              />
            </div>
          ))}

          {topicsLoadingMore && Array.from({ length: 3 }).map((_, i) => (
            <div key={`lm-${i}`} className={styles.skeletonThread}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {topicsHasMore && !topicsLoadingMore && !topicsLoading && (
        <button className={styles.loadMore} onClick={loadMoreTopics}>
          Load More Topics
        </button>
      )}

      <div className={styles.spacer}/>
    </div>
  );
}
```

- [ ] **Step 3: Create ForumThreadView.module.css**

Copy the relevant CSS classes from `ForumScreen.module.css` into `indiaforums/src/screens/forum/ForumThreadView.module.css`. The classes needed are: `screen`, `slideIn`, `forumBanner`, `forumBannerImg`, `forumIdentity`, `forumIdentityAvatar`, `forumAvatarImg`, `forumIdentityInfo`, `forumIdentityName`, `forumIdentityDesc`, `followBtn`, `forumStatBar`, `forumStatItem`, `forumStatNum`, `forumStatLabel`, `statDivider`, `flairBar`, `flairFilterWrap`, `flairTrigger`, `flairTriggerOpen`, `flairAllDot`, `flairDot`, `flairTriggerLabel`, `flairChevron`, `flairChevronOpen`, `flairBackdrop`, `flairDropdown`, `flairOption`, `flairOptionActive`, `flairOptionName`, `flairCheck`, `flairSeparator`, `flairBarRight`, `flairTopicCount`, `newTopicBtn`, `threadList`, `skeletonThread`, `skeletonAvatar`, `skeletonBody`, `skeletonLine`, `skeletonLineShort`, `skeletonLineTiny`, `loadMore`, `spacer`, plus all animation keyframes (`slideFromRight`, `fadeInUp`).

Extract these classes from `ForumScreen.module.css` — they correspond to the thread drill-down view (the early return block at line 165-367 of ForumScreen.jsx).

- [ ] **Step 4: Create AllTopicsView**

Create `indiaforums/src/screens/forum/AllTopicsView.jsx` — extract the all-topics tab (lines 539-716 of current ForumScreen.jsx). This component receives `allTopics*` hook data and `onTopicPress`.

```jsx
import { useState, useMemo } from 'react';
import styles from './AllTopicsView.module.css';
import ThreadCard from '../../components/cards/ThreadCard';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { formatCount } from './forumHelpers';

export default function AllTopicsView({
  allTopics, allTopicsTotal,
  allTopicsLoading, allTopicsLoadingMore,
  allTopicsError, allTopicsHasMore,
  loadMoreAllTopics, refreshAllTopics,
  onTopicPress,
}) {
  const [sortMode, setSortMode]           = useState('latest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [viewMode, setViewMode]           = useState('detailed');

  const sorted = useMemo(() => {
    if (sortMode === 'popular') {
      return [...allTopics].sort((a, b) => b.views - a.views);
    }
    return allTopics;
  }, [allTopics, sortMode]);

  return (
    <>
      {/* Sort & view bar */}
      <div className={styles.sortBar}>
        <div className={styles.sortWrap}>
          <button
            className={`${styles.sortTrigger} ${sortDropdownOpen ? styles.sortTriggerOpen : ''}`}
            onClick={() => setSortDropdownOpen(o => !o)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{sortMode === 'latest' ? 'Latest' : 'Popular'}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
              className={`${styles.sortChevron} ${sortDropdownOpen ? styles.sortChevronOpen : ''}`}
            >
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {sortDropdownOpen && (
            <>
              <div className={styles.backdrop} onClick={() => setSortDropdownOpen(false)} />
              <div className={styles.sortDropdown}>
                {['latest', 'popular'].map(opt => (
                  <div
                    key={opt}
                    className={`${styles.sortOption} ${sortMode === opt ? styles.sortOptionActive : ''}`}
                    onClick={() => { setSortMode(opt); setSortDropdownOpen(false); }}
                  >
                    <span>{opt === 'latest' ? 'Latest' : 'Popular'}</span>
                    {sortMode === opt && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.sortRight}>
          {!allTopicsLoading && (
            <span className={styles.sortCount}>{formatCount(allTopicsTotal)}</span>
          )}
          <button
            className={`${styles.viewToggle} ${viewMode === 'detailed' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('detailed')}
            title="Detailed view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="1" width="14" height="4" rx="1"/>
              <rect x="1" y="7" width="14" height="4" rx="1"/>
              <line x1="1" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          <button
            className={`${styles.viewToggle} ${viewMode === 'compact' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('compact')}
            title="Compact view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="2.5" x2="15" y2="2.5"/>
              <line x1="1" y1="6.5" x2="15" y2="6.5"/>
              <line x1="1" y1="10.5" x2="15" y2="10.5"/>
              <line x1="1" y1="14.5" x2="15" y2="14.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Loading */}
      {allTopicsLoading && (
        <div className={styles.threadList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonThread}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineTiny}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {allTopicsError && !allTopicsLoading && (
        <ErrorState message={allTopicsError} onRetry={refreshAllTopics} />
      )}

      {/* Topic feed */}
      {!allTopicsLoading && !allTopicsError && (
        <div className={styles.threadList}>
          {sorted.length === 0 ? (
            <EmptyState icon="📭" title="No topics yet" />
          ) : sorted.map((t, i) => (
            <div key={t.id} onClick={() => onTopicPress?.({
              ...t,
              forumBg: 'linear-gradient(135deg,#1e3a5e,#2563eb)',
              forumEmoji: '💬',
            })}>
              {viewMode === 'compact' ? (
                <div className={styles.compactTopic}>
                  <div className={styles.compactBody}>
                    <span className={styles.compactForum}>{t.forumName}</span>
                    <div className={styles.compactTitle}>{t.title}</div>
                    <div className={styles.compactMeta}>
                      <span>{t.poster}</span>
                      <span className={styles.compactDot}/>
                      <span>{t.time}</span>
                      <span className={styles.compactDot}/>
                      <span>{formatCount(t.replies)} replies</span>
                    </div>
                  </div>
                  <div className={styles.compactViews}>{formatCount(t.views)}</div>
                </div>
              ) : (
                <ThreadCard
                  forumName={t.forumName}
                  bg="linear-gradient(135deg,#1e3a5e,#2563eb)"
                  title={t.title}
                  description={t.description}
                  poster={t.poster}
                  ago={t.time}
                  likes={formatCount(t.likes)}
                  comments={formatCount(t.replies)}
                  views={formatCount(t.views)}
                  lastBy={t.lastBy}
                  lastTime={t.lastTime}
                  locked={t.locked}
                  pinned={t.pinned}
                  tags={t.tags}
                  topicImage={t.topicImage}
                  delay={i * 0.03}
                />
              )}
            </div>
          ))}

          {allTopicsLoadingMore && Array.from({ length: 3 }).map((_, i) => (
            <div key={`atlm-${i}`} className={styles.skeletonThread}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {allTopicsHasMore && !allTopicsLoadingMore && !allTopicsLoading && (
        <button className={styles.loadMore} onClick={loadMoreAllTopics}>
          Load More Topics
        </button>
      )}
    </>
  );
}
```

- [ ] **Step 5: Create AllTopicsView.module.css**

Copy the relevant CSS classes from `ForumScreen.module.css` into `indiaforums/src/screens/forum/AllTopicsView.module.css`. The classes needed are: `sortBar` (was `topicSortBar`), `sortWrap` (was `topicSortWrap`), `sortTrigger` (was `topicSortTrigger`), `sortTriggerOpen`, `sortChevron` (was `topicSortChevron`), `sortChevronOpen`, `backdrop` (was `flairBackdrop`), `sortDropdown` (was `topicSortDropdown`), `sortOption` (was `topicSortOption`), `sortOptionActive`, `sortRight` (was `topicSortRight`), `sortCount` (was `topicSortCount`), `viewToggle`, `viewToggleActive`, `threadList`, `skeletonThread`, `skeletonAvatar`, `skeletonBody`, `skeletonLine`, `skeletonLineShort`, `skeletonLineTiny`, `compactTopic`, `compactBody`, `compactForum`, `compactTitle`, `compactMeta`, `compactDot`, `compactViews`, `loadMore`, plus keyframes.

- [ ] **Step 6: Create ForumListView**

Create `indiaforums/src/screens/forum/ForumListView.jsx` — extract the forums list tab (lines 389-533 of current ForumScreen.jsx). This component receives category/forum data and `openForum` callback.

```jsx
import { useState, useMemo } from 'react';
import styles from './ForumListView.module.css';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { formatCount } from './forumHelpers';

export default function ForumListView({
  categories, subCatMap, forums, totalCount,
  homeLoading, forumsLoadingMore, homeError, forumsHasMore,
  loadMoreForums, refreshHome,
  onForumPress,
}) {
  const [activeCat, setActiveCat]       = useState('all');
  const [activeSubCat, setActiveSubCat] = useState('all');
  const [search, setSearch]             = useState('');

  const catTabs = useMemo(() => {
    const tabs = [{ id: 'all', label: 'All' }];
    categories.forEach(c => tabs.push({ id: String(c.id), label: c.name }));
    return tabs;
  }, [categories]);

  const subCats = useMemo(() => {
    if (activeCat === 'all') return [];
    const subs = subCatMap[Number(activeCat)] || [];
    return [{ id: 'all', label: 'All' }, ...subs.map(s => ({ id: String(s.id), label: s.name }))];
  }, [activeCat, subCatMap]);

  const displayForums = useMemo(() => {
    if (!search.trim()) return forums;
    const q = search.toLowerCase();
    return forums.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }, [forums, search]);

  function selectCat(id) {
    setActiveCat(id);
    setActiveSubCat('all');
  }

  return (
    <>
      {/* Search */}
      <div className={styles.searchWrap}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="var(--text3)" strokeWidth="1.4"/>
          <path d="M10.5 10.5l3 3" stroke="var(--text3)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input className={styles.searchInput} placeholder="Search forums..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearBtn} onClick={() => setSearch('')}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className={styles.catScroll}>
        {catTabs.map(({ id, label }) => (
          <div key={id}
            className={`${styles.catTab} ${activeCat === id ? styles.catTabActive : ''}`}
            onClick={() => selectCat(id)}
          >{label}</div>
        ))}
      </div>

      {/* Sub-category chips */}
      {subCats.length > 0 && (
        <div className={styles.subCatScroll}>
          {subCats.map(({ id, label }) => (
            <div key={id}
              className={`${styles.subCat} ${activeSubCat === id ? styles.subCatActive : ''}`}
              onClick={() => setActiveSubCat(id)}
            >{label}</div>
          ))}
        </div>
      )}

      {/* Count */}
      {!homeLoading && (
        <div className={styles.countRow}>
          <span className={styles.countText}>
            {totalCount} Forum{totalCount !== 1 ? 's' : ''}
            {activeCat !== 'all' && ` in ${catTabs.find(t => t.id === activeCat)?.label || ''}`}
            {activeSubCat !== 'all' && ` > ${subCats.find(s => s.id === activeSubCat)?.label || ''}`}
          </span>
          {search.trim() && <span className={styles.searchTag}>filtered</span>}
        </div>
      )}

      {/* Loading skeleton */}
      {homeLoading && (
        <div className={styles.forumList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonForum}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {homeError && !homeLoading && (
        <ErrorState message={homeError} onRetry={refreshHome} />
      )}

      {/* Forum list */}
      {!homeLoading && !homeError && (
        <div className={styles.forumList}>
          {displayForums.length === 0 ? (
            <EmptyState icon="🔍" title="No forums found" subtitle="Try a different search or category" />
          ) : displayForums.map((forum, i) => (
            <div key={forum.id} className={styles.forumCard}
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => onForumPress(forum)}
              role="button" tabIndex={0}
            >
              <div className={styles.forumAvatar} style={{ background: forum.bg }}>
                {forum.thumbnailUrl
                  ? <img src={forum.thumbnailUrl} alt="" className={styles.forumAvatarImg} />
                  : forum.emoji
                }
              </div>
              <div className={styles.forumBody}>
                <div className={styles.forumNameRow}>
                  <span className={styles.forumName}>{forum.name}</span>
                  {forum.hot && <span className={styles.hotBadge}>🔥</span>}
                </div>
                <div className={styles.forumDesc}>{forum.description}</div>
              </div>
              <div className={styles.forumStats}>
                <div className={styles.statCol}>
                  <span className={styles.statRank}>{forum.rankDisplay || '#' + (forum.rank || '–')}</span>
                  <span className={styles.statLabel}>Rank</span>
                </div>
                <div className={styles.statDividerV}/>
                <div className={styles.statCol}>
                  <span className={styles.statNum}>{formatCount(forum.topicCount)}</span>
                  <span className={styles.statLabel}>Topics</span>
                </div>
                <div className={styles.statDividerV}/>
                <div className={styles.statCol}>
                  <span className={styles.statNum}>{formatCount(forum.followCount)}</span>
                  <span className={styles.statLabel}>Flwrs</span>
                </div>
              </div>
            </div>
          ))}

          {forumsLoadingMore && Array.from({ length: 3 }).map((_, i) => (
            <div key={`flm-${i}`} className={styles.skeletonForum}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {forumsHasMore && !forumsLoadingMore && !homeLoading && !search.trim() && (
        <button className={styles.loadMore} onClick={loadMoreForums}>
          Load More Forums
        </button>
      )}
    </>
  );
}
```

- [ ] **Step 7: Create ForumListView.module.css**

Copy the relevant CSS classes from `ForumScreen.module.css` into `indiaforums/src/screens/forum/ForumListView.module.css`. The classes needed are: `searchWrap`, `searchInput`, `clearBtn`, `catScroll`, `catTab`, `catTabActive`, `subCatScroll`, `subCat`, `subCatActive`, `countRow`, `countText`, `searchTag`, `forumList`, `skeletonForum`, `skeletonAvatar`, `skeletonBody`, `skeletonLine`, `skeletonLineShort`, `forumCard`, `forumAvatar`, `forumAvatarImg`, `forumBody`, `forumNameRow`, `forumName`, `hotBadge`, `forumDesc`, `forumStats`, `statCol`, `statRank`, `statNum`, `statLabel`, `statDividerV`, `loadMore`, plus the `fadeInUp` keyframe.

- [ ] **Step 8: Rewrite ForumScreen.jsx as orchestrator**

Replace `indiaforums/src/screens/ForumScreen.jsx` with:
```jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import styles from './ForumScreen.module.css';
import useForumHome from '../hooks/useForumHome';
import useForumTopics from '../hooks/useForumTopics';
import useAllForumTopics from '../hooks/useAllForumTopics';
import { TOP_TABS } from './forum/forumHelpers';
import ForumListView from './forum/ForumListView';
import ForumThreadView from './forum/ForumThreadView';
import AllTopicsView from './forum/AllTopicsView';

export default function ForumScreen({ onTopicPress, onForumDrill, drilledForum }) {
  const [topTab, setTopTab] = useState('forums');
  const [selectedForum, setSelectedForum] = useState(null);
  const [view, setView] = useState('list');
  const [activeCat, setActiveCat] = useState('all');
  const [activeSubCat, setActiveSubCat] = useState('all');

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!drilledForum && view === 'threads') {
      setView('list');
      setSelectedForum(null);
      scrollTop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drilledForum]);

  const apiCategoryId = useMemo(() => {
    if (activeSubCat !== 'all') return Number(activeSubCat);
    if (activeCat !== 'all')    return Number(activeCat);
    return null;
  }, [activeCat, activeSubCat]);

  const forumHome = useForumHome(apiCategoryId);
  const forumTopics = useForumTopics(selectedForum?.id || null);
  const allTopics = useAllForumTopics();

  function scrollTop() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function switchTopTab(id) {
    setTopTab(id);
    setView('list');
    setSelectedForum(null);
    scrollTop();
  }

  function openForum(forum) {
    setSelectedForum(forum);
    setView('threads');
    onForumDrill?.(forum);
    scrollTop();
  }

  if (view === 'threads' && selectedForum) {
    return (
      <ForumThreadView
        selectedForum={selectedForum}
        forumDetail={forumTopics.forumDetail}
        flairs={forumTopics.flairs}
        topics={forumTopics.topics}
        topicsLoading={forumTopics.loading}
        topicsLoadingMore={forumTopics.loadingMore}
        topicsError={forumTopics.error}
        topicsHasMore={forumTopics.hasMore}
        loadMoreTopics={forumTopics.loadMore}
        refreshTopics={forumTopics.refresh}
        onTopicPress={onTopicPress}
      />
    );
  }

  return (
    <div className={styles.screen} ref={scrollRef}>
      {/* Top tabs */}
      <div className={styles.topTabBar}>
        {TOP_TABS.map(({ id, label }) => (
          <div key={id}
            className={`${styles.topTab} ${topTab === id ? styles.topTabActive : ''}`}
            onClick={() => switchTopTab(id)}
          >
            {label}
          </div>
        ))}
      </div>

      {topTab === 'forums' && (
        <ForumListView
          categories={forumHome.categories}
          subCatMap={forumHome.subCatMap}
          forums={forumHome.forums}
          totalCount={forumHome.totalCount}
          homeLoading={forumHome.loading}
          forumsLoadingMore={forumHome.loadingMore}
          homeError={forumHome.error}
          forumsHasMore={forumHome.hasMore}
          loadMoreForums={forumHome.loadMore}
          refreshHome={forumHome.refresh}
          onForumPress={openForum}
        />
      )}

      {topTab === 'all-topics' && (
        <AllTopicsView
          allTopics={allTopics.topics}
          allTopicsTotal={allTopics.totalCount}
          allTopicsLoading={allTopics.loading}
          allTopicsLoadingMore={allTopics.loadingMore}
          allTopicsError={allTopics.error}
          allTopicsHasMore={allTopics.hasMore}
          loadMoreAllTopics={allTopics.loadMore}
          refreshAllTopics={allTopics.refresh}
          onTopicPress={onTopicPress}
        />
      )}

      <div className={styles.spacer}/>
    </div>
  );
}
```

- [ ] **Step 9: Trim ForumScreen.module.css**

Remove all CSS classes from `ForumScreen.module.css` that were moved to the sub-component CSS files. Keep only: `screen`, `topTabBar`, `topTab`, `topTabActive`, `spacer`, and any animation keyframes still needed by the orchestrator.

- [ ] **Step 10: Verify build**

```bash
cd indiaforums && npm run build
```
Expected: Build succeeds.

- [ ] **Step 11: Commit**

```bash
git add indiaforums/src/screens/forum/ indiaforums/src/screens/ForumScreen.jsx indiaforums/src/screens/ForumScreen.module.css
git commit -m "refactor: split ForumScreen into ForumListView, ForumThreadView, AllTopicsView"
```

---

## Task 7: Apply shared state components across screens

Replace duplicated loading/error/empty patterns in existing screens with the shared components from Task 4.

**Files:**
- Modify: `indiaforums/src/screens/ExploreScreen.jsx`
- Modify: `indiaforums/src/screens/VideoScreen.jsx`
- Modify: `indiaforums/src/screens/GalleryScreen.jsx`

Focus on ErrorState since it has the most duplication. LoadingState skeletons are screen-specific enough to leave in place where the layout differs significantly.

- [ ] **Step 1: Update ExploreScreen to use ErrorState**

In `indiaforums/src/screens/ExploreScreen.jsx`, add import:
```jsx
import ErrorState from '../components/ui/ErrorState';
```

Replace the error state block (lines 73-78):
```jsx
// Before:
{error && (
  <div className={styles.errorWrap}>
    <div className={styles.errorIcon}>!</div>
    <div className={styles.errorText}>{error}</div>
    <button className={styles.retryBtn} onClick={refresh}>Retry</button>
  </div>
)}

// After:
{error && <ErrorState message={error} onRetry={refresh} />}
```

- [ ] **Step 2: Update VideoScreen to use ErrorState**

In `indiaforums/src/screens/VideoScreen.jsx`, add import:
```jsx
import ErrorState from '../components/ui/ErrorState';
```

Replace the error state block (lines 180-185):
```jsx
// Before:
{error && (
  <div className={styles.errorWrap}>
    <div className={styles.errorIcon}>!</div>
    <div className={styles.errorText}>{error}</div>
    <button className={styles.retryBtn} onClick={refresh}>Retry</button>
  </div>
)}

// After:
{error && <ErrorState message={error} onRetry={refresh} />}
```

- [ ] **Step 3: Update GalleryScreen to use ErrorState**

In `indiaforums/src/screens/GalleryScreen.jsx`, add the ErrorState import and replace any inline error rendering with the shared component. Follow the same pattern as above.

- [ ] **Step 4: Verify build**

```bash
cd indiaforums && npm run build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add indiaforums/src/screens/ExploreScreen.jsx indiaforums/src/screens/VideoScreen.jsx indiaforums/src/screens/GalleryScreen.jsx
git commit -m "refactor: replace inline error states with shared ErrorState component"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run full build**

```bash
cd indiaforums && npm run build
```
Expected: Clean build with no errors.

- [ ] **Step 2: Run lint**

```bash
cd indiaforums && npm run lint
```
Expected: No new lint errors introduced.

- [ ] **Step 3: Verify file counts**

```bash
# Should show 11 fewer files than before (9 dead source + 2 root files)
find indiaforums/src -type f | wc -l
```

- [ ] **Step 4: Manual smoke test**

```bash
cd indiaforums && npm run dev
```
Open in browser and verify:
- Explore tab loads with stories, carousel, articles, galleries, forums
- News tab loads with category filtering and interleaved sections
- Forums tab loads with category tabs, search, forum list, thread drill-down, all-topics tab
- Gallery, Video, Celebrity screens accessible from stories strip
- Article detail view works from any article card
- Dark mode toggle works
- Navigation back buttons all work correctly
