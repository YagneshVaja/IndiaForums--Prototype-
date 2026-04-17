import axios from 'axios';
import { getTokens, setTokens, clearAll } from './tokenStorage';

const API_VERSION = 1;

const api = axios.create({
  baseURL: `/api/v${API_VERSION}`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'api-key': 'Api2IndiaForums@2026',
  },
});

// ── Endpoints that don't need an Authorization header ────────────────────────
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/check-username',
  '/auth/check-email',
  '/auth/external-login',
];

// ── Request interceptor — attach access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const isPublic = PUBLIC_PATHS.some((p) => config.url?.includes(p));
  if (!isPublic) {
    const { accessToken } = getTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

// ── Response interceptor — handle 401 with silent refresh ────────────────────
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only intercept 401s, skip if already retried or if it's the refresh call itself
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    // If a refresh is already in flight, wait for it
    if (!refreshPromise) {
      const { refreshToken } = getTokens();
      if (!refreshToken) {
        clearAll();
        return Promise.reject(error);
      }

      refreshPromise = api
        .post('/auth/refresh-token', { refreshToken })
        .then((res) => {
          const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
          setTokens(newAccess, newRefresh);
          return newAccess;
        })
        .catch((refreshErr) => {
          clearAll();
          throw refreshErr;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const newAccessToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    } catch {
      return Promise.reject(error);
    }
  },
);

// ── Article category hierarchy (maps API defaultCategoryId to parent categories)
// Parent categories (top-level tabs)
export const ARTICLE_CATS = [
  { id: 'all',       label: 'ALL',       icon: 'grid',    subCatIds: null },
  { id: 'tv',        label: 'TV',        icon: 'tv',      subCatIds: [5, 6] },
  { id: 'movies',    label: 'MOVIES',    icon: 'film',    subCatIds: [7, 8, 16, 17, 18] },
  { id: 'digital',   label: 'DIGITAL',   icon: 'digital', subCatIds: [3, 9, 10, 19] },
  { id: 'lifestyle', label: 'LIFESTYLE', icon: 'heart',   subCatIds: [4, 11, 12, 13, 20] },
  { id: 'sports',    label: 'SPORTS',    icon: 'trophy',  subCatIds: [14, 15, 21] },
];

// Subcategories per parent (shown as second row chips)
export const ARTICLE_SUBCATS = {
  tv:        [{ id: 'all', label: 'ALL' }, { id: '5', label: 'HINDI' }, { id: '6', label: 'ENGLISH' }],
  movies:    [{ id: 'all', label: 'ALL' }, { id: '7', label: 'HINDI' }, { id: '8', label: 'ENGLISH' }, { id: '16', label: 'TAMIL' }, { id: '17', label: 'TELUGU' }, { id: '18', label: 'KANNADA' }],
  digital:   [{ id: 'all', label: 'ALL' }, { id: '9', label: 'HINDI' }, { id: '10', label: 'ENGLISH' }, { id: '19', label: 'KOREAN' }],
  lifestyle: [{ id: 'all', label: 'ALL' }, { id: '11', label: 'FASHION' }, { id: '12', label: 'HEALTH' }, { id: '13', label: 'MAKEUP' }, { id: '20', label: 'FOOD' }],
  sports:    [{ id: 'all', label: 'ALL' }, { id: '15', label: 'CRICKET' }, { id: '21', label: 'FOOTBALL' }],
};

// Reverse lookup: defaultCategoryId → parent category key
const SUBCAT_TO_PARENT = {};
ARTICLE_CATS.forEach(cat => {
  if (cat.subCatIds) cat.subCatIds.forEach(id => { SUBCAT_TO_PARENT[id] = cat.id; });
});

// Map defaultCategoryId → parent category name for transform
const CATEGORY_MAP = {
  5:  'TELEVISION', 6:  'TELEVISION',
  7:  'MOVIES',     8:  'MOVIES',     16: 'MOVIES', 17: 'MOVIES', 18: 'MOVIES',
  3:  'DIGITAL',    9:  'DIGITAL',    10: 'DIGITAL', 19: 'DIGITAL',
  4:  'LIFESTYLE',  11: 'LIFESTYLE',  12: 'LIFESTYLE', 13: 'LIFESTYLE', 20: 'LIFESTYLE',
  14: 'SPORTS',     15: 'SPORTS',     21: 'SPORTS',
};

const CATEGORY_GRADIENTS = {
  TELEVISION: 'linear-gradient(135deg,#4a1942,#7e22ce)',
  MOVIES:     'linear-gradient(135deg,#7f1d1d,#ef4444)',
  LIFESTYLE:  'linear-gradient(135deg,#831843,#db2777)',
  SPORTS:     'linear-gradient(135deg,#14532d,#16a34a)',
  DIGITAL:    'linear-gradient(135deg,#1e293b,#334155)',
};

const CATEGORY_EMOJIS = {
  TELEVISION: '📺',
  MOVIES:     '🎬',
  LIFESTYLE:  '✨',
  SPORTS:     '🏏',
  DIGITAL:    '🎞️',
};

// ── Pagination defaults ──────────────────────────────────────────────────────
// All paginated list endpoints use the same default page size. Centralised
// here so we can tune it once instead of touching every service. `pn` is the
// 1-based page number; `ps` is the page size. Spread `PAGINATION_DEFAULTS`
// before caller params so callers can override either field.
export const DEFAULT_PAGE      = 1;
export const DEFAULT_PAGE_SIZE = 24;
export const PAGINATION_DEFAULTS = { pn: DEFAULT_PAGE, ps: DEFAULT_PAGE_SIZE };

// ── Error message extraction ─────────────────────────────────────────────────
// API uses RFC 7807 problem details: { type, title, status, detail }
// Some endpoints also return { message } or plain strings.
export function extractApiError(err, fallback = 'Something went wrong. Please try again.') {
  // 429 takes precedence over the response body so the rate-limit message is
  // never masked by a generic "internal error" body.
  if (err?.response?.status === 429) {
    return formatRateLimitMessage(err);
  }
  const status = err?.response?.status;
  const d = err?.response?.data;
  // If the server returned HTML (e.g. a maintenance/under-construction page),
  // don't dump raw markup into the UI — show a clean status-based message.
  if (typeof d === 'string' && d.trimStart().startsWith('<')) {
    if (status === 503 || status === 502) return 'The server is temporarily unavailable. Please try again later.';
    if (status === 404) return 'This feature is not yet available on the server.';
    return 'The server returned an unexpected response. Please try again later.';
  }
  if (typeof d === 'string') return d;
  // ASP.NET Core ValidationProblemDetails puts per-field errors in d.errors:
  // { "Message": ["must be ≥ 10 chars"], "ForumId": ["must be > 0"] }
  // Flatten them into a readable string instead of swallowing them.
  if (d?.errors && typeof d.errors === 'object') {
    const msgs = Object.values(d.errors).flat().filter(Boolean);
    if (msgs.length) return msgs.join(' ');
  }
  return d?.message || d?.detail || d?.title || d?.error || fallback;
}

/**
 * Returns true if the axios error is a 429 (rate-limited).
 * Use this in screens that want to render a richer rate-limit treatment via
 * `<RateLimitNotice />` instead of the generic `<ErrorState />`.
 */
export function isRateLimitError(err) {
  return err?.response?.status === 429;
}

/**
 * Build a user-facing rate-limit message that respects the Retry-After header.
 * Per RFC 7231 the header is either an integer (seconds) or an HTTP-date.
 */
export function formatRateLimitMessage(err) {
  const retryAfter = parseRetryAfter(err);
  if (retryAfter == null) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (retryAfter < 60) {
    return `Too many requests. Please try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.`;
  }
  const mins = Math.ceil(retryAfter / 60);
  return `Too many requests. Please try again in about ${mins} minute${mins === 1 ? '' : 's'}.`;
}

/**
 * Parse the Retry-After header (seconds or HTTP-date) into a positive integer
 * number of seconds. Returns null if absent or unparseable.
 */
export function parseRetryAfter(err) {
  const headers = err?.response?.headers;
  const raw = headers?.['retry-after'] || headers?.['Retry-After'];
  if (!raw) return null;
  const asInt = Number(raw);
  if (Number.isFinite(asInt) && asInt >= 0) return Math.floor(asInt);
  const asDate = new Date(raw).getTime();
  if (Number.isFinite(asDate)) {
    return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  }
  return null;
}

// ── Time formatting ──────────────────────────────────────────────────────────
export function timeAgo(dateStr) {
  const now  = Date.now();
  const past = new Date(dateStr).getTime();
  const diff = now - past;

  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7)   return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Transform API article → UI article ───────────────────────────────────────
// Handles both /articles/list and /home/* response shapes:
//   time:      publishedWhen (/articles) | publishDate (/home)
//   thumbnail: thumbnail (/articles)     | thumbnailUrl (/home)
export function transformArticle(raw) {
  const cat = CATEGORY_MAP[raw.defaultCategoryId] || 'MOVIES';
  return {
    id:        raw.articleId,
    catId:     raw.defaultCategoryId,
    cat,
    parentCat: SUBCAT_TO_PARENT[raw.defaultCategoryId] || 'all',
    tag:       raw.articleAttributeName || '',
    breaking:  raw.priority > 0,
    title:     raw.headline,
    time:      timeAgo(raw.publishedWhen || raw.publishDate),
    bg:        CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.MOVIES,
    emoji:     CATEGORY_EMOJIS[cat] || '📰',
    thumbnail: raw.thumbnail || raw.thumbnailUrl || null,
    commentCount: raw.commentCount || 0,
  };
}

// ── Transform HomeArticleDto → UI article ────────────────────────────────────
// HomeArticleDto (used by /home/initial, /home/articles, /home/latest, etc.)
// has a lighter schema than ArticleDto used by /articles/list:
//   articleId, headline, pageUrl, mediaUrl, publishDate,
//   commentCount, sectionName, thumbnailUrl, updateChecksum
// No defaultCategoryId — category comes from sectionName string instead.
export function transformHomeArticle(raw) {
  // sectionName is the human-readable category (e.g. "Television", "Movies")
  const sectionRaw = (raw.sectionName || '').toUpperCase();
  // Map sectionName → internal cat key used by CATEGORY_GRADIENTS
  const SECTION_TO_CAT = {
    TELEVISION: 'TELEVISION', TV: 'TELEVISION', HINDI: 'TELEVISION',
    MOVIES:     'MOVIES',     BOLLYWOOD: 'MOVIES', BOX_OFFICE: 'MOVIES',
    DIGITAL:    'DIGITAL',    OTT: 'DIGITAL',
    LIFESTYLE:  'LIFESTYLE',  FASHION: 'LIFESTYLE', HEALTH: 'LIFESTYLE',
    SPORTS:     'SPORTS',     CRICKET: 'SPORTS',
    CELEBRITY:  'TELEVISION', // fallback for celeb content
  };
  const cat = SECTION_TO_CAT[sectionRaw] || 'MOVIES';
  return {
    id:          raw.articleId,
    catId:       null,
    cat,
    parentCat:   cat.toLowerCase(),
    tag:         raw.sectionName || '',
    breaking:    false,
    title:       raw.headline,
    time:        timeAgo(raw.publishDate || raw.publishedWhen),
    bg:          CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.MOVIES,
    emoji:       CATEGORY_EMOJIS[cat]    || '📰',
    thumbnail:   raw.thumbnailUrl || raw.thumbnail || null,
    commentCount: raw.commentCount || 0,
  };
}

// ── Transform RelatedArticleDto → UI article ─────────────────────────────────
// RelatedArticleDto has a lighter schema than ArticleDto:
//   articleId, headline, mediaUrl (thumbnail), articleSectionName, publishDate
function transformRelatedArticle(raw) {
  console.log('[API] relatedArticle raw fields:', JSON.stringify(raw));
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

// ── Transform BannerItemDto → UI banner ──────────────────────────────────────
// bannerUrl is the full hero image; thumbnailUrl is a smaller fallback.
// Derives visual fields (bg, emoji, tagColor) from sectionName so FeaturedCard
// renders correctly whether it shows an image or a gradient placeholder.
export function transformBanner(raw) {
  const sectionRaw = (raw.sectionName || '').toUpperCase();
  const BANNER_SECTION_MAP = {
    TELEVISION: 'TELEVISION', TV: 'TELEVISION', HINDI: 'TELEVISION',
    MOVIES:     'MOVIES',     BOLLYWOOD: 'MOVIES',
    DIGITAL:    'DIGITAL',    OTT: 'DIGITAL',
    LIFESTYLE:  'LIFESTYLE',  FASHION: 'LIFESTYLE',
    SPORTS:     'SPORTS',     CRICKET: 'SPORTS', IPL: 'SPORTS',
    CELEBRITY:  'TELEVISION',
  };
  const TAG_COLORS = {
    TELEVISION: 'rgba(124,58,237,0.9)',
    MOVIES:     'rgba(185,28,28,0.9)',
    DIGITAL:    'rgba(30,41,59,0.9)',
    LIFESTYLE:  'rgba(190,24,93,0.9)',
    SPORTS:     'rgba(22,101,52,0.9)',
  };
  const cat = BANNER_SECTION_MAP[sectionRaw] || 'MOVIES';
  return {
    id:          raw.id ?? raw.bannerId,
    title:       raw.headline,
    thumbnail:   raw.thumbnailUrl || null,
    pageUrl:     raw.pageUrl || '',
    time:        timeAgo(raw.publishDate),
    contentType: raw.contentType,
    tag:         raw.sectionName || '',
    tagColor:    TAG_COLORS[cat] || TAG_COLORS.MOVIES,
    bg:          CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.MOVIES,
    emoji:       CATEGORY_EMOJIS[cat]    || '📰',
    source:      'IndiaForums',
  };
}

// ── Transform detail response → enriched article ─────────────────────────────
function transformArticleDetail(data) {
  // Detail endpoint returns FLAT structure: { article, metadata, relatedArticles, ... }
  // NOT wrapped in { data: { ... } }
  const article = data?.article;
  const metadata = data?.metadata;
  const relatedArticles = data?.relatedArticles || [];

  console.log('[API] transformArticleDetail top-level keys:', Object.keys(data || {}));
  console.log('[API] relatedArticles raw:', JSON.stringify(relatedArticles));

  if (!article) {
    console.warn('[API] transformArticleDetail: no article field in response', { keys: Object.keys(data || {}) });
    return null;
  }

  const cat = CATEGORY_MAP[article.defaultCategoryId] || 'MOVIES';

  // Body content — the detail endpoint uses cachedContent for HTML body
  const bodyContent = article.cachedContent || '';

  // Description / subtitle — from metadata
  const description = metadata?.description || '';

  // Transform articleItems for structured body rendering
  const articleItems = (data?.articleItems || [])
    .sort((a, b) => a.orderNum - b.orderNum)
    .map(item => ({
      id:       item.articleItemId,
      type:     item.articleItemTypeId,
      order:    item.orderNum,
      title:    item.title || '',
      contents: item.contents || '',
      source:   item.source || '',
      mediaUrl: item.contentCodes || '',
      mediaTitle: item.mediaTitle || '',
    }));

  // Parse jsonData for related entities (shows, celebrities, platforms)
  let jsonEntities = [];
  try {
    const raw = article.jsonData || metadata?.jsonData || '';
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      jsonEntities = (parsed?.json || []).map(item => ({
        id:   item.id,
        name: item.name || '',
        slug: item.pu || '',
        code: item.uc || '',
        ct:   item.ct,
        tt:   item.tt,
      })).filter(item => item.name);
    }
  } catch (e) {
    console.warn('[API] Failed to parse jsonData:', e);
  }

  const result = {
    id:           article.articleId,
    cat,
    title:        article.headline || '',
    time:         timeAgo(article.publishDate),
    bg:           CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.MOVIES,
    emoji:        CATEGORY_EMOJIS[cat] || '📰',
    source:       metadata?.author || 'IF News Desk',
    description,
    bodyContent,
    articleItems,
    jsonEntities,
    tldr:         data?.tlDrDescription || '',
    keywords:     article.keywords || '',
    viewCount:    article.viewCount || 0,
    commentCount: article.commentCount || 0,
    authorId:     article.authorId,
    publishDate:  article.publishDate || metadata?.publishDate || '',
    modifiedDate: metadata?.modifiedDate || '',
    relatedArticles: relatedArticles.map(transformRelatedArticle),
  };

  // Only include these if the detail endpoint actually provides them,
  // so list-level data is preserved through merge
  if (article.articleAttribute) result.tag = article.articleAttribute;
  if (article.priority > 0) result.breaking = true;
  if (metadata?.imageUrl) result.thumbnail = metadata.imageUrl;

  return result;
}

// ── API methods ──────────────────────────────────────────────────────────────
export async function fetchArticles(page = 1, pageSize = 25) {
  const { data } = await api.get('/articles/list', {
    params: { page, pageSize },
  });

  // Handle both { data: { articles, pagination } } and { articles, pagination }
  const payload = data?.data || data;
  const rawArticles = payload?.articles || [];
  const rawPagination = payload?.pagination;

  console.log('[API] fetchArticles response:', { articlesCount: rawArticles.length, pagination: rawPagination });

  const pagination = rawPagination || {
    currentPage: page,
    pageSize,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return {
    articles: rawArticles.map(transformArticle),
    pagination,
  };
}

export async function fetchArticleDetails(articleId) {
  const { data } = await api.get(`/articles/${articleId}/details`);
  console.log('[API] fetchArticleDetails response keys:', Object.keys(data || {}));
  console.log('[API] article title:', data?.article?.headline);
  console.log('[API] description:', data?.metadata?.description?.substring(0, 80));
  return transformArticleDetail(data);
}

export async function fetchArticleBasic(articleId) {
  const { data } = await api.get(`/articles/${articleId}`);
  return transformArticleDetail(data);
}

// ── Home banners (Trending Now carousel) ────────────────────────────────────
export async function fetchBanners() {
  const { data } = await api.get('/home/banners');
  const banners = data?.banners || [];
  return banners.map(transformBanner);
}

// ── Video category mapping  (uses same hierarchy as articles) ─────────────────
const VIDEO_CAT_MAP = {
  5:  'tv',       6:  'tv',
  7:  'movies',   8:  'movies',   16: 'movies', 17: 'movies', 18: 'movies',
  3:  'digital',  9:  'digital',  10: 'digital', 19: 'digital',
  4:  'lifestyle', 11: 'lifestyle', 12: 'lifestyle', 13: 'lifestyle', 20: 'lifestyle',
  14: 'sports',   15: 'sports',   21: 'sports',
};

const VIDEO_CAT_LABELS = {
  tv:        'Television',
  movies:    'Movies',
  lifestyle: 'Lifestyle',
  sports:    'Sports',
  digital:   'Digital',
  celebrity: 'Celebrity',
  music:     'Music',
};

// Video category tabs + subcategory hierarchy (reuses ARTICLE_CATS structure)
export const VIDEO_CAT_TABS = [
  { id: 'all',       label: 'All',         contentId: null },
  { id: 'tv',        label: 'Television',  contentId: 1 },
  { id: 'movies',    label: 'Movies',      contentId: 2 },
  { id: 'digital',   label: 'Digital',     contentId: 3 },
  { id: 'celebrity', label: 'Celebrity',   contentId: null },
  { id: 'sports',    label: 'Sports',      contentId: null },
  { id: 'music',     label: 'Music',       contentId: null },
];

// ── Transform API video → UI video ───────────────────────────────────────────
function transformVideo(raw) {
  const cat = VIDEO_CAT_MAP[raw.defaultCategoryId] || 'tv';
  const catUpper = CATEGORY_MAP[raw.defaultCategoryId] || 'TELEVISION';
  return {
    id:        raw.mediaId,
    catId:     raw.defaultCategoryId,
    cat,
    catLabel:  VIDEO_CAT_LABELS[cat] || cat,
    title:     raw.mediaTitle,
    timeAgo:   timeAgo(raw.publishedWhen),
    duration:  raw.duration || null,
    bg:        CATEGORY_GRADIENTS[catUpper] || CATEGORY_GRADIENTS.TELEVISION,
    emoji:     CATEGORY_EMOJIS[catUpper] || '📺',
    thumbnail: raw.thumbnail || null,
    live:      false,
    featured:  raw.featured || false,
    views:     raw.viewCount > 0 ? formatViews(raw.viewCount) : null,
    viewCount: raw.viewCount || 0,
    commentCount: raw.commentCount || 0,
    description: raw.mediaDesc || '',
  };
}

function formatViews(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ── Transform video detail response ──────────────────────────────────────────
function transformVideoDetail(data) {
  const payload = data?.data || data;
  const media = payload?.media;
  if (!media) return null;

  const cat = VIDEO_CAT_MAP[media.defaultCategoryId] || 'tv';
  const catUpper = CATEGORY_MAP[media.defaultCategoryId] || 'TELEVISION';

  return {
    id:          media.mediaId,
    cat,
    catLabel:    VIDEO_CAT_LABELS[cat] || cat,
    title:       media.mediaTitle,
    description: media.mediaDesc || '',
    duration:    media.duration || null,
    thumbnail:   media.thumbnailUrl || null,
    contentId:   media.contentId || null,
    keywords:    media.keywords || '',
    viewCount:   media.viewCount || 0,
    commentCount: media.commentCount || 0,
    bg:          CATEGORY_GRADIENTS[catUpper] || CATEGORY_GRADIENTS.TELEVISION,
    emoji:       CATEGORY_EMOJIS[catUpper] || '📺',
    relatedVideos: (payload?.relatedMedias || []).map(transformVideo),
  };
}

// ── Gallery category mapping  (backend-provided IDs: 1=TV, 2=Movies, 3=Digital, 4=Lifestyle, 14=Sports)
const GALLERY_CAT_MAP = {
  1:  'tv',
  2:  'movies',
  3:  'digital',
  4:  'lifestyle',
  14: 'sports',
};

const GALLERY_CAT_LABELS = {
  'tv':        'TV',
  'movies':    'Movies',
  'digital':   'Digital',
  'lifestyle': 'Lifestyle',
  'sports':    'Sports',
};

// Gradients + emojis for gallery category fallback cards
const GALLERY_CAT_GRADIENTS = {
  'tv':        'linear-gradient(135deg,#4a1942,#7e22ce)',
  'movies':    'linear-gradient(135deg,#7f1d1d,#ef4444)',
  'digital':   'linear-gradient(135deg,#1e293b,#334155)',
  'lifestyle': 'linear-gradient(135deg,#831843,#db2777)',
  'sports':    'linear-gradient(135deg,#14532d,#16a34a)',
};

const GALLERY_CAT_EMOJIS = {
  'tv':        '📺',
  'movies':    '🎬',
  'digital':   '🎞️',
  'lifestyle': '✨',
  'sports':    '🏏',
};

const GALLERY_DEFAULT_BG = 'linear-gradient(135deg,#667eea,#764ba2)';

// ── Transform API gallery → UI gallery ───────────────────────────────────────
function transformGallery(raw) {
  // API list fields: mediaGalleryId, mediaGalleryName, pageUrl, featured,
  //   mediaCount, viewCount, thumbnailWidth, thumbnailHeight, thumbnailUrl
  // defaultCategoryId only present in detail response, not in list response
  const catId = raw.defaultCategoryId ?? raw.categoryId ?? null;
  const cat   = catId ? (GALLERY_CAT_MAP[catId] || null) : null;

  const vc = raw.viewCount || 0;
  return {
    id:              raw.mediaGalleryId ?? raw.galleryId ?? raw.id,
    title:           raw.mediaGalleryName ?? raw.title ?? raw.galleryTitle ?? '',
    pageUrl:         raw.pageUrl ?? null,
    cat,
    catLabel:        cat ? (GALLERY_CAT_LABELS[cat] || null) : null,
    count:           raw.mediaCount ?? raw.photoCount ?? raw.count ?? 0,
    emoji:           cat ? (GALLERY_CAT_EMOJIS[cat] || '📸') : '📸',
    bg:              cat ? (GALLERY_CAT_GRADIENTS[cat] || GALLERY_DEFAULT_BG) : GALLERY_DEFAULT_BG,
    time:            timeAgo(raw.publishedWhen ?? raw.publishDate ?? raw.createdAt ?? new Date().toISOString()),
    featured:        raw.featured ?? raw.isFeatured ?? false,
    thumbnail:       raw.thumbnailUrl ?? raw.thumbnail ?? null,
    thumbnailWidth:  raw.thumbnailWidth  ?? null,
    thumbnailHeight: raw.thumbnailHeight ?? null,
    viewCount:       vc,
    views:           vc > 0 ? formatViews(vc) : null,
    photos:          [],
  };
}

// ── Transform gallery detail response ────────────────────────────────────────
function transformGalleryDetail(data) {
  // Detail response: { data: { mediaGallery: {...}, photos: [...] } }
  const payload = data?.data ?? data;
  const raw     = payload?.mediaGallery ?? payload?.gallery ?? payload;

  if (!raw?.mediaGalleryId && !raw?.galleryId && !raw?.id) {
    console.warn('[API] transformGalleryDetail: no gallery in response', { keys: Object.keys(data || {}) });
    return null;
  }

  const base       = transformGallery(raw);
  const cat        = GALLERY_CAT_MAP[raw.defaultCategoryId ?? raw.categoryId] || null;
  const fallbackBg = cat ? (GALLERY_CAT_GRADIENTS[cat] || GALLERY_DEFAULT_BG) : GALLERY_DEFAULT_BG;

  const rawPhotos = payload?.photos ?? raw?.photos ?? [];

  const photos = rawPhotos.map((p, i) => {
    let tags = [];
    if (p.jsonData) {
      try {
        tags = (JSON.parse(p.jsonData)?.json || []).map(t => ({ id: t.id, name: t.name }));
      } catch (_) { /* malformed jsonData — skip */ }
    }
    return {
      id:       p.mediaId ?? p.photoId ?? p.imageId ?? i,
      imageUrl: p.thumbnail ?? p.thumbnailUrl ?? p.imageUrl ?? p.url ?? null,
      caption:  p.mediaTitle ?? p.mediaDesc ?? p.caption ?? '',
      tags,
      emoji:    '📸',
      bg:       fallbackBg,
    };
  });

  const description = raw.mediaGalleryDesc ?? raw.description ?? '';
  const keywords    = raw.keywords
    ? raw.keywords.split(',').map(k => k.trim()).filter(Boolean)
    : [];
  const relatedGalleries = (payload?.relatedMediaGalleries ?? []).map(transformGallery);

  // Use first photo's /media/ URL as the gallery hero thumbnail (works, unlike /gallery/ path)
  const heroThumbnail = photos[0]?.imageUrl ?? null;

  return {
    ...base,
    thumbnail: heroThumbnail,
    count: photos.length || base.count,
    description,
    keywords,
    relatedGalleries,
    photos,
  };
}

// ── Gallery API methods ───────────────────────────────────────────────────────
export async function fetchMediaGalleries(page = 1, pageSize = 25, categoryId = null) {
  // API param names: pageNumber (not page), contentType=1000 required, contentId for category filter
  const params = {
    pageNumber:    page,
    pageSize,
    publishedOnly: false,
    contentType:   1000,
  };
  if (categoryId) params.contentId = categoryId;

  const { data } = await api.get('/media-galleries/list', { params });

  // Response shape: { data: { mediaGalleries: [...] }, pagination: { ... } }
  // Note: pagination is at the TOP level, not inside data.data
  const payload      = data?.data ?? data;
  const rawGalleries = payload?.galleries ?? payload?.mediaGalleries ?? [];
  const rawPagination = data?.pagination ?? payload?.pagination;

  console.log('[API] fetchMediaGalleries:', {
    count: rawGalleries.length,
    page,
    totalPages: rawPagination?.totalPages,
    hasNextPage: rawPagination?.hasNextPage,
    firstItem: rawGalleries[0] ? {
      mediaGalleryId: rawGalleries[0].mediaGalleryId,
      mediaGalleryName: rawGalleries[0].mediaGalleryName,
      thumbnailUrl: rawGalleries[0].thumbnailUrl,
      mediaCount: rawGalleries[0].mediaCount,
      viewCount: rawGalleries[0].viewCount,
      featured: rawGalleries[0].featured,
    } : null,
  });

  const pagination = rawPagination || {
    currentPage: page,
    pageSize,
    totalPages: 1,
    totalItems: rawGalleries.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return { galleries: rawGalleries.map(transformGallery), pagination };
}

export async function fetchMediaGalleryDetails(id) {
  const { data } = await api.get(`/media-galleries/${id}/details`);
  console.log('[API] fetchMediaGalleryDetails:', { id, keys: Object.keys(data || {}) });
  return transformGalleryDetail(data);
}

export async function fetchMediaGalleryBasic(id) {
  const { data } = await api.get(`/media-galleries/${id}`);
  return transformGalleryDetail(data);
}

// ── Video API methods ────────────────────────────────────────────────────────
export async function fetchVideos(page = 1, pageSize = 20, contentId = null) {
  const params = { pageNumber: page, pageSize };
  if (contentId) {
    params.contentType = 1000;
    params.contentId = contentId;
  }
  const { data } = await api.get('/videos/list', { params });

  const payload = data?.data || data;
  const rawVideos = payload?.medias || [];

  return {
    videos: rawVideos.map(transformVideo),
    pagination: {
      currentPage: page,
      pageSize,
      hasNextPage: rawVideos.length >= pageSize,
    },
  };
}

export async function fetchVideoDetails(videoId) {
  const { data } = await api.get(`/videos/${videoId}/details`);
  console.log('[API] fetchVideoDetails response:', { videoId, hasMedia: !!data?.data?.media });
  return transformVideoDetail(data);
}

// ══════════════════════════════════════════════════════════════════════════════
// FORUMS API
// ══════════════════════════════════════════════════════════════════════════════

// ── Category color/gradient map (from API colorCode + fallbacks) ─────────────
const FORUM_CAT_GRADIENTS = {
  entertainment: 'linear-gradient(135deg,#4a1942,#7e22ce)',
  sports:        'linear-gradient(135deg,#14532d,#16a34a)',
  lifestyle:     'linear-gradient(135deg,#831843,#db2777)',
  general:       'linear-gradient(135deg,#1e3a5e,#2563eb)',
  finance:       'linear-gradient(135deg,#1e293b,#334155)',
  technology:    'linear-gradient(135deg,#0f172a,#3b82f6)',
  education:     'linear-gradient(135deg,#011933,#1d4ed8)',
  spirituality:  'linear-gradient(135deg,#d8aba6,#e11d48)',
  hobbies:       'linear-gradient(135deg,#01113b,#6366f1)',
  indiaforums:   'linear-gradient(135deg,#12115b,#3558F0)',
};

const FORUM_CAT_EMOJIS = {
  entertainment: '🌟',
  sports:        '🏏',
  lifestyle:     '✨',
  general:       '💬',
  finance:       '💰',
  technology:    '💻',
  education:     '📚',
  spirituality:  '🙏',
  hobbies:       '🎨',
  indiaforums:   '🏠',
};

function forumCatSlug(iconClass) {
  // Map API iconClass → local slug for gradient/emoji lookup
  const map = {
    'empty-star': 'entertainment',
    'sports':     'sports',
    'lifestyle':  'lifestyle',
    'chatting':   'general',
    'finance':    'finance',
    'technology': 'technology',
    'education':  'education',
    'pray':       'spirituality',
    'lives':      'hobbies',
    'forums':     'indiaforums',
  };
  return map[iconClass] || 'general';
}

// ── Transform category from API ──────────────────────────────────────────────
function transformForumCategory(raw) {
  const slug = forumCatSlug(raw.iconClass);
  return {
    id:          raw.categoryId,
    parentId:    raw.parentId,
    name:        raw.displayName || raw.categoryName?.trim() || '',
    slug,
    level:       raw.nodeLevel ?? 1,
    forumCount:  raw.forumCount ?? 0,
    color:       raw.colorCode || '#3558F0',
    icon:        raw.iconClass || '',
    bg:          FORUM_CAT_GRADIENTS[slug] || 'linear-gradient(135deg,#1e3a5e,#2563eb)',
    emoji:       FORUM_CAT_EMOJIS[slug] || '💬',
    pageUrl:     raw.pageUrl || '',
    hasThumbnail: raw.hasThumbnail ?? false,
  };
}

// ── Transform forum from API ─────────────────────────────────────────────────
function transformForum(raw, categoriesMap) {
  // Resolve category from the map if available
  const cat = categoriesMap?.[raw.categoryId] || null;
  const slug = cat?.slug || 'general';

  const rankDiff = (raw.previousRank || 0) - (raw.currentRank || 0);
  let rankDisplay = '';
  if (rankDiff > 0) rankDisplay = '+' + rankDiff;
  else if (rankDiff < 0) rankDisplay = String(rankDiff);

  return {
    id:           raw.forumId,
    name:         raw.forumName || '',
    description:  raw.forumDescription || raw.forumDesc || '',
    categoryId:   raw.categoryId ?? 0,
    categoryName: cat?.name || '',
    slug,
    topicCount:   raw.topicsCount ?? 0,
    postCount:    raw.postsCount ?? 0,
    followCount:  raw.followCount ?? 0,
    rank:         raw.currentRank ?? 0,
    prevRank:     raw.previousRank ?? 0,
    rankDisplay,
    bg:           cat?.bg || FORUM_CAT_GRADIENTS[slug] || 'linear-gradient(135deg,#1e3a5e,#2563eb)',
    emoji:        cat?.emoji || FORUM_CAT_EMOJIS[slug] || '💬',
    bannerUrl:    raw.bannerUrl || null,
    thumbnailUrl: raw.thumbnailUrl || null,
    pageUrl:      raw.pageUrl || '',
    locked:       raw.locked ?? false,
    hot:          (raw.topicsCount ?? 0) > 5000 || (raw.postsCount ?? 0) > 100000,
  };
}

// ── Transform poll attached to a topic ──────────────────────────────────────
// The backend returns poll data either as a `poll`/`pollData` object or
// embedded in `pollJson`. Normalise into:
//   { pollId, question, multiple, totalVotes, hasVoted, options: [{id,text,votes}] }
function transformPoll(rawPoll) {
  if (!rawPoll) return null;
  let p = rawPoll;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch (_) { return null; }
  }
  const pollId   = p.pollId ?? p.id ?? p.PollId;
  if (pollId == null) return null;
  const rawOpts  = p.options || p.pollOptions || p.choices || p.pollChoices || [];
  const options  = rawOpts.map((o) => ({
    id:    o.id ?? o.pollChoiceId ?? o.optionId,
    text:  o.text ?? o.choiceText ?? o.option ?? o.label ?? '',
    votes: o.votes ?? o.voteCount ?? o.count ?? 0,
  })).filter((o) => o.id != null);
  const totalVotes = options.reduce((s, o) => s + (o.votes || 0), 0);
  return {
    pollId,
    question:  p.question ?? p.title ?? p.subject ?? '',
    multiple:  p.multiple ?? p.allowMultiple ?? false,
    hasVoted:  p.hasVoted ?? p.userVoted ?? false,
    totalVotes,
    options,
  };
}

// ── Transform topic from API ─────────────────────────────────────────────────
function transformTopic(raw) {
  // Parse celebrity/entity tags from jsonData
  let tags = [];
  if (raw.jsonData) {
    try {
      tags = (JSON.parse(raw.jsonData)?.json || []).map(t => ({ id: t.id, name: t.name, pageUrl: t.pu }));
    } catch (_) { /* malformed */ }
  }

  return {
    id:           raw.topicId,
    forumId:      raw.forumId,
    forumName:    raw.forumName || '',
    title:        raw.subject || '',
    description:  raw.topicDesc || '',
    poster:       raw.startThreadUserName || 'Anonymous',
    lastBy:       raw.lastThreadUserName || '',
    time:         timeAgo(raw.startThreadDate || new Date().toISOString()),
    lastTime:     timeAgo(raw.lastThreadDate || new Date().toISOString()),
    replies:      raw.replyCount ?? 0,
    views:        raw.viewCount ?? 0,
    likes:        raw.likeCount ?? 0,
    locked:       raw.locked ?? false,
    pinned:       (raw.priority ?? 0) > 0,
    tags,
    flairId:      raw.flairId ?? 0,
    topicImage:   raw.topicImage || null,
    pageUrl:      raw.pageUrl || '',
    linkTypeId:   raw.linkTypeId ?? 0,
    linkTypeValue: raw.linkTypeValue || '',
    poll:         transformPoll(raw.poll || raw.pollData || raw.pollJson),
    forumThumbnail: raw.updateChecksum
      ? `https://img.indiaforums.com/forumavatar/200x200/0/${String(raw.forumId).padStart(3, '0')}.webp?uc=${raw.updateChecksum}`
      : null,
  };
}

// ── Strip edit-metadata appended by the IndiaForums backend ─────────────────
// The backend appends edit info at the end of the message HTML in various forms:
//   • "Username2025-07-01 06:09:13"   (same text node, no space)
//   • "<a>Username</a>2025-07-01 ..."  (username in anchor, datetime as text)
//   • "2024-11-03 18:58:28"            (datetime only, no username)
// Uses DOMParser to walk text nodes directly so whitespace/tag layout never
// fools the match. Regex fallback for non-browser environments.
function stripEditMeta(html) {
  if (!html) return { cleanHtml: html, metaBy: null, metaWhen: null };
  if (!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(html)) {
    return { cleanHtml: html, metaBy: null, metaWhen: null };
  }

  // ── DOMParser path (browser) ────────────────────────────────────────────
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const body = doc.body;

      // Collect all text nodes in document order
      const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let nd;
      while ((nd = walker.nextNode())) nodes.push(nd);

      // Find the last text node that has non-whitespace content
      let last = nodes.length - 1;
      while (last >= 0 && !nodes[last].textContent.trim()) last--;
      if (last < 0) return { cleanHtml: html, metaBy: null, metaWhen: null };

      const lastNode  = nodes[last];
      const lastTrim  = lastNode.textContent.trim();

      // The entire trimmed content of the last text node must be
      // ONLY an optional username followed by a datetime — nothing else.
      // Regex allows optional whitespace between username and datetime so
      // both "Aleyamma472025-07-01 06:09:13" and "Aleyamma47 2025-07-01 06:09:13" match.
      const NODE_RE = /^([A-Za-z0-9]\w{0,60})?\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*$/;
      const m = lastTrim.match(NODE_RE);
      if (!m) return { cleanHtml: html, metaBy: null, metaWhen: null };

      const metaWhen = m[2];
      let   metaBy   = m[1] || null;

      // Clear this text node (removes datetime + any concatenated username)
      lastNode.textContent = '';
      // Remove empty wrapper element if this node's parent only held the edit info
      const par = lastNode.parentElement;
      if (par && par !== body && !par.textContent.trim()) par.remove();

      // If username wasn't in this node, check the immediately preceding text node
      // (e.g. <a href="...">Username</a>DATE — username is in the <a> text node)
      if (!metaBy && last > 0) {
        let prev = last - 1;
        while (prev >= 0 && !nodes[prev].textContent.trim()) prev--;
        if (prev >= 0) {
          const prevTrim = nodes[prev].textContent.trim();
          if (/^[A-Za-z0-9]\w{1,60}$/.test(prevTrim)) {
            metaBy = prevTrim;
            const prevPar = nodes[prev].parentElement;
            if (prevPar && prevPar !== body && prevPar.textContent.trim() === prevTrim) {
              prevPar.remove();
            } else {
              nodes[prev].textContent = '';
            }
          }
        }
      }

      return { cleanHtml: body.innerHTML.trim(), metaBy, metaWhen };
    } catch (_) { /* fall through to regex */ }
  }

  // ── Regex fallback ──────────────────────────────────────────────────────
  // Works on the raw HTML string; less precise but handles environments
  // where DOMParser is unavailable.
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const SUFFIX = /(?:([A-Za-z0-9]\w{0,60})\s*)?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*$/;
  const m2 = plain.match(SUFFIX);
  if (!m2) return { cleanHtml: html, metaBy: null, metaWhen: null };

  const metaBy   = m2[1] || null;
  const metaWhen = m2[2];
  const dtIdx    = html.lastIndexOf(metaWhen);
  if (dtIdx === -1) return { cleanHtml: html, metaBy: null, metaWhen: null };

  let cut = html.slice(0, dtIdx);
  if (metaBy) {
    const ui = cut.lastIndexOf(metaBy);
    if (ui !== -1 && /^[\s<>/a-zA-Z0-9"'=;:.#?&/_-]*$/.test(cut.slice(ui + metaBy.length))) {
      cut = cut.slice(0, ui);
    }
  }

  return {
    cleanHtml: cut.replace(/<[^>]*$/, '').trimEnd(),
    metaBy,
    metaWhen,
  };
}

// ── Transform post from API ──────────────────────────────────────────────────
function transformPost(raw) {
  // Parse user badges
  let badges = [];
  if (raw.badgeJson) {
    try {
      const parsed = JSON.parse(raw.badgeJson);
      badges = (parsed?.json || []).slice(0, 3).map(b => ({
        id: b.id,
        name: b.nm,
        imageUrl: `https://img.indiaforums.com/badge/200x200/0/${b.lid}.webp${b.uc ? '?uc=' + b.uc : ''}`,
      }));
    } catch (_) { /* malformed */ }
  }

  // Strip backend-injected edit suffix from the message HTML, then fall back
  // to dedicated API fields if available.
  const rawMessage = raw.message ?? raw.body ?? raw.content ?? '';
  const { cleanHtml, metaBy, metaWhen } = stripEditMeta(rawMessage);

  // Edit-history indicators — backend field names vary across endpoints, so
  // probe the common ones defensively. Used to render a "(edited)" affordance
  // that opens the history viewer.
  const editedWhen = raw.editedWhen ?? raw.updatedWhen ?? raw.lastEditedWhen ?? raw.modifiedWhen ?? metaWhen ?? null;
  const editCount  = Number(raw.editCount ?? raw.editHistoryCount ?? 0);
  const isEdited   = Boolean(raw.isEdited ?? editedWhen ?? editCount > 0);
  const editedBy   = raw.editedByUserName ?? raw.editedBy ?? raw.lastEditedByUserName ?? metaBy ?? null;

  const rawJoinDate = raw.registerDate ?? raw.joinDate ?? raw.memberSince ?? null;
  const joinYear    = rawJoinDate ? new Date(rawJoinDate).getFullYear() : null;

  return {
    id:           raw.threadId ?? raw.postId ?? raw.id,
    topicId:      raw.topicId ?? 0,
    authorId:     raw.userId ?? raw.authorId ?? 0,
    author:       raw.userName ?? raw.authorName ?? 'Anonymous',
    realName:     raw.realName || '',
    rank:         raw.name || '',
    message:      cleanHtml,
    time:         timeAgo(raw.messageDate ?? raw.postedWhen ?? raw.createdAt ?? new Date().toISOString()),
    rawTime:      raw.messageDate ?? raw.postedWhen ?? raw.createdAt ?? '',
    likes:        raw.likeCount ?? 0,
    avatarUrl:    raw.avatarUrl ?? null,
    avatarAccent: raw.avatarAccent || null,
    countryCode:  raw.countryCode || '',
    badges,
    isOp:         raw.isOriginalPoster ?? false,
    wordCount:    raw.wordCount ?? 0,
    isEdited,
    editedWhen,
    editedBy,
    editCount,
    postCount:    raw.postCount ?? raw.postsCount ?? raw.totalMessages ?? null,
    joinYear,
    totalLikes:   raw.totalLikes ?? raw.totalLikesReceived ?? raw.likesReceived ?? null,
    // Reaction breakdown from backend: {"json":[{"lt":<reactionType>,"lc":<count>,"uid":<userId>,"un":"..."},...]}
    // Used to restore the current user's saved reaction without an extra API call.
    reactionJson: raw.jsonData ?? null,
  };
}

// ── Forum Categories (fetched once) ─────────────────────────────────────────
export async function fetchForumCategories() {
  const { data } = await api.get('/forums/home', { params: { pageSize: 1 } });

  const rawCats = data?.data?.categories || [];
  const allCats = rawCats.map(transformForumCategory);
  const topCats = allCats.filter(c => c.level === 1);
  const subCats = allCats.filter(c => c.level === 2);

  const subCatMap = {};
  subCats.forEach(sc => {
    if (!subCatMap[sc.parentId]) subCatMap[sc.parentId] = [];
    subCatMap[sc.parentId].push(sc);
  });

  return { categories: topCats, subCatMap, allCategories: allCats };
}

// ── Forum List (server-filtered by category, paginated) ─────────────────────
export async function fetchForumList(categoryId = null, pageNumber = 1, pageSize = 20) {
  const params = { pageNumber, pageSize };
  if (categoryId) params.categoryId = categoryId;

  const { data } = await api.get('/forums/home', { params });

  const rawForums = data?.data?.forums || [];
  const forums = rawForums.map(f => transformForum(f, {}));

  return {
    forums,
    totalForumCount: data?.data?.totalForumCount ?? 0,
    totalPages:      data?.data?.totalPages ?? 1,
    pageNumber:      data?.data?.pageNumber ?? pageNumber,
  };
}

// ── fetchForumHome (backwards compat — used by useForumHome) ────────────────
export async function fetchForumHome() {
  const cats = await fetchForumCategories();
  const list = await fetchForumList(null, 1, 20);
  return { ...cats, forums: list.forums };
}

// ── All Forum Topics (cross-forum feed) ─────────────────────────────────────
export async function fetchAllForumTopics(pageNumber = 1, pageSize = 20) {
  const { data } = await api.get('/forums/topics', {
    params: { pageNumber, pageSize },
  });

  const rawTopics = data?.topics || [];
  const totalCount = data?.totalCount ?? 0;

  console.log('[API] fetchAllForumTopics:', {
    count: rawTopics.length,
    totalCount,
    pageNumber,
  });

  return {
    topics:     rawTopics.map(transformTopic),
    totalCount,
    hasMore:    totalCount > pageNumber * pageSize,
  };
}

// ── Forum Topics ─────────────────────────────────────────────────────────────
export async function fetchForumTopics(forumId, pageNumber = 1, pageSize = 20, cursor = null, sortBy = 'latest') {
  const params = { pageNumber, pageSize };
  if (cursor) params.cursor = cursor;
  if (sortBy && sortBy !== 'latest') params.sortBy = sortBy;

  const { data } = await api.get(`/forums/${forumId}/topics`, { params });

  const rawTopics = data?.topics || [];
  const forumDetail = data?.forumDetail || null;

  // Parse flair definitions from forumDetail.flairJson
  let flairs = [];
  if (forumDetail?.flairJson) {
    try {
      const parsed = JSON.parse(forumDetail.flairJson);
      flairs = (parsed?.json || []).map(f => ({
        id:      f.id,
        name:    f.nm,
        bgColor: f.bgcolor,
        fgColor: f.fgcolor,
      }));
    } catch (_) { /* malformed JSON */ }
  }

  console.log('[API] fetchForumTopics:', {
    forumId,
    count: rawTopics.length,
    flairCount: flairs.length,
    hasMore: data?.hasMore,
    nextCursor: data?.nextCursor,
  });

  return {
    topics:      rawTopics.map(transformTopic),
    forumDetail: forumDetail ? transformForum(forumDetail, {}) : null,
    flairs,
    nextCursor:  data?.nextCursor ?? null,
    hasMore:     data?.hasMore ?? false,
  };
}

// ── Topic Posts ──────────────────────────────────────────────────────────────
export async function fetchTopicPosts(topicId, pageNumber = 1, pageSize = 20) {
  const params = { pageNumber, pageSize };
  const { data } = await api.get(`/forums/topics/${topicId}/posts`, { params });

  const rawPosts    = data?.posts || [];
  const topicDetail = data?.topicDetail || null;

  console.log('[API] fetchTopicPosts:', {
    topicId,
    count: rawPosts.length,
    hasMore: data?.hasMore,
  });

  const startAuthorId = topicDetail?.startAuthorId ?? null;
  const posts = rawPosts.map(raw => {
    const post = transformPost(raw);
    if (startAuthorId && post.authorId === startAuthorId) post.isOp = true;
    return post;
  });

  return {
    posts,
    topicDetail: topicDetail ? transformTopic(topicDetail) : null,
    nextCursor:  data?.nextCursor ?? null,
    hasMore:     data?.hasMore ?? false,
  };
}

// Forum write APIs (createTopic, replyToTopic, editPost, reactToThread,
// castPollVote, getThreadLikes, getPostEditHistory) now live in
// services/forumsApi.js. Import from there.

// ══════════════════════════════════════════════════════════════════════════════
// CELEBRITIES API
// ══════════════════════════════════════════════════════════════════════════════

// Celebrity category tabs
export const CELEB_CATEGORIES = [
  { id: 'bollywood',  label: 'Bollywood',  key: 'bollywoodCelebrities' },
  { id: 'television', label: 'Television', key: 'televisionCelebrities' },
  { id: 'creators',   label: 'Creators',   key: 'creators' },
];

// ── Transform API celebrity → UI celebrity ───────────────────────────────────
// Real API fields: personId, displayName, genderId, pageUrl, updateChecksum,
//   defaultCategoryId, rankCurrentWeek, rankLastWeek, imageUrl, shareUrl, shortDesc
function transformCelebrity(raw, category) {
  const rankDiff = (raw.rankLastWeek || 0) - (raw.rankCurrentWeek || 0);
  let trend = 'stable';
  if (rankDiff > 0) trend = 'up';
  else if (rankDiff < 0) trend = 'down';

  return {
    id:            raw.personId,
    name:          raw.displayName || '',
    shortDesc:     raw.shortDesc || '',
    thumbnail:     raw.imageUrl || null,
    pageUrl:       raw.pageUrl || '',
    shareUrl:      raw.shareUrl || '',
    category,
    rank:          raw.rankCurrentWeek || 0,
    prevRank:      raw.rankLastWeek || 0,
    trend,
    rankDiff:      Math.abs(rankDiff),
  };
}

// ── Transform biography response ────────────────────────────────────────────
// Real API: { person: {...}, isFan, rankStartDate, rankEndDate, personInfos: [...], socialMediaDetails: [...] }
function transformBiography(data) {
  const person = data?.person;
  if (!person) return null;

  // Extract structured info from personInfos array
  const infos = data?.personInfos || [];
  const infoMap = {};
  for (const info of infos) {
    const key = info.personInfoTypeName;
    if (!infoMap[key]) infoMap[key] = [];
    infoMap[key].push(info.contents);
  }

  // Build image URL from personId + updateChecksum
  const imageUrl = person.imageUrl
    || (person.hasThumbnail ? `https://img.indiaforums.com/person/320x240/${Math.floor(person.personId / 10000)}/${String(person.personId).padStart(4, '0')}-${person.pageUrl}.webp?c=${person.updateChecksum}` : null);

  return {
    id:             person.personId,
    name:           person.displayName || person.fullName || '',
    fullName:       person.fullName || '',
    shortDesc:      person.shortDesc || '',
    thumbnail:      imageUrl,
    pageUrl:        person.pageUrl || '',
    bioHtml:        person.biographyCachedContent || '',
    rank:           person.rankCurrentWeek,
    prevRank:       person.rankLastWeek,
    isFan:          data?.isFan ?? false,
    rankStartDate:  data?.rankStartDate || '',
    rankEndDate:    data?.rankEndDate || '',
    // Stats
    articleCount:   person.articleCount || 0,
    fanCount:       person.fanCount || 0,
    videoCount:     person.videoCount || 0,
    viewCount:      person.viewCount || 0,
    photoCount:     person.photoCount || 0,
    topicsCount:    person.topicsCount || 0,
    // Structured info from personInfos (keys match exact API personInfoTypeName)
    nicknames:      infoMap['NickName(s)'] || [],
    profession:     infoMap['Profession(s)'] || [],
    birthDate:      (infoMap['Date Of Birth'] || [])[0] || '',
    birthPlace:     (infoMap['Birthplace'] || [])[0] || '',
    zodiacSign:     (infoMap['Zodiac Sign'] || [])[0] || '',
    nationality:    (infoMap['Nationality'] || [])[0] || '',
    height:         (infoMap['Height (approx.)'] || [])[0] || '',
    weight:         (infoMap['Weight (approx.)'] || [])[0] || '',
    debut:          infoMap['Debut'] || [],
    hometown:       (infoMap['Hometown'] || [])[0] || '',
    education:      (infoMap['Educational Qualification'] || [])[0] || '',
    schools:        (infoMap['Schools'] || [])[0] || '',
    colleges:       infoMap['College(s)'] || [],
    maritalStatus:  (infoMap['Marital Status'] || [])[0] || '',
    spouse:         infoMap['Spouse(s)'] || [],
    children:       infoMap['Children'] || [],
    parents:        infoMap['Parents'] || [],
    siblings:       infoMap['Siblings'] || [],
    religion:       (infoMap['Religion'] || [])[0] || '',
    ethnicity:      (infoMap['Ethnicity'] || [])[0] || '',
    hobbies:        infoMap['Hobbies'] || [],
    awards:         infoMap['Awards/Honours'] || [],
    netWorth:       (infoMap['Net Worth'] || [])[0] || '',
    // Favorites
    favFilms:       infoMap['Film(s)'] || [],
    favActors:      infoMap['Actor(s)'] || [],
    favFood:        infoMap['Food'] || [],
    favSports:      infoMap['Sport(s)'] || [],
    favColors:      infoMap['Colour(s)'] || [],
    favDestination: infoMap['Destination'] || [],
    // All personInfos for additional data
    allInfos:       infoMap,
    // Social media
    facebook:       person.facebook || '',
    twitter:        person.twitter || '',
    instagram:      person.instagram || '',
    socialMedia:    data?.socialMediaDetails || [],
  };
}

// ── Transform fan item ──────────────────────────────────────────────────────
// Real API: { userId, userName, avatarType, avatarAccent, lastVisitedDate, privacy, updateChecksum, groupId, groupName }
function transformFan(raw) {
  return {
    id:           raw.userId,
    name:         raw.userName || 'Fan',
    avatarType:   raw.avatarType || 0,
    avatarAccent: raw.avatarAccent || '#3558F0',
    avatarUrl:    null,  // API doesn't provide avatar URL directly
    level:        raw.groupName || '',
    groupId:      raw.groupId || 0,
  };
}

// ── Celebrities list ────────────────────────────────────────────────────────
// Real API returns: { bollywoodCelebrities: [...], televisionCelebrities: [...], creators: [...],
//   celebrities: [...], rankStartDate, rankEndDate, totalCount, pageNumber, pageSize, totalPages, hasPreviousPage, hasNextPage }
export async function fetchCelebrities(page = 1, pageSize = 20) {
  const params = { pageNumber: page, pageSize };
  const { data } = await api.get('/celebrities', { params });

  // Build categorized result
  const categories = {};
  for (const cat of CELEB_CATEGORIES) {
    categories[cat.id] = (data?.[cat.key] || []).map(c => transformCelebrity(c, cat.id));
  }

  // Also include the flat "celebrities" list (all combined)
  const allCelebrities = data?.celebrities
    ? data.celebrities.map(c => transformCelebrity(c, 'all'))
    : [];

  const pagination = {
    currentPage:     data?.pageNumber ?? page,
    pageSize:        data?.pageSize ?? pageSize,
    totalPages:      data?.totalPages ?? 1,
    totalCount:      data?.totalCount ?? 0,
    hasNextPage:     data?.hasNextPage ?? false,
    hasPreviousPage: data?.hasPreviousPage ?? false,
  };

  return {
    categories,
    celebrities: allCelebrities,
    rankStartDate: data?.rankStartDate || '',
    rankEndDate:   data?.rankEndDate || '',
    pagination,
  };
}

// ── Celebrity biography ─────────────────────────────────────────────────────
export async function fetchCelebrityBiography(personId) {
  const { data } = await api.get(`/celebrities/${personId}/biography`);
  return transformBiography(data);
}

// ── Celebrity fans ──────────────────────────────────────────────────────────
export async function fetchCelebrityFans(personId, page = 1, pageSize = 20) {
  const params = { pageNumber: page, pageSize };
  const { data } = await api.get(`/celebrities/${personId}/fans`, { params });

  const rawFans = data?.fans || [];

  const pagination = {
    currentPage:     data?.pageNumber ?? page,
    pageSize:        data?.pageSize ?? pageSize,
    totalPages:      data?.totalPages ?? 1,
    totalCount:      data?.totalCount ?? 0,
    hasNextPage:     data?.hasNextPage ?? false,
    hasPreviousPage: data?.hasPreviousPage ?? false,
  };

  return {
    fans: rawFans.map(transformFan),
    pagination,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TAG / ENTITY CONTENT API
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchTagArticles(contentType, contentId, page = 1, pageSize = 20) {
  const { data } = await api.get('/articles/list', {
    params: { pageNumber: page, pageSize, contentType, contentId },
  });
  const payload = data?.data || data;
  const rawArticles = payload?.articles || [];
  return {
    articles: rawArticles.map(transformArticle),
    pagination: payload?.pagination || data?.pagination || {
      currentPage: page, pageSize, totalPages: 1, totalItems: 0,
      hasNextPage: false, hasPreviousPage: false,
    },
  };
}

export async function fetchTagVideos(contentType, contentId, page = 1, pageSize = 10) {
  const { data } = await api.get('/videos/list', {
    params: { pageNumber: page, pageSize, contentType, contentId },
  });
  const payload = data?.data || data;
  const rawVideos = payload?.medias || [];
  return {
    videos: rawVideos.map(transformVideo),
    pagination: {
      currentPage: page, pageSize,
      hasNextPage: rawVideos.length >= pageSize,
    },
  };
}

export async function fetchTagGalleries(contentType, contentId, page = 1, pageSize = 10) {
  const params = { pageNumber: page, pageSize, publishedOnly: false, contentType, contentId };
  const { data } = await api.get('/media-galleries/list', { params });
  const payload = data?.data || data;
  const rawGalleries = payload?.galleries || payload?.mediaGalleries || [];
  return {
    galleries: rawGalleries.map(transformGallery),
    pagination: data?.pagination || payload?.pagination || {
      currentPage: page, pageSize, totalPages: 1, totalItems: 0,
      hasNextPage: false, hasPreviousPage: false,
    },
  };
}

// ── Comments ────────────────────────────────────────────────────────────────
// Comment read/write APIs and the transformComment helper now live in
// services/commentsApi.js. Import from there.

export default api;
