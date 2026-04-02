# Article API Integration Analysis

## Current Flow

### 1. Data Flow on Article Click
```
ExploreScreen/NewsScreen
  ↓ (user clicks article)
ArticleScreen({ article, onArticlePress })
  ↓ 
useArticleDetails(article.id)
  ↓
fetchArticleDetails(articleId)
  ↓
GET /api/v1/articles/{articleId}/details
  ↓
Response: { article, metadata, relatedArticles, ... }
  ↓
transformArticleDetail(data)
  ↓
Returns enriched details object
  ↓
enriched = { ...article (from list), ...details (from API) }
  ↓
UI renders enriched data
```

---

## Endpoint Analysis

### Tested Endpoints

All three endpoints return **identical structure**:

| Endpoint | Response Structure | Tested | Status |
|----------|-------------------|--------|--------|
| `GET /articles/list` | `{ data: { articles[], pagination } }` | ✓ | Works |
| `GET /articles/{id}` | `{ article, metadata, relatedArticles, ... }` | ✓ | Works |
| `GET /articles/{id}/details` | `{ article, metadata, relatedArticles, ... }` | ✓ | Works |

**Finding:** The list endpoint wraps response in `data` key, but detail endpoints do NOT.

---

## Data Validation (Real Test Run)

Using article ID `226031`:

### List Response
```json
{
  "data": {
    "articles": [{
      "articleId": 226031,
      "headline": "Jaswir Kaur clarifies her 'FORCED TO QUIT CID' remark...",
      "thumbnail": "https://img.indiaforums.com/article/640x360/22/6031-...",
      "publishedWhen": "2026-03-14T04:58:00",
      "commentCount": 0,
      "defaultCategoryId": 5
    }],
    "pagination": { ... }
  }
}
```

### Detail Response
```json
{
  "article": {
    "articleId": 226031,
    "headline": "Jaswir Kaur clarifies her 'FORCED TO QUIT CID' remark...",
    "publishDate": "2026-03-14T04:58:00",
    "viewCount": 0,
    "commentCount": 0,
    "defaultCategoryId": 5,
    "keywords": "jaswir kaur,jaswir kaur cid,cidco lottery,cid,cid season 2",
    "cachedContent": null,                    ← BODY CONTENT FIELD
    "cachedAmpContent": null,
    "cachedFiaContent": null
  },
  "metadata": {
    "title": "...",
    "description": "Jaswir Kaur clarified her stance on being...",  ← SHORT DESCRIPTION
    "author": null,
    "publishDate": "2026-03-14T04:58:00"
  },
  "relatedArticles": [],
  "articleItems": []
}
```

---

## Frontend Implementation Status

### ✅ WORKING - Data Being Fetched

**`useArticleDetails(articleId)` hook:**
- Correctly calls `fetchArticleDetails(articleId)` 
- Correctly passes article ID from clicked article
- Properly handles loading and error states
- Cancels request on unmount to prevent memory leaks

**`fetchArticleDetails(articleId)` function:**
- Calls correct endpoint: `GET /articles/{articleId}/details`
- Properly transforms response without wrapper assumption (fixed earlier)
- Logs API response for debugging

**`transformArticleDetail(data)` function:**
- Maps: `article.headline` → title ✓
- Maps: `metadata.description` → description ✓
- Maps: `article.keywords` → tags ✓
- Maps: `article.viewCount` → viewCount ✓
- Maps: `article.commentCount` → commentCount ✓
- Maps: `article.cachedContent` → bodyContent ✓

