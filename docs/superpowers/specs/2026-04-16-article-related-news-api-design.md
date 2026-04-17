# Article Related News — API Integration Design

**Date:** 2026-04-16
**Status:** Approved

---

## Problem

The Related News section in `ArticleScreen` already renders, but it shows static mock data instead of real API data. Two bugs prevent real data from appearing:

1. `RelatedArticleDto` (returned by `/articles/{id}/details`) uses different field names than `ArticleDto` (returned by `/articles/list`). The current code calls `transformArticle()` on related articles, which reads the wrong fields — resulting in missing thumbnails and wrong categories.
2. The related card UI renders only a gradient + emoji placeholder; it never displays an `<img>` even when a valid thumbnail URL is available.

---

## Decision

- **Fallback behaviour:** Hide the Related News section entirely when the API returns zero related articles. Do not fall back to static mock data.
- **Transform approach:** Add a dedicated `transformRelatedArticle` function rather than modifying the shared `transformArticle`.

---

## RelatedArticleDto Shape (from API spec)

```
articleId          int     — article ID
headline           string  — article title
pageUrl            string  — SEO slug
mediaUrl           string  — thumbnail image URL
articleSectionName string  — human-readable category (e.g. "Movies", "Television")
publishDate        string  — ISO datetime
```

---

## Changes

### 1. `services/api.js`

**Add** `transformRelatedArticle(raw)`:

```js
function transformRelatedArticle(raw) {
  const sectionRaw = (raw.articleSectionName || '').toUpperCase();
  const SECTION_TO_CAT = {
    TELEVISION: 'TELEVISION', TV: 'TELEVISION', HINDI: 'TELEVISION',
    MOVIES: 'MOVIES', BOLLYWOOD: 'MOVIES',
    DIGITAL: 'DIGITAL', OTT: 'DIGITAL',
    LIFESTYLE: 'LIFESTYLE', FASHION: 'LIFESTYLE',
    SPORTS: 'SPORTS', CRICKET: 'SPORTS',
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

**Update** `transformArticleDetail`: replace
```js
relatedArticles: relatedArticles.map(a => transformArticle(a)),
```
with
```js
relatedArticles: relatedArticles.map(transformRelatedArticle),
```

---

### 2. `screens/ArticleScreen.jsx`

**Remove** the `getRelatedArticles` import (line 3).

**Update** the `related` memo: only use `enriched.relatedArticles`; if absent or empty, return `[]`.

```js
const related = useMemo(() =>
  enriched.relatedArticles?.length ? enriched.relatedArticles : [],
  [enriched.relatedArticles]
);
```

**Update** the `relCard` thumbnail render: show `<img>` when `a.thumbnail` is set, otherwise fall back to the existing gradient + emoji.

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

### 3. `screens/ArticleScreen.module.css`

Add `.relThumbImg` to make the image fill the thumbnail container:

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

## What Does Not Change

- The Related News section layout and card structure remain identical.
- The `sectionLabel`, card click handler, and all other content sections are untouched.
- No new navigation state, no new hooks, no new components.
- Static mock data file (`newsData.js`) is not deleted — only its import from `ArticleScreen` is removed.

---

## Success Criteria

- Related News cards show real thumbnail images from the API when available.
- When the API returns no related articles, the section is hidden.
- No regression in the article body, reactions, comments, or other sections.
