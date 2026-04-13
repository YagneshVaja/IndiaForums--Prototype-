# Chapter Reader UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full top-to-bottom redesign of `ChapterReaderScreen` for an immersive, polished fanfiction reading experience.

**Architecture:** All changes are confined to `ChapterReaderScreen.jsx` and `ChapterReaderScreen.module.css`. The JSX gains a scroll-progress state, reading-time computation, a redesigned header with progress bar, a dramatic chapter hero block, richer prose body styles, a larger reactions strip, and a branded footer. No new components or files are created.

**Tech Stack:** React 19, CSS Modules, design tokens from `src/styles/tokens.css`

---

### Task 1: Add scroll-progress state and reading-time helper

**Files:**
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.jsx`

- [ ] **Step 1: Add `scrollProgress` state and scroll listener**

In `ChapterReaderScreen.jsx`, add a second `useState` and a second `useEffect` right after the existing ones (after line 84):

```jsx
const [scrollProgress, setScrollProgress] = useState(0);

useEffect(() => {
  const el = document.getElementById('chapter-scroll');
  if (!el) return;
  const onScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = el;
    const max = scrollHeight - clientHeight;
    setScrollProgress(max > 0 ? Math.round((scrollTop / max) * 100) : 0);
  };
  el.addEventListener('scroll', onScroll, { passive: true });
  return () => el.removeEventListener('scroll', onScroll);
}, [chapterId]);
```

- [ ] **Step 2: Add `readingTime` to the `view` memo**

Inside the `useMemo` that builds `view` (currently lines 86-110), add one field at the end before the closing `}`:

```js
readingTime: (() => {
  const text = (chapter.filteredChapterContent || chapter.chapterContent || '').replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
})(),
```

- [ ] **Step 3: Verify dev server compiles cleanly**

Run: `npm run dev` in `indiaforums/`
Expected: no compile errors, HMR hot reloads

---

### Task 2: Redesign the sticky header

**Files:**
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.jsx`
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.module.css`

- [ ] **Step 1: Replace the header JSX**

Replace the entire `{/* ── Reader header ─── */}` block (lines 121–157) with:

```jsx
{/* ── Reader header ─────────────────────────────────────────────────── */}
<div className={styles.readerHeader}>
  <div className={styles.headerTop}>
    <div className={styles.readerCrumb}>
      {view.storyThumb && (
        <img
          src={view.storyThumb}
          alt=""
          className={styles.crumbThumb}
          loading="lazy"
        />
      )}
      <div className={styles.crumbText}>
        {view.number != null && (
          <span className={styles.crumbChapter}>Chapter {view.number}</span>
        )}
        {view.authorId && (
          <span className={styles.crumbAuthor}>by User #{view.authorId}</span>
        )}
      </div>
    </div>

    {/* Font size toggle */}
    <div className={styles.fontToggle} role="group" aria-label="Reading size">
      {FONT_SIZES.map((f, i) => (
        <button
          key={f.id}
          className={`${styles.fontBtn} ${i === fontIdx ? styles.fontBtnActive : ''}`}
          onClick={() => setFontIdx(i)}
          style={{ fontSize: 10 + i * 2 }}
          aria-label={`Font size ${f.id}`}
        >
          A
        </button>
      ))}
    </div>
  </div>

  {/* Reading progress bar */}
  <div className={styles.progressTrack}>
    <div className={styles.progressFill} style={{ width: `${scrollProgress}%` }} />
  </div>
</div>
```

- [ ] **Step 2: Replace header CSS**

In `ChapterReaderScreen.module.css`, replace everything from `.readerHeader` through `.crumbDot { color: var(--text3); }` (lines 16–55) with:

```css
/* ── Reader header — sticky breadcrumb + font controls + progress ──── */
.readerHeader {
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.headerTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--content-px) var(--sp-2);
}

