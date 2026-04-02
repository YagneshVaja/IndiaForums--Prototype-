import axios from 'axios';

const API_VERSION = 1;

const api = axios.create({
  baseURL: `/api/v${API_VERSION}`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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

// ── Time formatting ──────────────────────────────────────────────────────────
function timeAgo(dateStr) {
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
function transformArticle(raw) {
  const cat = CATEGORY_MAP[raw.defaultCategoryId] || 'MOVIES';
  return {
    id:        raw.articleId,
    catId:     raw.defaultCategoryId,
    cat,
    parentCat: SUBCAT_TO_PARENT[raw.defaultCategoryId] || 'all',
    tag:       raw.articleAttributeName || '',
    breaking:  raw.priority > 0,
    title:     raw.headline,
    time:      timeAgo(raw.publishedWhen),
    bg:        CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.MOVIES,
    emoji:     CATEGORY_EMOJIS[cat] || '📰',
    thumbnail: raw.thumbnail || null,
    commentCount: raw.commentCount || 0,
  };
}

// ── Transform detail response → enriched article ─────────────────────────────
function transformArticleDetail(data) {
  // Detail endpoint returns FLAT structure: { article, metadata, relatedArticles, ... }
  // NOT wrapped in { data: { ... } }
  const article = data?.article;
  const metadata = data?.metadata;
  const relatedArticles = data?.relatedArticles || [];

  if (!article) {
    console.warn('[API] transformArticleDetail: no article field in response', { keys: Object.keys(data || {}) });
    return null;
  }

  const cat = CATEGORY_MAP[article.defaultCategoryId] || 'MOVIES';

  // Body content — the detail endpoint uses cachedContent for HTML body
  const bodyContent = article.cachedContent || '';

  // Description / subtitle — from metadata
  const description = metadata?.description || '';

  return {
    id:           article.articleId,
    cat,
    tag:          article.articleAttribute || '',
    breaking:     false,
    title:        article.headline || '',
    time:         timeAgo(article.publishDate),
    bg:           CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.MOVIES,
    emoji:        CATEGORY_EMOJIS[cat] || '📰',
    thumbnail:    null,  // Detail endpoint doesn't include thumbnail; use from list card
    source:       metadata?.author || 'IF News Desk',
    description,
    bodyContent,
    keywords:     article.keywords || '',
    viewCount:    article.viewCount || 0,
    commentCount: article.commentCount || 0,
    authorId:     article.authorId,
    relatedArticles: relatedArticles.map(a => transformArticle(a)),
  };
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
  const params = { pageNumber: page, pageSize, contentType: 1000 };
  if (contentId) params.contentId = contentId;
  const { data } = await api.get('/videos/list', { params });

  const payload = data?.data || data;
  const rawVideos = payload?.medias || payload?.videos || [];
  const rawPagination = payload?.pagination;

  console.log('[API] fetchVideos response:', { videosCount: rawVideos.length, pagination: rawPagination });

  const pagination = rawPagination || {
    currentPage: page,
    pageSize,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return {
    videos: rawVideos.map(transformVideo),
    pagination,
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
    topicImage:   raw.topicImage || null,
    pageUrl:      raw.pageUrl || '',
  };
}

// ── Transform post from API ──────────────────────────────────────────────────
function transformPost(raw) {
  return {
    id:         raw.threadId ?? raw.postId ?? raw.id,
    topicId:    raw.topicId ?? 0,
    authorId:   raw.authorId ?? 0,
    author:     raw.authorName ?? raw.userName ?? 'Anonymous',
    message:    raw.message ?? raw.body ?? raw.content ?? '',
    time:       timeAgo(raw.postedWhen ?? raw.createdAt ?? new Date().toISOString()),
    rawTime:    raw.postedWhen ?? raw.createdAt ?? '',
    likes:      raw.likeCount ?? 0,
    avatarUrl:  raw.avatarUrl ?? null,
    isOp:       raw.isOriginalPoster ?? false,
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

// ── Forum Topics ─────────────────────────────────────────────────────────────
export async function fetchForumTopics(forumId, pageNumber = 1, pageSize = 20, cursor = null) {
  const params = { pageNumber, pageSize };
  if (cursor) params.cursor = cursor;

  const { data } = await api.get(`/forums/${forumId}/topics`, { params });

  const rawTopics = data?.topics || [];
  const forumDetail = data?.forumDetail || null;

  console.log('[API] fetchForumTopics:', {
    forumId,
    count: rawTopics.length,
    hasMore: data?.hasMore,
    nextCursor: data?.nextCursor,
  });

  return {
    topics:      rawTopics.map(transformTopic),
    forumDetail: forumDetail ? transformForum(forumDetail, {}) : null,
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

  return {
    posts:       rawPosts.map(transformPost),
    topicDetail: topicDetail ? transformTopic(topicDetail) : null,
    nextCursor:  data?.nextCursor ?? null,
    hasMore:     data?.hasMore ?? false,
  };
}

// ── Create Topic (POST) ─────────────────────────────────────────────────────
export async function createForumTopic(forumId, subject, message) {
  const { data } = await api.post('/forums/topics', {
    forumId,
    subject,
    message,
  });

  console.log('[API] createForumTopic:', { forumId, subject: subject.substring(0, 40) });
  return data;
}

// ── Reply to Topic (POST) ───────────────────────────────────────────────────
export async function replyToTopic(topicId, message) {
  const { data } = await api.post(`/forums/topics/${topicId}/reply`, {
    message,
  });

  console.log('[API] replyToTopic:', { topicId });
  return data;
}

export default api;