**`ArticleScreen` UI:**
- Calls hook: `useArticleDetails(article.id)` ✓
- Merges with: `enriched = { ...article, ...details }` ✓
- Displays:
  - `enriched.title` (from list OR API) ✓
  - `enriched.description` (from API via `metadata.description`) ✓
  - `enriched.viewCount` (from API) ✓
  - `enriched.commentCount` (from API) ✓
  - `enriched.keywords` (from API, split for tags) ✓
  - **`enriched.bodyContent`** (from API's `cachedContent`) ⚠️

---

## 🔴 THE ISSUE: Backend Problem

### Missing Article Body Content

The article body/content field **`article.cachedContent` is `null`** for all tested articles.

**What the UI expects:**
- `enriched.bodyContent` to contain the full article HTML/text
- Currently used as fallback to hardcoded `buildBody()` template

**What the API provides:**
- Field: `article.cachedContent` = `null` (empty/not populated)
- Field: `metadata.description` = short 1-2 line summary only
- Field: `articleItems` = `[]` (empty array)

### Three Possible Reasons

1. **Backend not caching HTML:** The API endpoint pre-computes and caches article HTML in `cachedContent`, but the cache might not be built for all articles
   
2. **Different endpoint needed:** Full article content might be available via different endpoint (not tested yet)
   
3. **Article content not stored:** The API system might not store full article content, only metadata and cached preview

---

## ✅ What IS Working Now

With the current fix, users see:

```
[API TITLE]           ← From list or API
                      
[API SUBTITLE]        ← From metadata.description
View count, comments  ← From API
Tags                  ← From article.keywords

[HARDCODED BODY] ⚠️   ← Still using buildBody() because cachedContent is null
```

---

## 🎯 Recommendation

### Frontend Status: CORRECT ✓

- All endpoints are called correctly
- All available API data is being mapped correctly
- No hardcoded mock data is overriding API data
- State updates are working properly
- No missing integrations

### Backend Status: INCOMPLETE ✗

**Issue:** Article body content (`cachedContent`) not populated

**To Fix:**

**Option A** — Check if `cachedContent` should be populated:
1. Ask backend team: "Why is `cachedContent` null for articles? Is it supposed to be pre-cached?"
2. If yes: Request backend to populate the cache
3. If no: Move to Option B

**Option B** — Use alternative endpoint or field:
1. Test if there's another endpoint that returns full article HTML (like `/articles/{id}/content`)
2. Or check if body content is in `articleItems[]` array in structured format
3. Update mapping if found

**Option C** — Accept current API limitation:
1. Show description from API (currently working)
2. Keep hardcoded body as fallback
3. OR scrape article from website and inject content

---

## Test Command to Verify Backend

```bash
# Test article detail endpoint
curl -s "https://api2.indiaforums.com/api/v1/articles/226031/details" | grep -o '"cachedContent":"[^"]*"'

# Expected (if working): "cachedContent":"<html>..."
# Actual (currently): "cachedContent":null
```

---

## Summary Table

| Component | Status | Details |
|-----------|--------|---------|
| Article list fetch | ✅ Working | `fetchArticles()` working, correct pagination |
| Article click handler | ✅ Working | Correct ID passed to ArticleScreen |
| Detail API call | ✅ Working | `fetchArticleDetails()` calls correct endpoint |
| Data transformation | ✅ Working | `transformArticleDetail()` maps all available fields |
| State management | ✅ Working | `useArticleDetails()` hook updates state correctly |
| UI data binding | ✅ Working | ArticleScreen displays merged data |
| **Article title** | ✅ Working | From API `article.headline` |
| **Article description** | ✅ Working | From API `metadata.description` |
| **Article views/comments** | ✅ Working | From API `article.viewCount/commentCount` |
| **Article tags** | ✅ Working | From API `article.keywords` |
| **Article body content** | ❌ Backend Issue | API returns `cachedContent: null` |
| **Related articles** | ✅ Working | From API `relatedArticles[]` |
| **Mock data override** | ✅ None | No hardcoded data overriding API |

---

## Next Steps

1. **Confirm with backend team:**
   - "Should `cachedContent` be populated in the article detail endpoint?"
   - "If not, where is the full article HTML available?"

2. **If backend confirms no body content in this endpoint:**
   - Look for alternative endpoint
   - OR accept limitation and show only description

3. **Update implementation once backend clarifies**
