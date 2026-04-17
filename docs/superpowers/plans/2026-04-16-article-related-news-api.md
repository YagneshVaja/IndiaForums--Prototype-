# Article Related News — API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Related News section in ArticleScreen to display real thumbnail images from the API and hide when the API returns no related articles.

**Architecture:** Add a dedicated `transformRelatedArticle` function in `services/api.js` that correctly maps `RelatedArticleDto` fields (`mediaUrl`, `articleSectionName`, `publishDate`). Update `ArticleScreen.jsx` to drop the static mock fallback and render `<img>` thumbnails in the related card. Add one CSS rule to make the image fill the card.

**Tech Stack:** React 19, CSS Modules, Axios (via `services/api.js`)

---

## Files

| Action | File | What changes |
|--------|------|--------------|
| Modify | `indiaforums/src/services/api.js` | Add `transformRelatedArticle`; use it in `transformArticleDetail` |
| Modify | `indiaforums/src/screens/ArticleScreen.jsx` | Remove static fallback; update `related` memo; render `<img>` in card |
| Modify | `indiaforums/src/screens/ArticleScreen.module.css` | Add `.relThumbImg` rule |

---

### Task 1: Add `transformRelatedArticle` to `api.js`

**Files:**
- Modify: `indiaforums/src/services/api.js`

`RelatedArticleDto` (from the API spec) has these fields:
- `articleId` — int
- `headline` — string
- `mediaUrl` — thumbnail image URL *(not `thumbnail` or `thumbnailUrl`)*
- `articleSectionName` — human-readable category string (e.g. `"Movies"`, `"Television"`)
- `publishDate` — ISO datetime string

- [ ] **Step 1: Add `transformRelatedArticle` function**

Open `indiaforums/src/services/api.js`. Insert this function immediately after the `transformHomeArticle` function (around line 294):

```js
// ── Transform RelatedArticleDto → UI article ──────────────────────────────
// RelatedArticleDto has a lighter schema than ArticleDto:
//   articleId, headline, mediaUrl (thumbnail), articleSectionName, publishDate
function transformRelatedArticle(raw) {
  const sectionRaw = (raw.articleSectionName || '').toUpperCase();
  const SECTION_TO_CAT = {
    TELEVISION: 'TELEVISION', TV: 'TELEVISION', HINDI: 'TELEVISION',
    MOVIES:     'MOVIES',     BOLLYWOOD: 'MOVIES',
    DIGITAL:    'DIGITAL',    OTT: 'DIGITAL',
    LIFESTYLE:  'LIFESTYLE',  FASHION: 'LIFESTYLE',
    SPORTS:     'SPORTS',     CRICKET: 'SPORTS',
  };
  const cat = SECTION_TO_CAT[sectionRaw] || 'MOVIES';
  return {
    id:        raw.articleId,
    title:     raw.headline || '',
    cat:       raw.articleSectionName || cat,
    time:      timeAgo(raw.publishDate),
    thumbnail: raw.mediaUrl || null,
    bg:        CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.MOVIES,
    emoji:     CATEGORY_EMOJIS[cat] || '📰',
    breaking:  false,
  };
}
```

- [ ] **Step 2: Wire it into `transformArticleDetail`**

In `transformArticleDetail` (around line 406), find:

```js
relatedArticles: relatedArticles.map(a => transformArticle(a)),
```

Replace with:

```js
relatedArticles: relatedArticles.map(transformRelatedArticle),
```

---

### Task 2: Update `ArticleScreen.jsx` — remove fallback, fix `related` memo, render thumbnail

**Files:**
- Modify: `indiaforums/src/screens/ArticleScreen.jsx`

- [ ] **Step 1: Remove the static fallback import**

At the top of `ArticleScreen.jsx`, remove line 3:

```js
import { getRelatedArticles } from '../data/newsData';
```

- [ ] **Step 2: Update the `related` memo**

Find the existing `related` memo (around line 168):

```js
const related = useMemo(() => {
  if (enriched.relatedArticles?.length) return enriched.relatedArticles.slice(0, 3);
  return getRelatedArticles(enriched);
}, [enriched]);
```

Replace it with:

```js
const related = useMemo(() =>
  enriched.relatedArticles?.length ? enriched.relatedArticles.slice(0, 3) : [],
  [enriched.relatedArticles]
);
```

- [ ] **Step 3: Update the related card to render a thumbnail image**

Find the `relCard` inner JSX (around line 467). The current `relThumb` block:

```jsx
<div className={styles.relThumb} style={{ background: a.bg }}>
  <span className={styles.relEmoji}>{a.emoji}</span>
  {a.breaking && <span className={styles.relBreaking}>BREAKING</span>}
</div>
```

Replace with:

```jsx
<div className={styles.relThumb} style={{ background: a.bg }}>
  {a.thumbnail
    ? <img src={a.thumbnail} alt="" className={styles.relThumbImg} loading="lazy" />
    : <span className={styles.relEmoji}>{a.emoji}</span>
  }
  {a.breaking && <span className={styles.relBreaking}>BREAKING</span>}
</div>
```

---

### Task 3: Add `.relThumbImg` CSS rule

**Files:**
- Modify: `indiaforums/src/screens/ArticleScreen.module.css`

- [ ] **Step 1: Add the image fill rule**

Open `indiaforums/src/screens/ArticleScreen.module.css`. Find the `.relEmoji` rule (around line 746). Insert the following immediately after it:

```css
.relThumbImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}
```

---

### Task 4: Verify in the dev server

- [ ] **Step 1: Start the dev server**

```bash
cd indiaforums
npm run dev
```

- [ ] **Step 2: Open an article**

Navigate to the News tab → tap any article. Scroll to the bottom past Comments.

- [ ] **Step 3: Check Related News**

Expected outcomes:
- If the API returns related articles: the Related News section appears with real thumbnail images filling each card
- If the API returns no related articles: the Related News section is completely hidden (no heading, no empty cards)
- Gradient + emoji still shows for any card whose `mediaUrl` is null/empty

- [ ] **Step 4: Confirm no regressions**

Check that article body, reactions, comments, People & Topics, and WhatsApp widget all still render correctly.