.readerCrumb {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.crumbThumb {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-xs);
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border);
}
.crumbText {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.crumbChapter {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  font-family: var(--font-display);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.crumbAuthor {
  font-size: 10px;
  color: var(--text3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Font toggle — 3 buttons, ascending sizes */
.fontToggle {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 3px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.fontBtn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: var(--radius-xs);
  color: var(--text2);
  font-family: var(--font-display);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}
.fontBtnActive {
  background: var(--card);
  color: var(--brand);
  box-shadow: var(--shadow-xs);
}

/* Reading progress bar */
.progressTrack {
  height: 3px;
  background: var(--border);
  width: 100%;
}
.progressFill {
  height: 100%;
  background: var(--brand);
  transition: width 0.1s linear;
  border-radius: 0 2px 2px 0;
}
```

- [ ] **Step 3: Verify hot reload — header looks cleaner with stacked crumb text and progress bar**

---

### Task 3: Redesign the chapter hero / title block

**Files:**
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.jsx`
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.module.css`

- [ ] **Step 1: Replace the title block JSX**

Replace the entire `{/* ── Title + meta ── */}` block (lines 159–188) with:

```jsx
{/* ── Chapter hero ────────────────────────────────────────────────────── */}
<div className={styles.chapterHero}>
  {view.number != null && (
    <div className={styles.chapterNumLabel}>Chapter {view.number}</div>
  )}
  <h1 className={styles.chapterTitle}>{view.title}</h1>

  <div className={styles.heroMeta}>
    {view.authorId && (
      <div className={styles.authorPill}>
        <div className={styles.authorAvatar}>U</div>
        <span>User #{view.authorId}</span>
      </div>
    )}
    {view.readingTime && (
      <span className={styles.readingTime}>{view.readingTime}</span>
    )}
  </div>

  {(view.membersOnly || view.mature || view.status) && (
    <div className={styles.flagRow}>
      {view.status      && <span className={styles.flagStatus}>{view.status}</span>}
      {view.membersOnly && <span className={styles.flagMembers}>🔒 Members only</span>}
      {view.mature      && <span className={styles.flagMature}>18+ Mature</span>}
    </div>
  )}

  <div className={styles.heroStats}>
    {view.published && <span className={styles.heroStat}>{formatDate(view.published)}</span>}
    <span className={styles.heroStat}>👁 {formatCount(view.views)}</span>
    <span className={styles.heroStat}>♥ {formatCount(view.likes)}</span>
    <span className={styles.heroStat}>💬 {formatCount(view.comments)}</span>
  </div>
</div>
```

- [ ] **Step 2: Replace title block CSS**

Replace the entire `/* ── Title block ── */` section (lines 90–127 in the current CSS) with:

```css
/* ── Chapter hero ──────────────────────────────────────────────────── */
.chapterHero {
  padding: var(--sp-6) var(--content-px) var(--sp-5);
  border-bottom: 1px solid var(--border);
  background: var(--card);
}

.chapterNumLabel {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--brand);
  margin-bottom: var(--sp-2);
}

.chapterTitle {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  color: var(--dark);
  line-height: 1.15;
  letter-spacing: -0.3px;
  margin: 0 0 var(--sp-4);
}

.heroMeta {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
  flex-wrap: wrap;
}

.authorPill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text2);
}
.authorAvatar {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--brand-light);
  color: var(--brand);
  font-size: 10px;
  font-weight: 800;
  font-family: var(--font-display);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.readingTime {
  font-size: 11px;
  color: var(--text3);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
}

/* Members-only / mature / status flags */
.flagRow {
  display: flex;
  gap: 6px;
  margin-bottom: var(--sp-3);
  flex-wrap: wrap;
}
.flagMembers,
.flagMature,
.flagStatus {
  font-size: 10px;
  font-weight: 700;
  padding: 3px var(--sp-2);
  border-radius: var(--radius-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.flagMembers { background: var(--brand-light);  color: var(--brand); }
.flagMature  { background: var(--red-surface);  color: var(--red);   }
.flagStatus  { background: var(--green-surface); color: var(--green); }

/* Compact stats row */
.heroStats {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.heroStat {
  font-size: 11px;
  color: var(--text3);
}
```

- [ ] **Step 3: Remove the old title-block CSS rules** — in `ChapterReaderScreen.module.css`, delete the blocks for `.title`, `.meta`, `.meta strong`, `.metaDot`, and `.metaStats`. These are replaced by the new classes added in Step 2 of this task. They appear in the current file around lines 96–127.

- [ ] **Step 4: Verify hero block renders correctly with chapter number label, large title, author pill, reading time, and stats row**

---

### Task 4: Redesign the body — prose typography and rich HTML content styles

**Files:**
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.module.css`

- [ ] **Step 1: Replace body CSS**

Replace the existing `/* ── Body ── */` section (lines 149–163 in current CSS) with:

```css
/* ── Body — prose reading area ──────────────────────────────────────── */
.body {
  padding: var(--sp-6) var(--content-px) var(--sp-8);
  font-family: var(--font-body);
  color: var(--text);
  background: var(--card);
}

/* Paragraphs */
.body p {
  margin: 0 0 var(--sp-5);
  line-height: 1.85;
}
.body p:last-child { margin-bottom: 0; }

/* Images — responsive, centred, rounded */
.body img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  margin: var(--sp-5) auto;
  box-shadow: var(--shadow-sm);
}

/* Headings inside HTML content */
.body h1, .body h2, .body h3, .body h4 {
  font-family: var(--font-display);
  font-weight: 800;
  color: var(--dark);
  line-height: 1.2;
  margin: var(--sp-6) 0 var(--sp-3);
}
.body h1 { font-size: 22px; }
.body h2 { font-size: 18px; }
.body h3, .body h4 { font-size: 15px; }

/* Blockquote */
.body blockquote {
  border-left: 3px solid var(--brand);
  margin: var(--sp-5) 0;
  padding: var(--sp-3) var(--sp-4);
  background: var(--brand-light);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-style: italic;
  color: var(--text2);
}

/* Horizontal rule — decorative scene break */
.body hr {
  border: none;
  text-align: center;
  margin: var(--sp-8) 0;
  color: var(--text3);
  font-size: 16px;
  letter-spacing: 8px;
}
.body hr::after {
  content: '✦ ✦ ✦';
}

/* Inline formatting */
.body strong, .body b { font-weight: 700; color: var(--dark); }
.body em, .body i     { font-style: italic; }
.body a               { color: var(--brand); text-decoration: underline; }

/* Empty state */
.empty {
  color: var(--text3);
  text-align: center;
  font-style: italic;
  padding: var(--sp-8) 0;
}
```

- [ ] **Step 2: Verify body renders with correct line-height, blockquotes styled blue, HR shows decorative ✦ ✦ ✦**

---

### Task 5: Redesign the reactions strip

**Files:**
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.module.css`

- [ ] **Step 1: Replace reactions CSS**

Replace the entire `/* ── Reactions strip ── */` section with:

```css
/* ── Reactions strip ────────────────────────────────────────────────── */
.reactionsBlock {
  padding: var(--sp-5) var(--content-px);
  border-top: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
}
.reactionsLabel {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 800;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: var(--sp-4);
}
.reactionsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-2);
}
.reactionPill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: var(--sp-3) var(--sp-2);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 11px;
  font-weight: 700;
  color: var(--text3);
  transition: all var(--duration-fast) var(--ease-out);
}
.reactionPillActive {
  background: var(--brand-light);
  border-color: var(--brand-border);
  color: var(--brand);
}
.reactionIcon { font-size: 20px; line-height: 1; }
.reactionCount {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 800;
}
```

- [ ] **Step 2: Verify reactions render as taller vertical pills with larger emoji icons**

---

### Task 6: Redesign the footer nav

**Files:**
- Modify: `indiaforums/src/screens/fanfiction/ChapterReaderScreen.module.css`

- [ ] **Step 1: Replace nav row and back-button CSS**

Replace the entire `/* ── Nav row ── */` section (from `.navRow` through `.spacer`) with:

```css
/* ── Footer nav ─────────────────────────────────────────────────────── */
.navRow {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--content-px) var(--sp-5);
  background: var(--card);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.backBtn {
  flex: 1;
  height: 44px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-md);
  border: none;
  background: var(--brand);
  color: var(--text-on-brand);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: opacity var(--duration-fast);
  box-shadow: var(--shadow-brand);
}
.backBtn:hover  { opacity: 0.9; }
.backBtn:active { opacity: 0.8; }

.navBtn {
  flex: 1;
  height: 44px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}
.navBtn:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand);
}
.navBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spacer { height: var(--sp-6); flex-shrink: 0; }
```

- [ ] **Step 2: Update back button text in JSX**

In `ChapterReaderScreen.jsx`, change the navRow JSX (currently just a back button) to:

```jsx
<div className={styles.navRow}>
  <button className={styles.backBtn} onClick={onBack}>← Back to Story</button>
</div>
```

- [ ] **Step 3: Final check — scroll through the full reader screen, verify all sections look polished**

Run: `npm run lint` in `indiaforums/`
Expected: no lint errors
