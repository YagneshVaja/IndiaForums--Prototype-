import axios from 'axios';

const API_VERSION = 1;

const api = axios.create({
  baseURL: `/api/v${API_VERSION}`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Article/Video category mapping  (IDs from live API responses for articles & videos)
const CATEGORY_MAP = {
  5:  'TELEVISION',
  7:  'MOVIES',
  9:  'LIFESTYLE',
  15: 'SPORTS',
  19: 'DIGITAL',
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
    cat,
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

// ── Video category mapping  (verified against live API responses) ─────────────
const VIDEO_CAT_MAP = {
  5:  'tv',
  7:  'movies',
  9:  'lifestyle',
  15: 'sports',
  19: 'digital',
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

// ── Transform API video → UI video ───────────────────────────────────────────
function transformVideo(raw) {
  const cat = VIDEO_CAT_MAP[raw.defaultCategoryId] || 'tv';
  const catUpper = CATEGORY_MAP[raw.defaultCategoryId] || 'TELEVISION';
  return {
    id:        raw.mediaId,
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
export async function fetchVideos(page = 1, pageSize = 20) {
  const { data } = await api.get('/videos/list', {
    params: { page, pageSize },
  });

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

export default api;
