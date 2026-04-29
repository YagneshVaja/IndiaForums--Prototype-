import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { clearAll, getTokens, setTokens } from './authStorage';

// ---------------------------------------------------------------------------
// Base client — real IndiaForums API
// ---------------------------------------------------------------------------

export const apiClient = axios.create({
  baseURL: 'https://api2.indiaforums.com/api/v1',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'api-key': 'Api2IndiaForums@2026',
    'Origin': 'https://www.indiaforums.com',
    'Referer': 'https://www.indiaforums.com/',
  },
});

// ---------------------------------------------------------------------------
// Auth interceptors — mirror indiaforums/src/services/api.js
// ---------------------------------------------------------------------------

// Endpoints that don't need an Authorization header.
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/check-username',
  '/auth/check-email',
  '/auth/external-login',
];

apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  const isPublic = PUBLIC_PATHS.some((p) => url.includes(p));
  if (!isPublic) {
    const { accessToken } = getTokens();
    if (accessToken) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

// Temporary diagnostic for the /upload/* 415 issue. Logs the merged headers
// and body shape that actually go on the wire, with the bearer token
// redacted. Remove once uploads are confirmed working end-to-end.
apiClient.interceptors.request.use((config) => {
  if ((config.url || '').startsWith('/upload/')) {
    const safeHeaders = { ...(config.headers as Record<string, unknown> | undefined) };
    if (safeHeaders.Authorization) safeHeaders.Authorization = '<redacted>';
    const data = config.data;
    console.log('[upload-debug] outgoing', {
      url:      config.url,
      method:   config.method,
      headers:  safeHeaders,
      bodyType: typeof data,
      bodyLen:  typeof data === 'string' ? data.length : JSON.stringify(data ?? '').length,
    });
  }
  return config;
});

// Single-flight refresh — all concurrent 401s wait on the same promise.
let refreshPromise: Promise<string> | null = null;

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      (original.url ?? '').includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      const { refreshToken: rt } = getTokens();
      if (!rt) {
        await clearAll();
        return Promise.reject(error);
      }

      refreshPromise = apiClient
        .post<{ accessToken: string; refreshToken: string }>('/auth/refresh-token', {
          refreshToken: rt,
        })
        .then(async (res) => {
          const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
          await setTokens(newAccess, newRefresh);
          return newAccess;
        })
        .catch(async (refreshErr) => {
          await clearAll();
          throw refreshErr;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const newAccessToken = await refreshPromise;
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`;
      return apiClient(original);
    } catch {
      return Promise.reject(error);
    }
  },
);

// ---------------------------------------------------------------------------
// Error message extraction — same shape as prototype's extractApiError
// ---------------------------------------------------------------------------

export function extractApiError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  const status = anyErr?.response?.status;
  const d = anyErr?.response?.data;

  // No response means the request never reached the server: offline, DNS
  // failure, or request cancelled. Axios sets `code === 'ERR_NETWORK'` for
  // offline; React Native additionally surfaces `message === 'Network Error'`.
  if (!anyErr?.response && (
    anyErr?.code === 'ERR_NETWORK' ||
    anyErr?.code === 'ECONNABORTED' ||
    anyErr?.message === 'Network Error'
  )) {
    return 'No internet connection. Check your network and try again.';
  }

  if (status === 429) {
    const retryAfter = parseInt(anyErr?.response?.headers?.['retry-after'] ?? '', 10);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return retryAfter < 60
        ? `Too many requests. Please try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.`
        : 'Too many requests. Please wait a moment and try again.';
    }
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (typeof d === 'string' && d.trimStart().startsWith('<')) {
    if (status === 503 || status === 502) return 'The server is temporarily unavailable. Please try again later.';
    if (status === 404) return 'This feature is not yet available on the server.';
    return 'The server returned an unexpected response. Please try again later.';
  }
  if (typeof d === 'string') return d;

  if (d?.errors && typeof d.errors === 'object') {
    const msgs = Object.values(d.errors).flat().filter(Boolean) as string[];
    if (msgs.length) return msgs.join(' ');
  }
  return d?.message || d?.detail || d?.title || d?.error || fallback;
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

// sectionName (API) → display category label
const SECTION_TO_CAT: Record<string, string> = {
  TELEVISION: 'Television', TV: 'Television', HINDI: 'Television',
  MOVIES: 'Movies', BOLLYWOOD: 'Movies', BOX_OFFICE: 'Movies',
  DIGITAL: 'Digital', OTT: 'Digital',
  LIFESTYLE: 'Lifestyle', FASHION: 'Lifestyle', HEALTH: 'Lifestyle',
  SPORTS: 'Sports', CRICKET: 'Sports', IPL: 'Sports',
  CELEBRITY: 'Television',
};

// Article defaultCategoryId → display category label.
// Matches the hierarchy exposed by /articles/list.
const ARTICLE_CAT_MAP: Record<number, string> = {
  5: 'Television',  6: 'Television',
  7: 'Movies',      8: 'Movies',     16: 'Movies', 17: 'Movies', 18: 'Movies',
  3: 'Digital',     9: 'Digital',    10: 'Digital', 19: 'Digital',
  4: 'Lifestyle',  11: 'Lifestyle',  12: 'Lifestyle', 13: 'Lifestyle', 20: 'Lifestyle',
  14: 'Sports',    15: 'Sports',     21: 'Sports',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  Television: '📺',
  Movies: '🎬',
  Lifestyle: '✨',
  Sports: '🏏',
  Digital: '🎞️',
};

// ---------------------------------------------------------------------------
// Video category maps (kept separate from article maps — different keys)
// ---------------------------------------------------------------------------

const VIDEO_CAT_MAP: Record<number, string> = {
  5:  'tv',       6:  'tv',
  7:  'movies',   8:  'movies',   16: 'movies', 17: 'movies', 18: 'movies',
  3:  'digital',  9:  'digital',  10: 'digital', 19: 'digital',
  4:  'lifestyle', 11: 'lifestyle', 12: 'lifestyle', 13: 'lifestyle', 20: 'lifestyle',
  14: 'sports',   15: 'sports',   21: 'sports',
};

const VIDEO_CAT_LABELS: Record<string, string> = {
  tv:        'Television',
  movies:    'Movies',
  lifestyle: 'Lifestyle',
  sports:    'Sports',
  digital:   'Digital',
  celebrity: 'Celebrity',
  music:     'Music',
};

const VIDEO_CAT_BG: Record<string, string> = {
  tv:        '#4a1942',
  movies:    '#7f1d1d',
  digital:   '#1e293b',
  lifestyle: '#831843',
  sports:    '#14532d',
  celebrity: '#312e81',
  music:     '#1e1b4b',
};

const VIDEO_CAT_EMOJI: Record<string, string> = {
  tv:        '📺',
  movies:    '🎬',
  lifestyle: '✨',
  sports:    '🏏',
  digital:   '🎞️',
  celebrity: '👑',
  music:     '🎶',
};

export const VIDEO_CAT_TABS: VideoCatTab[] = [
  { id: 'all',       label: 'All',        contentId: null },
  { id: 'tv',        label: 'Television', contentId: 1 },
  { id: 'movies',    label: 'Movies',     contentId: 2 },
  { id: 'digital',   label: 'Digital',    contentId: 3 },
  { id: 'celebrity', label: 'Celebrity',  contentId: null },
  { id: 'sports',    label: 'Sports',     contentId: null },
  { id: 'music',     label: 'Music',      contentId: null },
];

export const VIDEO_CAT_ACCENT: Record<string, { bg: string; text: string; bar: string }> = {
  all:       { bg: '#EEF2FF', text: '#3558F0', bar: '#3558F0' },
  tv:        { bg: '#EEF2FF', text: '#3558F0', bar: '#3558F0' },
  movies:    { bg: '#FFF7ED', text: '#C2410C', bar: '#EA580C' },
  digital:   { bg: '#F0FDF4', text: '#15803D', bar: '#16A34A' },
  celebrity: { bg: '#FDF4FF', text: '#7E22CE', bar: '#9333EA' },
  sports:    { bg: '#FFFBEB', text: '#B45309', bar: '#D97706' },
  music:     { bg: '#FFF1F2', text: '#BE123C', bar: '#E11D48' },
};

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformVideo(raw: any): Video {
  const catId = raw.defaultCategoryId;
  const cat = VIDEO_CAT_MAP[catId] || 'tv';
  return {
    id:           String(raw.mediaId),
    catId:        catId,
    cat,
    catLabel:     VIDEO_CAT_LABELS[cat] || cat,
    title:        raw.mediaTitle || '',
    timeAgo:      timeAgo(raw.publishedWhen),
    duration:     raw.duration || null,
    bg:           VIDEO_CAT_BG[cat] || VIDEO_CAT_BG.tv,
    emoji:        VIDEO_CAT_EMOJI[cat] || '📺',
    thumbnail:    raw.thumbnail || null,
    live:         false,
    featured:     !!raw.featured,
    views:        raw.viewCount > 0 ? formatViews(raw.viewCount) : null,
    viewCount:    raw.viewCount || 0,
    commentCount: raw.commentCount || 0,
    description:  raw.mediaDesc || '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformVideoDetail(data: any): VideoDetail | null {
  const payload = data?.data || data;
  const media = payload?.media;
  if (!media) return null;

  const cat = VIDEO_CAT_MAP[media.defaultCategoryId] || 'tv';

  return {
    id:            String(media.mediaId),
    catId:         media.defaultCategoryId,
    cat,
    catLabel:      VIDEO_CAT_LABELS[cat] || cat,
    title:         media.mediaTitle || '',
    timeAgo:       timeAgo(media.publishedWhen),
    duration:      media.duration || null,
    bg:            VIDEO_CAT_BG[cat] || VIDEO_CAT_BG.tv,
    emoji:         VIDEO_CAT_EMOJI[cat] || '📺',
    thumbnail:     media.thumbnailUrl || null,
    live:          false,
    featured:      !!media.featured,
    views:         media.viewCount > 0 ? formatViews(media.viewCount) : null,
    viewCount:     media.viewCount || 0,
    commentCount:  media.commentCount || 0,
    description:   media.mediaDesc || '',
    contentId:     media.contentId || null,
    keywords:      media.keywords || '',
    relatedVideos: (payload?.relatedMedias || []).map(transformVideo),
  };
}

// chip label (HomeScreen) → API articleType param
const CHIP_TO_API_TYPE: Record<string, string> = {
  all: 'all',
  television: 'tv',
  movies: 'movies',
  digital: 'digital',
  lifestyle: 'lifestyle',
  sports: 'sports',
};

export function chipToArticleType(chip?: string): string {
  if (!chip) return 'all';
  return CHIP_TO_API_TYPE[chip.toLowerCase()] ?? 'all';
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  if (isNaN(past)) return '';
  const diff = now - past;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  thumbnailUrl: string;
  category: string;
  publishedAt: string;
  timeAgo: string;
  authorName: string;
  emoji?: string;
  tag?: string;
  breaking?: boolean;
  // Only populated by /articles/list (ArticleDto). Null for /home/articles
  // responses, which use a lighter HomeArticleDto without defaultCategoryId.
  catId?: number | null;
}

export interface ArticleItem {
  id: string;
  type: number;
  title?: string;
  contents?: string;
  mediaUrl?: string;
  mediaTitle?: string;
  source?: string;
  // Partitions listicle/live-news bodies:
  //   subItem=false → intro/outro blocks
  //   subItem=true  → a listicle entry or a live-news update card
  subItem?: boolean;
  // ISO timestamp surfaced for live-news (articleTypeId 8) update timestamps
  dateAdded?: string;
}

export interface JsonEntity {
  id: string;
  name: string;
  type?: string;
}

export interface ArticleDetail extends Article {
  body: string;
  authorAvatarUrl: string;
  subtitle: string;
  viewCount: number;
  commentCount: number;
  tldr: string;
  readTime: string;
  relatedArticles: Article[];
  articleItems: ArticleItem[];
  jsonEntities: JsonEntity[];
  // 1 Normal · 2 Listicle Num Asc · 6 Listicle · 7 Listicle Num Desc · 8 Live News
  articleTypeId?: number;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  articleId: string;
  articleSlug: string;
  category?: string;
  source?: string;
  timeAgo?: string;
}

export type CelebCategoryId = 'bollywood' | 'television' | 'creators' | 'all';

export interface Celebrity {
  id: string;
  name: string;
  shortDesc: string;
  thumbnail: string | null;
  pageUrl: string;
  shareUrl: string;
  category: CelebCategoryId;
  rank: number;
  prevRank: number;
  trend: 'up' | 'down' | 'stable';
  rankDiff: number;
}

export interface CelebPagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CelebritiesPayload {
  categories: {
    bollywood: Celebrity[];
    television: Celebrity[];
    creators: Celebrity[];
  };
  celebrities: Celebrity[];
  rankStartDate: string;
  rankEndDate: string;
  pagination: CelebPagination;
}

export interface CelebrityBiography {
  id: string;
  name: string;
  fullName: string;
  shortDesc: string;
  thumbnail: string | null;
  pageUrl: string;
  bioHtml: string;
  rank: number;
  prevRank: number;
  isFan: boolean;
  rankStartDate: string;
  rankEndDate: string;
  // Stats
  articleCount: number;
  fanCount: number;
  videoCount: number;
  viewCount: number;
  photoCount: number;
  topicsCount: number;
  // Structured personInfos
  nicknames: string[];
  profession: string[];
  birthDate: string;
  birthPlace: string;
  zodiacSign: string;
  nationality: string;
  height: string;
  weight: string;
  debut: string[];
  hometown: string;
  education: string;
  maritalStatus: string;
  spouse: string[];
  children: string[];
  parents: string[];
  siblings: string[];
  religion: string;
  netWorth: string;
  favFilms: string[];
  favActors: string[];
  favFood: string[];
  hobbies: string[];
  awards: string[];
  // Social
  facebook: string;
  twitter: string;
  instagram: string;
}

export interface CelebrityFan {
  id: string;
  name: string;
  avatarAccent: string;
  level: string;
  groupId: number;
}

export interface CelebrityFansPayload {
  fans: CelebrityFan[];
  pagination: CelebPagination;
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export interface Video {
  id: string;
  catId: number;
  cat: string;
  catLabel: string;
  title: string;
  timeAgo: string;
  duration: string | null;
  bg: string;
  emoji: string;
  thumbnail: string | null;
  live: boolean;
  featured: boolean;
  views: string | null;
  viewCount: number;
  commentCount: number;
  description: string;
}

export interface VideoDetail extends Video {
  contentId: string | null; // YouTube video ID
  keywords: string;
  relatedVideos: Video[];
}

export interface VideosPage {
  videos: Video[];
  pagination: {
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
  };
}

export interface VideoCatTab {
  id: string;
  label: string;
  contentId: number | null;
}

// ---------------------------------------------------------------------------
// Forums
// ---------------------------------------------------------------------------

export interface ForumCategory {
  id: number;
  parentId: number;
  name: string;
  slug: string;
  level: number;
  forumCount: number;
  color: string;
  bg: string;
  emoji: string;
}

export interface Forum {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  slug: string;
  topicCount: number;
  postCount: number;
  followCount: number;
  rank: number;
  prevRank: number;
  rankDisplay: string;
  bg: string;
  emoji: string;
  bannerUrl: string | null;
  thumbnailUrl: string | null;
  locked: boolean;
  hot: boolean;
  priorityPosts: number;
  editPosts: number;
  deletePosts: number;
}

export interface ForumFlair {
  id: number;
  name: string;
  bgColor: string;
  fgColor: string;
}

export interface TopicTag {
  id: number;
  name: string;
  pageUrl: string | null;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface TopicPoll {
  pollId: number;
  question: string;
  multiple: boolean;
  hasVoted: boolean;
  myVotedIds: number[];
  totalVotes: number;
  options: PollOption[];
}

export interface ForumTopic {
  id: number;
  forumId: number;
  forumName: string;
  forumThumbnail: string | null;
  title: string;
  description: string;
  poster: string;
  lastBy: string;
  time: string;
  lastTime: string;
  replies: number;
  views: number;
  likes: number;
  locked: boolean;
  pinned: boolean;
  flairId: number;
  topicImage: string | null;
  tags: TopicTag[];
  linkTypeValue: string;
  poll: TopicPoll | null;
}

export interface ForumsHomePage {
  forums: Forum[];
  categories: ForumCategory[];
  subCatMap: Record<number, ForumCategory[]>;
  totalForumCount: number;
  totalPages: number;
  pageNumber: number;
}

export interface AllTopicsPage {
  topics: ForumTopic[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface ForumTopicsPage {
  topics: ForumTopic[];
  forumDetail: Forum | null;
  flairs: ForumFlair[];
  pageNumber: number;
  hasNextPage: boolean;
}

// "My Forums" — a forum the user is watching, with extra per-user metadata.
export interface MyForum extends Forum {
  isFavourite: boolean;
  watchId: number;
  emailFrequency: number;
}

// Invitation to join a private forum (also used for "requested" — user-initiated
// requests awaiting approval). Shape comes from InvitedForumDto.
export interface InvitedForum {
  forumId: number;
  forumName: string;
  forumDescription: string;
  thumbnailUrl: string | null;
  status: 'invited' | 'requested';
}

export interface MyForumsPage {
  forums: MyForum[];
  invitedForums: InvitedForum[];
  requestedForums: InvitedForum[];
  totalRecordCount: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface MyTopicsPage {
  topics: ForumTopic[];
  totalRecordCount: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface PostBadge {
  id: number;
  name: string;
  imageUrl: string;
}

export interface TopicPost {
  id: number;
  topicId: number;
  authorId: number;
  author: string;
  realName: string;
  rank: string;
  message: string;
  time: string;
  rawTime: string;
  likes: number;
  avatarUrl: string | null;
  avatarAccent: string | null;
  countryCode: string;
  badges: PostBadge[];
  isOp: boolean;
  isEdited: boolean;
  editedWhen: string | null;
  editedBy: string | null;
  editCount: number;
  postCount: number | null;
  joinYear: number | null;
  reactionJson: string | null;
  // Moderator-visible fields — surfaced in the per-post settings sheet.
  // Backend only returns these to callers with moderator rights.
  ip: string | null;
  hasMaturedContent: boolean;
  moderatorNote: string | null;
}

export interface TopicPostsPage {
  posts: TopicPost[];
  topicDetail: ForumTopic | null;
  pageNumber: number;
  hasNextPage: boolean;
}

const FORUM_CAT_GRADIENTS: Record<string, string> = {
  education:     '#1e40af',
  entertainment: '#7c2d12',
  finance:       '#065f46',
  gaming:        '#4c1d95',
  lifestyle:     '#831843',
  movies:        '#7f1d1d',
  music:         '#1e1b4b',
  sports:        '#14532d',
  technology:    '#0c4a6e',
  television:    '#4a1942',
  general:       '#1e3a5e',
};

const FORUM_CAT_EMOJIS: Record<string, string> = {
  education:     '🎓',
  entertainment: '🎭',
  finance:       '💰',
  gaming:        '🎮',
  lifestyle:     '✨',
  movies:        '🎬',
  music:         '🎶',
  sports:        '🏏',
  technology:    '💻',
  television:    '📺',
  general:       '💬',
};

function forumCatSlug(iconClass: string | null | undefined): string {
  if (!iconClass) return 'general';
  const v = String(iconClass).toLowerCase();
  if (v.includes('education'))      return 'education';
  if (v.includes('entertainment'))  return 'entertainment';
  if (v.includes('finance'))        return 'finance';
  if (v.includes('game'))           return 'gaming';
  if (v.includes('lifestyle'))      return 'lifestyle';
  if (v.includes('movie'))          return 'movies';
  if (v.includes('music'))          return 'music';
  if (v.includes('sport'))          return 'sports';
  if (v.includes('tech'))           return 'technology';
  if (v.includes('tv') || v.includes('television')) return 'television';
  return 'general';
}

// ---------------------------------------------------------------------------
// Transform helpers — map real API field names to UI shapes
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBanner(raw: any): Banner {
  const sectionRaw = (raw.sectionName || '').toUpperCase();
  const cat = SECTION_TO_CAT[sectionRaw] || 'Movies';
  return {
    id: String(raw.id ?? raw.bannerId ?? ''),
    title: raw.headline ?? '',
    imageUrl: raw.thumbnailUrl || raw.bannerUrl || raw.imageUrl || '',
    articleId: String(raw.id ?? raw.bannerId ?? ''),
    articleSlug: raw.pageUrl ?? '',
    category: raw.sectionName || cat,
    source: 'IndiaForums',
    timeAgo: timeAgo(raw.publishDate),
  };
}

// HomeArticleDto: { articleId, headline, thumbnailUrl, publishDate, sectionName, commentCount, pageUrl }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformHomeArticle(raw: any): Article {
  const sectionRaw = (raw.sectionName || '').toUpperCase();
  const cat = SECTION_TO_CAT[sectionRaw] || 'Movies';
  return {
    id: String(raw.articleId ?? ''),
    slug: raw.pageUrl ?? '',
    title: raw.headline ?? '',
    summary: '',
    thumbnailUrl: raw.thumbnailUrl || raw.mediaUrl || '',
    category: cat,
    publishedAt: raw.publishDate ?? '',
    timeAgo: timeAgo(raw.publishDate),
    authorName: 'IF News Desk',
    emoji: CATEGORY_EMOJIS[cat] || '📰',
    tag: raw.sectionName || '',
    breaking: false,
  };
}

// RelatedArticleDto: { articleId, headline, mediaUrl, articleSectionName, publishDate }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformRelatedArticle(raw: any): Article {
  const sectionRaw = (raw.articleSectionName || '').toUpperCase();
  const cat = SECTION_TO_CAT[sectionRaw] || 'Movies';
  return {
    id: String(raw.articleId ?? ''),
    slug: raw.pageUrl ?? '',
    title: raw.headline ?? '',
    summary: '',
    thumbnailUrl: raw.mediaUrl || raw.thumbnailUrl || '',
    category: cat,
    publishedAt: raw.publishDate ?? '',
    timeAgo: timeAgo(raw.publishDate),
    authorName: 'IF News Desk',
    emoji: CATEGORY_EMOJIS[cat] || '📰',
    tag: raw.articleSectionName || '',
    breaking: false,
  };
}

// Detail response: { article: {...}, metadata: {...}, articleItems: [...], relatedArticles: [...], tlDrDescription, jsonData }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformArticleDetail(data: any): ArticleDetail {
  const article = data?.article ?? {};
  const metadata = data?.metadata ?? {};
  const sectionRaw = (article.sectionName || metadata.sectionName || '').toUpperCase();
  const cat = SECTION_TO_CAT[sectionRaw] || 'Movies';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relatedRaw: any[] = Array.isArray(data?.relatedArticles) ? data.relatedArticles : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsRaw: any[] = Array.isArray(data?.articleItems) ? data.articleItems : [];

  // Real API fields: articleItemId, articleItemTypeId, orderNum, contentCodes (media URL)
  const articleItems: ArticleItem[] = itemsRaw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .slice()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (a.orderNum ?? 0) - (b.orderNum ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((it: any) => ({
      id: String(it.articleItemId ?? it.id ?? Math.random()),
      type: Number(it.articleItemTypeId ?? it.type ?? 0),
      title: it.title || undefined,
      contents: it.contents || undefined,
      mediaUrl: it.contentCodes || it.mediaUrl || undefined,
      mediaTitle: it.mediaTitle || undefined,
      source: it.source || undefined,
      subItem: it.subItem === true,
      dateAdded: it.dateAdded || undefined,
    }));

  // Extract first <img> src from the HTML body so we can use it as a hero
  // fallback when metadata.imageUrl / article.thumbnailUrl are empty.
  const body: string = article.cachedContent ?? '';
  let firstBodyImage = '';
  const imgMatch = body.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  if (imgMatch) firstBodyImage = imgMatch[1];

  // articleItems fallback: type 2 items carry images in contentCodes
  let firstItemImage = '';
  for (const it of itemsRaw) {
    const url = it?.contentCodes || it?.mediaUrl;
    if (url && /^https?:\/\//i.test(String(url)) && /\.(jpg|jpeg|png|webp|gif)/i.test(String(url))) {
      firstItemImage = String(url);
      break;
    }
  }

  // jsonData lives on the article and is a JSON string wrapping { json: [...] }
  let jsonEntities: JsonEntity[] = [];
  try {
    const raw = article?.jsonData ?? metadata?.jsonData ?? '';
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr: any[] = parsed?.json ?? parsed ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jsonEntities = arr
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((e: any) => ({
          id: String(e.id ?? e.uc ?? e.name ?? ''),
          name: e.name || e.displayName || '',
          type: e.ct ?? e.tt ?? e.type ?? undefined,
        }))
        .filter((e) => e.name);
    }
  } catch (e) {
    console.warn('[API] Failed to parse jsonData:', e);
  }

  return {
    id: String(article.articleId ?? ''),
    slug: article.pageUrl ?? '',
    title: article.headline ?? '',
    summary: metadata.description ?? '',
    thumbnailUrl:
      metadata.imageUrl ||
      article.mediaUrl ||
      article.thumbnailUrl ||
      article.imageUrl ||
      article.featuredImage ||
      article.image ||
      firstBodyImage ||
      firstItemImage ||
      '',
    category: cat,
    publishedAt: article.publishDate ?? '',
    timeAgo: timeAgo(article.publishDate),
    authorName: metadata.author || 'IF News Desk',
    emoji: CATEGORY_EMOJIS[cat] || '📰',
    tag: article.articleAttribute || article.sectionName || '',
    breaking: (article.priority ?? 0) > 0,
    body,
    authorAvatarUrl: '',
    subtitle: metadata.description ?? '',
    viewCount: Number(article.viewCount ?? 0),
    commentCount: Number(article.commentCount ?? 0),
    tldr: data?.tlDrDescription ?? '',
    readTime: article.readTime || '4 min read',
    relatedArticles: relatedRaw.map(transformRelatedArticle),
    articleItems,
    jsonEntities,
    articleTypeId: article.articleTypeId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Celebrity transforms
// ---------------------------------------------------------------------------

export const CELEB_CATEGORIES = [
  { id: 'bollywood' as const,  label: 'Bollywood',  key: 'bollywoodCelebrities' },
  { id: 'television' as const, label: 'Television', key: 'televisionCelebrities' },
  { id: 'creators' as const,   label: 'Creators',   key: 'creators' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCelebrity(raw: any, category: CelebCategoryId): Celebrity {
  const rankDiff = (raw.rankLastWeek || 0) - (raw.rankCurrentWeek || 0);
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (rankDiff > 0) trend = 'up';
  else if (rankDiff < 0) trend = 'down';

  return {
    id:        String(raw.personId ?? raw.id ?? ''),
    name:      raw.displayName || '',
    shortDesc: raw.shortDesc || '',
    thumbnail: raw.imageUrl || null,
    pageUrl:   raw.pageUrl || '',
    shareUrl:  raw.shareUrl || '',
    category,
    rank:      raw.rankCurrentWeek || 0,
    prevRank:  raw.rankLastWeek || 0,
    trend,
    rankDiff:  Math.abs(rankDiff),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBiography(data: any): CelebrityBiography | null {
  const person = data?.person;
  if (!person) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infos: any[] = data?.personInfos || [];
  const infoMap: Record<string, string[]> = {};
  for (const info of infos) {
    const key = info.personInfoTypeName;
    if (!infoMap[key]) infoMap[key] = [];
    infoMap[key].push(info.contents);
  }

  const imageUrl: string | null = person.imageUrl
    || (person.hasThumbnail
      ? `https://img.indiaforums.com/person/320x240/${Math.floor(person.personId / 10000)}/${String(person.personId).padStart(4, '0')}-${person.pageUrl}.webp?c=${person.updateChecksum}`
      : null);

  return {
    id:            String(person.personId ?? ''),
    name:          person.displayName || person.fullName || '',
    fullName:      person.fullName || '',
    shortDesc:     person.shortDesc || '',
    thumbnail:     imageUrl,
    pageUrl:       person.pageUrl || '',
    bioHtml:       person.biographyCachedContent || '',
    rank:          Number(person.rankCurrentWeek ?? 0),
    prevRank:      Number(person.rankLastWeek ?? 0),
    isFan:         Boolean(data?.isFan ?? false),
    rankStartDate: data?.rankStartDate || '',
    rankEndDate:   data?.rankEndDate || '',
    articleCount:  Number(person.articleCount ?? 0),
    fanCount:      Number(person.fanCount ?? 0),
    videoCount:    Number(person.videoCount ?? 0),
    viewCount:     Number(person.viewCount ?? 0),
    photoCount:    Number(person.photoCount ?? 0),
    topicsCount:   Number(person.topicsCount ?? 0),
    nicknames:     infoMap['NickName(s)'] || [],
    profession:    infoMap['Profession(s)'] || [],
    birthDate:     (infoMap['Date Of Birth'] || [])[0] || '',
    birthPlace:    (infoMap['Birthplace'] || [])[0] || '',
    zodiacSign:    (infoMap['Zodiac Sign'] || [])[0] || '',
    nationality:   (infoMap['Nationality'] || [])[0] || '',
    height:        (infoMap['Height (approx.)'] || [])[0] || '',
    weight:        (infoMap['Weight (approx.)'] || [])[0] || '',
    debut:         infoMap['Debut'] || [],
    hometown:      (infoMap['Hometown'] || [])[0] || '',
    education:     (infoMap['Educational Qualification'] || [])[0] || '',
    maritalStatus: (infoMap['Marital Status'] || [])[0] || '',
    spouse:        infoMap['Spouse(s)'] || [],
    children:      infoMap['Children'] || [],
    parents:       infoMap['Parents'] || [],
    siblings:      infoMap['Siblings'] || [],
    religion:      (infoMap['Religion'] || [])[0] || '',
    netWorth:      (infoMap['Net Worth'] || [])[0] || '',
    favFilms:      infoMap['Film(s)'] || [],
    favActors:     infoMap['Actor(s)'] || [],
    favFood:       infoMap['Food'] || [],
    hobbies:       infoMap['Hobbies'] || [],
    awards:        infoMap['Awards/Honours'] || [],
    facebook:      person.facebook || '',
    twitter:       person.twitter || '',
    instagram:     person.instagram || '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFan(raw: any): CelebrityFan {
  return {
    id:           String(raw.userId ?? ''),
    name:         raw.userName || 'Fan',
    avatarAccent: raw.avatarAccent || '#3558F0',
    level:        raw.groupName || '',
    groupId:      Number(raw.groupId ?? 0),
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchBanners(): Promise<Banner[]> {
  try {
    const { data } = await apiClient.get('/home/banners');
    const banners = data?.banners ?? [];
    return banners.map(transformBanner);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchBanners failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockBanners();
  }
}

export interface FetchArticlesParams {
  category?: string;
  page?: number;
  limit?: number;
}

export async function fetchArticles(params: FetchArticlesParams = {}): Promise<Article[]> {
  const { category, page = 1, limit = 12 } = params;
  const articleType = chipToArticleType(category);
  // Errors propagate so React Query sees `isError` and screens can show a
  // real error / offline UI instead of silently rendering stale mock data.
  const { data } = await apiClient.get('/home/articles', {
    params: { articleType, pageNumber: page, pageSize: limit },
  });
  const articles = data?.articles ?? [];
  return articles.map(transformHomeArticle);
}

// /articles/list returns ArticleDto which includes defaultCategoryId.
// NewsScreen uses this so it can filter client-side by sub-category (HINDI,
// ENGLISH, TAMIL, CRICKET, …) the way the web prototype does.
export interface FetchArticleListParams {
  page?: number;
  limit?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformListArticle(raw: any): Article {
  const catId: number | null = raw.defaultCategoryId ?? null;
  const cat = (catId != null && ARTICLE_CAT_MAP[catId]) || 'Movies';
  return {
    id: String(raw.articleId ?? ''),
    slug: raw.pageUrl ?? '',
    title: raw.headline ?? '',
    summary: '',
    thumbnailUrl: raw.thumbnail || raw.thumbnailUrl || '',
    category: cat,
    publishedAt: raw.publishedWhen || raw.publishDate || '',
    timeAgo: timeAgo(raw.publishedWhen || raw.publishDate),
    authorName: 'IF News Desk',
    emoji: CATEGORY_EMOJIS[cat] || '📰',
    tag: raw.articleAttributeName || '',
    breaking: (raw.priority ?? 0) > 0,
    catId,
  };
}

export async function fetchArticleList(params: FetchArticleListParams = {}): Promise<Article[]> {
  const { page = 1, limit = 25 } = params;
  // Errors propagate so React Query sees `isError` and the screen can show
  // a real error / offline UI instead of silently rendering stale mock data.
  const { data } = await apiClient.get('/articles/list', {
    params: { page, pageSize: limit },
  });
  // Handle both { data: { articles } } and { articles } shapes.
  const payload = data?.data ?? data;
  const articles = payload?.articles ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return articles.map((a: any) => transformListArticle(a));
}

export async function fetchArticleDetails(idOrSlug: string): Promise<ArticleDetail> {
  try {
    const { data } = await apiClient.get(`/articles/${idOrSlug}/details`);
    console.log('[API] fetchArticleDetails keys:', Object.keys(data || {}));
    console.log('[API] articleItems count:', (data?.articleItems ?? []).length);
    console.log('[API] article title:', data?.article?.headline);
    const result = transformArticleDetail(data);
    console.log('[API] transformed articleItems:', result.articleItems.length, result.articleItems.map((i) => ({ type: i.type, hasMedia: !!i.mediaUrl, hasContents: !!i.contents })));
    console.log('[API] body length:', result.body.length, 'preview:', result.body.substring(0, 200));
    console.log('[API] article fields:', Object.keys(data?.article || {}));
    console.log('[API] metadata fields:', Object.keys(data?.metadata || {}));
    console.log('[API] thumbnailUrl picked:', result.thumbnailUrl || '(none)');
    console.log('[API] article.thumbnailUrl:', data?.article?.thumbnailUrl);
    console.log('[API] metadata.imageUrl:', data?.metadata?.imageUrl);
    console.log('[API] article.mediaUrl:', JSON.stringify(data?.article?.mediaUrl));
    console.log('[API] article.cachedAmpContent len:', (data?.article?.cachedAmpContent ?? '').length);
    console.log('[API] article.cachedFiaContent len:', (data?.article?.cachedFiaContent ?? '').length);
    return result;
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchArticleDetails failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockArticleDetail(idOrSlug);
  }
}

export async function fetchCelebrities(page = 1, pageSize = 20): Promise<CelebritiesPayload> {
  try {
    const { data } = await apiClient.get('/celebrities', { params: { pageNumber: page, pageSize } });

    const categories = {
      bollywood:  (data?.bollywoodCelebrities  || []).map((c: unknown) => transformCelebrity(c, 'bollywood')),
      television: (data?.televisionCelebrities || []).map((c: unknown) => transformCelebrity(c, 'television')),
      creators:   (data?.creators              || []).map((c: unknown) => transformCelebrity(c, 'creators')),
    };

    const allCelebrities: Celebrity[] = data?.celebrities
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (data.celebrities as any[]).map((c) => transformCelebrity(c, 'all'))
      : [];

    const pagination: CelebPagination = {
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
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchCelebrities failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockCelebritiesPayload();
  }
}

export async function fetchCelebrityBiography(personId: string): Promise<CelebrityBiography | null> {
  try {
    const { data } = await apiClient.get(`/celebrities/${personId}/biography`);
    return transformBiography(data);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchCelebrityBiography failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockBiography(personId);
  }
}

export async function fetchCelebrityFans(
  personId: string,
  page = 1,
  pageSize = 20,
): Promise<CelebrityFansPayload> {
  try {
    const { data } = await apiClient.get(`/celebrities/${personId}/fans`, {
      params: { pageNumber: page, pageSize },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawFans: any[] = data?.fans || [];

    const pagination: CelebPagination = {
      currentPage:     data?.pageNumber ?? page,
      pageSize:        data?.pageSize ?? pageSize,
      totalPages:      data?.totalPages ?? 1,
      totalCount:      data?.totalCount ?? 0,
      hasNextPage:     data?.hasNextPage ?? false,
      hasPreviousPage: data?.hasPreviousPage ?? false,
    };

    return { fans: rawFans.map(transformFan), pagination };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchCelebrityFans failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockFans(page, pageSize);
  }
}

// ---------------------------------------------------------------------------
// Mock data — fallback when API is unreachable (dev / offline)
// ---------------------------------------------------------------------------

function getMockBanners(): Banner[] {
  return [
    {
      id: '1',
      title: "Stree 3 crosses ₹500 crore in first week — Bollywood's biggest 2026 opener",
      imageUrl: 'https://picsum.photos/seed/banner1/800/400',
      articleId: '101',
      articleSlug: 'stree-3-500-crore',
      category: 'Movies',
      source: 'IndiaForums',
      timeAgo: '3 hours ago',
    },
    {
      id: '2',
      title: 'IPL 2026: MI vs CSK — Rohit\'s record-breaking innings steals the show',
      imageUrl: 'https://picsum.photos/seed/banner2/800/400',
      articleId: '102',
      articleSlug: 'ipl-2026-mi-csk',
      category: 'Cricket',
      source: 'Sports Desk',
      timeAgo: '45 min ago',
    },
    {
      id: '3',
      title: 'Bigg Boss 18 All-Stars: Full contestant list officially revealed tonight',
      imageUrl: 'https://picsum.photos/seed/banner3/800/400',
      articleId: '103',
      articleSlug: 'bigg-boss-18-contestants',
      category: 'Television',
      source: 'TV Buzz',
      timeAgo: '1 hour ago',
    },
  ];
}

function getMockArticles(category?: string): Article[] {
  const articles: Article[] = [
    {
      id: '201',
      slug: 'srk-new-film-announcement',
      title: "SRK's new film title officially revealed — first look drops tonight!",
      summary: 'The superstar revealed details about his upcoming venture.',
      thumbnailUrl: 'https://picsum.photos/seed/art1/160/160',
      category: 'Movies',
      publishedAt: '2026-04-17T08:00:00Z',
      timeAgo: '18 min ago',
      authorName: 'IF News Desk',
      emoji: '🎬',
      breaking: true,
      catId: 7,
    },
    {
      id: '202',
      slug: 'ipl-2026-highlights',
      title: 'IPL 2026 — Match Day 18 live discussion: MI vs CSK at Wankhede',
      summary: "Key moments from yesterday's thrilling encounter.",
      thumbnailUrl: 'https://picsum.photos/seed/art2/160/160',
      category: 'Sports',
      publishedAt: '2026-04-17T06:30:00Z',
      timeAgo: '45 min ago',
      authorName: 'IF News Desk',
      emoji: '🏏',
      tag: 'IPL',
      catId: 15,
    },
    {
      id: '203',
      slug: 'yeh-rishta-abhira-decision',
      title: "Yeh Rishta Kya Kehlata Hai: Abhira's shocking decision stuns the entire family",
      summary: 'A major turning point in the ongoing storyline.',
      thumbnailUrl: 'https://picsum.photos/seed/art3/160/160',
      category: 'Television',
      publishedAt: '2026-04-17T05:00:00Z',
      timeAgo: '1 hr ago',
      authorName: 'IF News Desk',
      emoji: '📺',
      tag: 'TRENDING',
      catId: 5,
    },
    {
      id: '204',
      slug: 'deepika-international-deal',
      title: 'Deepika Padukone Signs International Production Deal with Hollywood Studio',
      summary: 'The actress partners with a top Hollywood studio.',
      thumbnailUrl: 'https://picsum.photos/seed/art4/160/160',
      category: 'Movies',
      publishedAt: '2026-04-16T20:00:00Z',
      timeAgo: '5 hrs ago',
      authorName: 'IF News Desk',
      emoji: '⭐',
      catId: 8,
    },
    {
      id: '205',
      slug: 'celebrity-chef-traitors',
      title: 'Celebrity Chef Ranveer Brar to be a part of The Traitors 2: Report',
      summary: 'Multiple unicorns emerged in the first quarter of 2026.',
      thumbnailUrl: 'https://picsum.photos/seed/art5/160/160',
      category: 'Digital',
      publishedAt: '2026-04-16T14:00:00Z',
      timeAgo: '3 hrs ago',
      authorName: 'IF News Desk',
      emoji: '👨‍🍳',
      tag: 'HINDI',
      breaking: true,
      catId: 9,
    },
    {
      id: '206',
      slug: 'virat-kohli-retirement-rumours',
      title: 'Virat Kohli Addresses Retirement Rumours at Press Conference',
      summary: 'The batting legend clears the air about his future plans.',
      thumbnailUrl: 'https://picsum.photos/seed/art6/160/160',
      category: 'Sports',
      publishedAt: '2026-04-16T10:00:00Z',
      timeAgo: '22 hrs ago',
      authorName: 'IF News Desk',
      emoji: '🏏',
      catId: 21,
    },
    {
      id: '207',
      slug: 'alia-skincare-routine',
      title: "Alia Bhatt's minimalist skincare routine is breaking the internet this week",
      summary: 'Athletes train intensively ahead of the games.',
      thumbnailUrl: 'https://picsum.photos/seed/art7/160/160',
      category: 'Lifestyle',
      publishedAt: '2026-04-15T18:00:00Z',
      timeAgo: '1 day ago',
      authorName: 'IF News Desk',
      emoji: '✨',
      catId: 11,
    },
    {
      id: '208',
      slug: 'ott-streaming-wars',
      title: 'OTT Platforms Battle for Indian Subscribers with Bold New Content Deals',
      summary: 'New content strategies emerge as competition intensifies.',
      thumbnailUrl: 'https://picsum.photos/seed/art8/160/160',
      category: 'Digital',
      publishedAt: '2026-04-15T12:00:00Z',
      timeAgo: '1 day ago',
      authorName: 'IF News Desk',
      emoji: '📱',
      catId: 10,
    },
  ];

  if (!category) return articles;
  return articles.filter(
    (a) => a.category.toLowerCase() === category.toLowerCase(),
  );
}

function mockCeleb(
  id: string,
  name: string,
  rank: number,
  prevRank: number,
  category: CelebCategoryId,
  shortDesc: string,
  seed: string,
): Celebrity {
  const diff = prevRank - rank;
  const trend: 'up' | 'down' | 'stable' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
  return {
    id,
    name,
    shortDesc,
    thumbnail: `https://picsum.photos/seed/${seed}/240/320`,
    pageUrl: name.toLowerCase().replace(/\s+/g, '-'),
    shareUrl: '',
    category,
    rank,
    prevRank,
    trend,
    rankDiff: Math.abs(diff),
  };
}

function getMockCelebritiesPayload(): CelebritiesPayload {
  const bollywood: Celebrity[] = [
    mockCeleb('1', 'Shah Rukh Khan',   1, 2, 'bollywood', 'Indian film actor & producer', 'srk'),
    mockCeleb('2', 'Deepika Padukone', 2, 1, 'bollywood', 'Actress and producer',         'dp'),
    mockCeleb('3', 'Ranveer Singh',    3, 4, 'bollywood', 'Actor',                        'rs'),
    mockCeleb('4', 'Alia Bhatt',       4, 3, 'bollywood', 'Actress and producer',         'ab'),
    mockCeleb('5', 'Ranbir Kapoor',    5, 5, 'bollywood', 'Actor',                        'rk'),
    mockCeleb('6', 'Katrina Kaif',     6, 7, 'bollywood', 'Actress',                      'kk'),
    mockCeleb('7', 'Hrithik Roshan',   7, 6, 'bollywood', 'Actor and dancer',             'hr'),
    mockCeleb('8', 'Priyanka Chopra',  8, 8, 'bollywood', 'Actress and producer',         'pc'),
  ];
  const television: Celebrity[] = [
    mockCeleb('11', 'Rupali Ganguly',  1, 1, 'television', 'Television actress',  'rg'),
    mockCeleb('12', 'Dipika Kakar',    2, 3, 'television', 'Television actress',  'dk'),
    mockCeleb('13', 'Karan Kundrra',   3, 2, 'television', 'Television actor',    'kkd'),
    mockCeleb('14', 'Tejasswi Prakash',4, 4, 'television', 'Television actress',  'tp'),
    mockCeleb('15', 'Shehnaaz Gill',   5, 6, 'television', 'Television actress',  'sg'),
  ];
  const creators: Celebrity[] = [
    mockCeleb('21', 'Bhuvan Bam',      1, 1, 'creators', 'Content creator', 'bb'),
    mockCeleb('22', 'Ashish Chanchlani',2,2, 'creators', 'Content creator', 'ac'),
    mockCeleb('23', 'CarryMinati',     3, 4, 'creators', 'Content creator', 'cm'),
    mockCeleb('24', 'Prajakta Koli',   4, 3, 'creators', 'Content creator', 'pk'),
  ];

  return {
    categories: { bollywood, television, creators },
    celebrities: bollywood,
    rankStartDate: '2026-04-12',
    rankEndDate:   '2026-04-18',
    pagination: {
      currentPage: 1,
      pageSize: 20,
      totalPages: 1,
      totalCount: bollywood.length + television.length + creators.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function getMockBiography(personId: string): CelebrityBiography {
  return {
    id:            personId,
    name:          'Shah Rukh Khan',
    fullName:      'Shah Rukh Khan',
    shortDesc:     'Indian film actor, producer, and television personality',
    thumbnail:     `https://picsum.photos/seed/bio${personId}/600/800`,
    pageUrl:       'shah-rukh-khan',
    bioHtml:       '<p>Shah Rukh Khan, also known as SRK, is one of the most successful actors in Indian cinema. Often referred to as the "King of Bollywood", he has appeared in more than 80 Hindi films.</p><p>Born on 2 November 1965 in New Delhi, Khan began his career with appearances in several television series in the late 1980s and made his Bollywood debut in 1992 with Deewana.</p>',
    rank:          1,
    prevRank:      2,
    isFan:         false,
    rankStartDate: '2026-04-12',
    rankEndDate:   '2026-04-18',
    articleCount:  842,
    fanCount:      15_420,
    videoCount:    156,
    viewCount:     2_480_000,
    photoCount:    320,
    topicsCount:   89,
    nicknames:     ['SRK', 'King Khan'],
    profession:    ['Actor', 'Producer'],
    birthDate:     '2 November 1965',
    birthPlace:    'New Delhi, India',
    zodiacSign:    'Scorpio',
    nationality:   'Indian',
    height:        '5\'8" (173 cm)',
    weight:        '75 kg',
    debut:         ['Deewana (1992)'],
    hometown:      'Mumbai, Maharashtra',
    education:     'Hansraj College, University of Delhi',
    maritalStatus: 'Married',
    spouse:        ['Gauri Khan'],
    children:      ['Aryan Khan', 'Suhana Khan', 'AbRam Khan'],
    parents:       ['Meer Taj Mohammed Khan', 'Lateef Fatima'],
    siblings:      ['Shehnaz Lalarukh Khan'],
    religion:      'Islam',
    netWorth:      '$770 million',
    favFilms:      ['Dilwale Dulhania Le Jayenge', 'Kabhi Khushi Kabhie Gham'],
    favActors:     ['Dilip Kumar', 'Amitabh Bachchan'],
    favFood:       ['Tandoori Chicken', 'Biryani'],
    hobbies:       ['Reading', 'Watching films'],
    awards:        ['Padma Shri (2005)', 'Filmfare Awards (14)'],
    facebook:      '',
    twitter:       'iamsrk',
    instagram:     'iamsrk',
  };
}

function getMockFans(page: number, pageSize: number): CelebrityFansPayload {
  const accents = ['#3558F0', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];
  const levels  = ['Newbie', 'Fan', 'Super Fan', 'Die-hard'];
  const fans: CelebrityFan[] = Array.from({ length: pageSize }, (_, i) => {
    const n = (page - 1) * pageSize + i + 1;
    return {
      id:           `fan-${n}`,
      name:         `Fan User ${n}`,
      avatarAccent: accents[i % accents.length],
      level:        levels[i % levels.length],
      groupId:      (i % 4) + 1,
    };
  });
  return {
    fans,
    pagination: {
      currentPage: page,
      pageSize,
      totalPages:  3,
      totalCount:  pageSize * 3,
      hasNextPage: page < 3,
      hasPreviousPage: page > 1,
    },
  };
}

function getMockArticleDetail(idOrSlug: string): ArticleDetail {
  const mockArticles = getMockArticles();
  const found = mockArticles.find((a) => a.slug === idOrSlug || a.id === idOrSlug);
  const base = found ?? mockArticles[0];
  const related = mockArticles.filter((a) => a.id !== base.id).slice(0, 3);
  return {
    ...base,
    body: `<p>${base.summary}</p><h2>What Happened</h2><p>This is a detailed article about ${base.title}. The story continues with more in-depth coverage and analysis of the events surrounding this topic.</p><p>Sources close to the matter have confirmed the details mentioned above. More updates are expected in the coming days.</p><h2>The Internet Reacts</h2><p>Social media has been buzzing non-stop with fan reactions and theories. The hashtag has already started trending nationwide.</p>`,
    authorAvatarUrl: '',
    subtitle: base.summary,
    viewCount: 12_400,
    commentCount: 86,
    tldr: `${base.title} — reactions are pouring in from all corners and the internet is buzzing.`,
    readTime: '4 min read',
    relatedArticles: related,
    articleItems: [],
    jsonEntities: [],
  };
}

// ---------------------------------------------------------------------------
// Videos API
// ---------------------------------------------------------------------------

export async function fetchVideos(
  page = 1,
  pageSize = 20,
  contentId: number | null = null,
): Promise<VideosPage> {
  const params: Record<string, string | number> = { pageNumber: page, pageSize };
  if (contentId) {
    params.contentType = 1000;
    params.contentId = contentId;
  }

  try {
    const { data } = await apiClient.get('/videos/list', { params });
    const payload = data?.data || data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawVideos: any[] = payload?.medias || [];

    return {
      videos: rawVideos.map(transformVideo),
      pagination: {
        currentPage: page,
        pageSize,
        hasNextPage: rawVideos.length >= pageSize,
      },
    };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchVideos failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockVideosPage(page, pageSize);
  }
}

export async function fetchVideoDetails(videoId: string): Promise<VideoDetail | null> {
  try {
    const { data } = await apiClient.get(`/videos/${videoId}/details`);
    return transformVideoDetail(data);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchVideoDetails failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockVideoDetail(videoId);
  }
}

// ---------------------------------------------------------------------------
// Videos mock fallback
// ---------------------------------------------------------------------------

function mockVideo(
  id: string,
  cat: 'tv' | 'movies' | 'digital' | 'sports' | 'lifestyle',
  title: string,
  duration: string,
  seed: string,
  featured = false,
): Video {
  return {
    id,
    catId:        cat === 'tv' ? 5 : cat === 'movies' ? 7 : cat === 'digital' ? 3 : cat === 'sports' ? 14 : 4,
    cat,
    catLabel:     VIDEO_CAT_LABELS[cat] || cat,
    title,
    timeAgo:      '2 hr ago',
    duration,
    bg:           VIDEO_CAT_BG[cat],
    emoji:        VIDEO_CAT_EMOJI[cat],
    thumbnail:    `https://picsum.photos/seed/${seed}/480/270`,
    live:         false,
    featured,
    views:        '12.4K',
    viewCount:    12_400,
    commentCount: 23,
    description:  '',
  };
}

function getMockVideosPage(page: number, pageSize: number): VideosPage {
  const videos: Video[] = [
    mockVideo('v1',  'tv',        'Anupamaa — Emotional confrontation scene breaks the internet',           '9:21',  'vid1', true),
    mockVideo('v2',  'sports',    'IPL 2026 — MI vs CSK full highlights and match recap',                    '14:08', 'vid2', true),
    mockVideo('v3',  'movies',    "Stree 3 official trailer — Shraddha Kapoor returns with Rajkummar Rao",   '2:47',  'vid3'),
    mockVideo('v4',  'digital',   'The Traitors India: Chef Ranveer Brar eliminated in shocking twist',      '6:12',  'vid4'),
    mockVideo('v5',  'tv',        "Yeh Rishta Kya Kehlata Hai: Abhira's shocking decision stuns family",     '8:45',  'vid5'),
    mockVideo('v6',  'movies',    'Deepika Padukone interview — Hollywood deal, upcoming films, more',      '18:22', 'vid6'),
    mockVideo('v7',  'lifestyle', "Alia Bhatt's minimalist skincare routine — morning to night full guide",  '5:38',  'vid7'),
    mockVideo('v8',  'sports',    'Virat Kohli retirement rumours — Press conference full coverage',         '11:04', 'vid8'),
    mockVideo('v9',  'digital',   'OTT battle heats up — New subscription plans compared side by side',     '7:51',  'vid9'),
    mockVideo('v10', 'movies',    'Ranveer Singh reacts to Stree 3 trailer — Exclusive interview',          '4:15',  'vid10'),
  ];

  return {
    videos,
    pagination: { currentPage: page, pageSize, hasNextPage: false },
  };
}

function getMockVideoDetail(videoId: string): VideoDetail {
  const base = getMockVideosPage(1, 20).videos.find(v => v.id === videoId)
    ?? getMockVideosPage(1, 20).videos[0];
  const related = getMockVideosPage(1, 20).videos.filter(v => v.id !== base.id).slice(0, 6);
  return {
    ...base,
    description: `This is a detailed description for "${base.title}". A deeper look into what happened, why it matters, and the reactions pouring in from fans across the internet.`,
    contentId: null, // no YouTube ID in mock → fallback card will render
    keywords: 'bollywood, television, trending, latest',
    relatedVideos: related,
  };
}

// ---------------------------------------------------------------------------
// Galleries — types & constants
// ---------------------------------------------------------------------------

export interface Gallery {
  id: string | number;
  title: string;
  pageUrl: string | null;
  cat: string | null;
  catLabel: string | null;
  count: number;
  emoji: string;
  bg: string;
  time: string;
  featured: boolean;
  thumbnail: string | null;
  viewCount: number;
  views: string | null;
}

export interface GalleryPhoto {
  id: string | number;
  imageUrl: string | null;
  caption: string;
  tags: { id: string | number; name: string }[];
  emoji: string;
  bg: string;
}

export interface GalleryDetail extends Gallery {
  description: string;
  keywords: string[];
  relatedGalleries: Gallery[];
  photos: GalleryPhoto[];
}

export interface GalleriesPage {
  galleries: Gallery[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GalleryCatTab {
  id: string;
  label: string;
  categoryId: number | null;
}

export const GALLERY_CAT_TABS: GalleryCatTab[] = [
  { id: 'all',       label: 'All',       categoryId: null },
  { id: 'tv',        label: 'TV',        categoryId: 1    },
  { id: 'movies',    label: 'Movies',    categoryId: 2    },
  { id: 'digital',   label: 'Digital',   categoryId: 3    },
  { id: 'lifestyle', label: 'Lifestyle', categoryId: 4    },
  { id: 'sports',    label: 'Sports',    categoryId: 14   },
];

const GALLERY_CAT_MAP: Record<number, string> = {
  1:  'tv',
  2:  'movies',
  3:  'digital',
  4:  'lifestyle',
  14: 'sports',
};

const GALLERY_CAT_LABELS: Record<string, string> = {
  tv:        'TV',
  movies:    'Movies',
  digital:   'Digital',
  lifestyle: 'Lifestyle',
  sports:    'Sports',
};

const GALLERY_CAT_BG: Record<string, string> = {
  tv:        '#4a1942',
  movies:    '#7f1d1d',
  digital:   '#1e293b',
  lifestyle: '#831843',
  sports:    '#14532d',
};

const GALLERY_CAT_EMOJI: Record<string, string> = {
  tv:        '📺',
  movies:    '🎬',
  digital:   '🎞️',
  lifestyle: '✨',
  sports:    '🏏',
};

const GALLERY_DEFAULT_BG    = '#667eea';
const GALLERY_DEFAULT_EMOJI = '📸';

// ---------------------------------------------------------------------------
// Galleries — transforms
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformGallery(raw: any): Gallery {
  const catId = raw.defaultCategoryId ?? raw.categoryId ?? null;
  const cat   = catId != null ? (GALLERY_CAT_MAP[catId] || null) : null;
  const vc    = raw.viewCount || 0;

  return {
    id:         raw.mediaGalleryId ?? raw.galleryId ?? raw.id,
    title:      raw.mediaGalleryName ?? raw.title ?? raw.galleryTitle ?? '',
    pageUrl:    raw.pageUrl ?? null,
    cat,
    catLabel:   cat ? (GALLERY_CAT_LABELS[cat] || null) : null,
    count:      raw.mediaCount ?? raw.photoCount ?? raw.count ?? 0,
    emoji:      cat ? (GALLERY_CAT_EMOJI[cat] || GALLERY_DEFAULT_EMOJI) : GALLERY_DEFAULT_EMOJI,
    bg:         cat ? (GALLERY_CAT_BG[cat] || GALLERY_DEFAULT_BG) : GALLERY_DEFAULT_BG,
    time:       timeAgo(raw.publishedWhen ?? raw.publishDate ?? raw.createdAt ?? ''),
    featured:   raw.featured ?? raw.isFeatured ?? false,
    thumbnail:  raw.thumbnailUrl ?? raw.thumbnail ?? null,
    viewCount:  vc,
    views:      vc > 0 ? formatViews(vc) : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformGalleryDetail(data: any): GalleryDetail | null {
  const payload = data?.data ?? data;
  const raw     = payload?.mediaGallery ?? payload?.gallery ?? payload;

  if (!raw?.mediaGalleryId && !raw?.galleryId && !raw?.id) {
    return null;
  }

  const base       = transformGallery(raw);
  const catId      = raw.defaultCategoryId ?? raw.categoryId ?? null;
  const cat        = catId != null ? (GALLERY_CAT_MAP[catId] || null) : null;
  const fallbackBg = cat ? (GALLERY_CAT_BG[cat] || GALLERY_DEFAULT_BG) : GALLERY_DEFAULT_BG;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawPhotos: any[] = payload?.photos ?? raw?.photos ?? [];

  const photos: GalleryPhoto[] = rawPhotos.map((p, i) => {
    let tags: { id: string | number; name: string }[] = [];
    if (p.jsonData) {
      try {
        const parsed = JSON.parse(p.jsonData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags = (parsed?.json || []).map((t: any) => ({ id: t.id, name: t.name }));
      } catch {
        tags = [];
      }
    }
    return {
      id:       p.mediaId ?? p.photoId ?? p.imageId ?? i,
      imageUrl: p.thumbnail ?? p.thumbnailUrl ?? p.imageUrl ?? p.url ?? null,
      caption:  p.mediaTitle ?? p.mediaDesc ?? p.caption ?? '',
      tags,
      emoji:    GALLERY_DEFAULT_EMOJI,
      bg:       fallbackBg,
    };
  });

  const description = raw.mediaGalleryDesc ?? raw.description ?? '';
  const keywords    = raw.keywords
    ? String(raw.keywords).split(',').map((k: string) => k.trim()).filter(Boolean)
    : [];
  const relatedGalleries = (payload?.relatedMediaGalleries ?? []).map(transformGallery);

  const heroThumbnail = photos[0]?.imageUrl ?? base.thumbnail ?? null;

  return {
    ...base,
    thumbnail: heroThumbnail,
    count:     photos.length || base.count,
    description,
    keywords,
    relatedGalleries,
    photos,
  };
}

// ---------------------------------------------------------------------------
// Galleries — fetch functions
// ---------------------------------------------------------------------------

export async function fetchMediaGalleries(
  page = 1,
  pageSize = 25,
  categoryId: number | null = null,
): Promise<GalleriesPage> {
  const params: Record<string, string | number | boolean> = {
    pageNumber:    page,
    pageSize,
    publishedOnly: false,
    contentType:   1000,
  };
  if (categoryId) params.contentId = categoryId;

  try {
    const { data } = await apiClient.get('/media-galleries/list', { params });
    const payload       = data?.data ?? data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawGalleries: any[] = payload?.galleries ?? payload?.mediaGalleries ?? [];
    const rawPagination = data?.pagination ?? payload?.pagination;

    const pagination = rawPagination || {
      currentPage:     page,
      pageSize,
      totalPages:      1,
      totalItems:      rawGalleries.length,
      hasNextPage:     false,
      hasPreviousPage: false,
    };

    return {
      galleries: rawGalleries.map(transformGallery),
      pagination,
    };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchMediaGalleries failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockGalleriesPage(page, pageSize, categoryId);
  }
}

export async function fetchMediaGalleryDetails(
  id: string | number,
): Promise<GalleryDetail | null> {
  try {
    const { data } = await apiClient.get(`/media-galleries/${id}/details`);
    return transformGalleryDetail(data);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchMediaGalleryDetails failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockGalleryDetail(id);
  }
}

// ---------------------------------------------------------------------------
// Galleries — mock fallback
// ---------------------------------------------------------------------------

function mockGallery(
  id: number,
  cat: 'tv' | 'movies' | 'digital' | 'lifestyle' | 'sports',
  title: string,
  count: number,
  seed: string,
  featured = false,
): Gallery {
  return {
    id,
    title,
    pageUrl:   null,
    cat,
    catLabel:  GALLERY_CAT_LABELS[cat],
    count,
    emoji:     GALLERY_CAT_EMOJI[cat],
    bg:        GALLERY_CAT_BG[cat],
    time:      '2 hours ago',
    featured,
    thumbnail: `https://picsum.photos/seed/${seed}/480/360`,
    viewCount: 12_400,
    views:     '12.4K',
  };
}

function getMockGalleriesPage(
  page: number,
  pageSize: number,
  categoryId: number | null,
): GalleriesPage {
  const all: Gallery[] = [
    mockGallery(1,  'tv',        'Anupamaa Cast Behind The Scenes — Week 12',          24, 'g1', true),
    mockGallery(2,  'tv',        'Yeh Rishta Kya Kehlata Hai — Romantic Moments',      18, 'g2'),
    mockGallery(3,  'movies',    'Stree 2 — Grand Premiere Night in Mumbai',           42, 'g3', true),
    mockGallery(4,  'movies',    'Animal — Ranbir Kapoor Exclusive BTS Gallery',       27, 'g4'),
    mockGallery(5,  'digital',   'Mirzapur 3 — Official Stills Released',              21, 'g5', true),
    mockGallery(6,  'digital',   'Panchayat Season 3 — Village Life Captured',         19, 'g6'),
    mockGallery(7,  'lifestyle', 'Deepika Padukone — Cannes 2026 Looks',               20, 'g7', true),
    mockGallery(8,  'lifestyle', 'Alia Bhatt — Mom Moments & Family Pics',             18, 'g8'),
    mockGallery(9,  'sports',    'IPL 2026 — MI vs CSK Full Highlights',               56, 'g9', true),
    mockGallery(10, 'sports',    'Virat Kohli — Century Celebrations Gallery',         29, 'g10'),
  ];

  const cat = categoryId != null ? GALLERY_CAT_MAP[categoryId] : null;
  const filtered = cat ? all.filter(g => g.cat === cat) : all;

  return {
    galleries: filtered,
    pagination: {
      currentPage:     page,
      pageSize,
      totalPages:      1,
      totalItems:      filtered.length,
      hasNextPage:     false,
      hasPreviousPage: false,
    },
  };
}

function getMockGalleryDetail(id: string | number): GalleryDetail {
  const base = getMockGalleriesPage(1, 25, null).galleries.find(g => String(g.id) === String(id))
    ?? getMockGalleriesPage(1, 25, null).galleries[0];

  const photos: GalleryPhoto[] = Array.from({ length: 12 }).map((_, i) => ({
    id:       `${base.id}-p${i}`,
    imageUrl: `https://picsum.photos/seed/${base.id}-${i}/600/600`,
    caption:  `Photo ${i + 1} from ${base.title}`,
    tags:     [],
    emoji:    GALLERY_DEFAULT_EMOJI,
    bg:       base.bg,
  }));

  const related = getMockGalleriesPage(1, 25, null).galleries
    .filter(g => g.id !== base.id)
    .slice(0, 5);

  return {
    ...base,
    thumbnail:   photos[0].imageUrl,
    count:       photos.length,
    description: `A collection of ${photos.length} stunning photos from ${base.title}.`,
    keywords:    ['bollywood', 'celebrity', 'trending'],
    relatedGalleries: related,
    photos,
  };
}

// ---------------------------------------------------------------------------
// Forums — transforms & API
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformForumCategory(raw: any): ForumCategory {
  const slug = forumCatSlug(raw.iconClass);
  return {
    id:         Number(raw.categoryId),
    parentId:   Number(raw.parentId ?? 0),
    name:       raw.displayName || raw.categoryName?.trim() || '',
    slug,
    level:      Number(raw.nodeLevel ?? 1),
    forumCount: Number(raw.forumCount ?? 0),
    color:      raw.colorCode || '#3558F0',
    bg:         FORUM_CAT_GRADIENTS[slug] || FORUM_CAT_GRADIENTS.general,
    emoji:      FORUM_CAT_EMOJIS[slug] || FORUM_CAT_EMOJIS.general,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformForum(raw: any, categoriesMap: Record<number, ForumCategory> = {}): Forum {
  const cat = categoriesMap[raw.categoryId] || null;
  const slug = cat?.slug || 'general';

  const rankDiff = Number(raw.previousRank || 0) - Number(raw.currentRank || 0);
  let rankDisplay = '';
  if (rankDiff > 0) rankDisplay = '+' + rankDiff;
  else if (rankDiff < 0) rankDisplay = String(rankDiff);

  return {
    id:            Number(raw.forumId),
    name:          raw.forumName || '',
    description:   raw.forumDescription || raw.forumDesc || '',
    categoryId:    Number(raw.categoryId ?? 0),
    slug,
    topicCount:    Number(raw.topicsCount ?? 0),
    postCount:     Number(raw.postsCount ?? 0),
    followCount:   Number(raw.followCount ?? 0),
    rank:          Number(raw.currentRank ?? 0),
    prevRank:      Number(raw.previousRank ?? 0),
    rankDisplay,
    bg:            cat?.bg || FORUM_CAT_GRADIENTS[slug] || FORUM_CAT_GRADIENTS.general,
    emoji:         cat?.emoji || FORUM_CAT_EMOJIS[slug] || FORUM_CAT_EMOJIS.general,
    bannerUrl:     raw.bannerUrl || null,
    thumbnailUrl:  raw.thumbnailUrl || null,
    locked:        Boolean(raw.locked ?? false),
    hot:           Number(raw.topicsCount ?? 0) > 5000 || Number(raw.postsCount ?? 0) > 100000,
    priorityPosts: Number(raw.priorityPosts ?? 0),
    editPosts:     Number(raw.editPosts ?? 0),
    deletePosts:   Number(raw.deletePosts ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformPoll(rawPoll: any): TopicPoll | null {
  if (!rawPoll) return null;
  let p = rawPoll;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch { return null; }
  }
  const pollId = p.pollId ?? p.id ?? p.PollId;
  if (pollId == null) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawOpts: any[] = p.options || p.pollOptions || p.choices || p.pollChoices || [];
  const options: PollOption[] = rawOpts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((o: any) => ({
      id:    Number(o.id ?? o.choiceId ?? o.pollChoiceId ?? o.optionId),
      text:  String(o.text ?? o.choice ?? o.choiceText ?? o.option ?? o.label ?? ''),
      votes: Number(o.votes ?? o.voteCount ?? o.count ?? 0),
    }))
    .filter(o => Number.isFinite(o.id));
  // hasUserVoted is a per-choice integer (0 = no vote) on PollChoiceDto.
  const myVotedIds: number[] = rawOpts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((o: any) => Number(o.hasUserVoted ?? 0) > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((o: any) => Number(o.id ?? o.choiceId ?? o.pollChoiceId ?? o.optionId))
    .filter((n: number) => Number.isFinite(n));
  const hasVoted = Boolean(
    p.hasVoted ?? p.userVoted ?? myVotedIds.length > 0,
  );
  return {
    pollId:     Number(pollId),
    question:   String(p.question ?? p.title ?? p.subject ?? ''),
    multiple:   Boolean(p.multiple ?? p.allowMultiple ?? p.multipleVotes ?? false),
    hasVoted,
    myVotedIds,
    totalVotes: options.reduce((s, o) => s + (o.votes || 0), 0),
    options,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTopicTags(raw: any): TopicTag[] {
  if (!raw?.jsonData) return [];
  try {
    const parsed = JSON.parse(raw.jsonData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (parsed?.json || []).map((t: any) => ({
      id:      Number(t.id),
      name:    String(t.name ?? ''),
      pageUrl: t.pu ?? null,
    }));
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildForumAvatarUrl(raw: any): string | null {
  if (raw.thumbnailUrl) return String(raw.thumbnailUrl);
  if (raw.forumThumbnailUrl) return String(raw.forumThumbnailUrl);
  const fid = Number(raw.forumId ?? 0);
  if (!fid) return null;
  const bucket = Math.floor(fid / 1000);
  const tail   = String(fid % 1000).padStart(3, '0');
  const uc     = raw.updateChecksum ?? raw.forumUpdateChecksum;
  const qs     = uc ? `?uc=${uc}` : '';
  return `https://img.indiaforums.com/forumavatar/200x200/${bucket}/${tail}.webp${qs}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTopic(raw: any): ForumTopic {
  const forumThumbnail = buildForumAvatarUrl(raw);
  return {
    id:             Number(raw.topicId),
    forumId:        Number(raw.forumId ?? 0),
    forumName:      raw.forumName || '',
    forumThumbnail,
    title:         raw.subject || '',
    description:   raw.topicDesc || '',
    poster:        raw.startThreadUserName || 'Anonymous',
    lastBy:        raw.lastThreadUserName || '',
    time:          timeAgo(raw.startThreadDate || new Date().toISOString()),
    lastTime:      timeAgo(raw.lastThreadDate || new Date().toISOString()),
    replies:       Number(raw.replyCount ?? 0),
    views:         Number(raw.viewCount ?? 0),
    likes:         Number(raw.likeCount ?? 0),
    locked:        Boolean(raw.locked ?? false),
    pinned:        Number(raw.priority ?? 0) > 0,
    flairId:       Number(raw.flairId ?? 0),
    topicImage:    raw.topicImage || null,
    tags:          parseTopicTags(raw),
    linkTypeValue: raw.linkTypeValue || '',
    poll:          transformPoll(raw.poll || raw.pollData || raw.pollJson),
  };
}

/** Fetch forum categories + forums for the "Forums" tab. */
export async function fetchForumHome(
  categoryId: number | null = null,
  pageNumber = 1,
  pageSize = 20,
): Promise<ForumsHomePage> {
  const params: Record<string, string | number> = { pageNumber, pageSize };
  if (categoryId) params.categoryId = categoryId;

  const { data } = await apiClient.get('/forums/home', { params });
  const payload = data?.data || data || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCats: any[] = payload.categories || [];
  const allCats = rawCats.map(transformForumCategory);
  const categories = allCats.filter(c => c.level === 1);
  const subCats = allCats.filter(c => c.level === 2);

  const subCatMap: Record<number, ForumCategory[]> = {};
  subCats.forEach(sc => {
    if (!subCatMap[sc.parentId]) subCatMap[sc.parentId] = [];
    subCatMap[sc.parentId].push(sc);
  });

  const catsMap: Record<number, ForumCategory> = {};
  allCats.forEach(c => { catsMap[c.id] = c; });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawForums: any[] = payload.forums || [];
  const forums = rawForums.map(f => transformForum(f, catsMap));

  return {
    forums,
    categories,
    subCatMap,
    totalForumCount: Number(payload.totalForumCount ?? 0),
    totalPages:      Number(payload.totalPages ?? 1),
    pageNumber:      Number(payload.pageNumber ?? pageNumber),
  };
}

/** Cross-forum "All Topics" feed. */
export async function fetchAllForumTopics(
  pageNumber = 1,
  pageSize = 20,
): Promise<AllTopicsPage> {
  const { data } = await apiClient.get('/forums/topics', {
    params: { pageNumber, pageSize },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTopics: any[] = data?.topics || [];
  const totalCount = Number(data?.totalCount ?? 0);

  return {
    topics:      rawTopics.map(transformTopic),
    totalCount,
    pageNumber,
    pageSize,
    hasNextPage: totalCount > pageNumber * pageSize,
  };
}

/** Topics for a single forum (drill-down view). */
export async function fetchForumTopics(
  forumId: number,
  pageNumber = 1,
  pageSize = 20,
): Promise<ForumTopicsPage> {
  const { data } = await apiClient.get(`/forums/${forumId}/topics`, {
    params: { pageNumber, pageSize },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTopics: any[] = data?.topics || [];
  const forumDetail = data?.forumDetail
    ? transformForum(data.forumDetail, {})
    : null;

  // Parse flair definitions from forumDetail.flairJson
  let flairs: ForumFlair[] = [];
  if (data?.forumDetail?.flairJson) {
    try {
      const parsed = JSON.parse(data.forumDetail.flairJson);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flairs = (parsed?.json || []).map((f: any) => ({
        id:      Number(f.id),
        name:    f.nm || '',
        bgColor: f.bgcolor || '#E5E7EB',
        fgColor: f.fgcolor || '#1A1A1A',
      }));
    } catch { /* malformed */ }
  }

  return {
    topics:      rawTopics.map(transformTopic),
    forumDetail,
    flairs,
    pageNumber,
    hasNextPage: Boolean(data?.hasMore ?? false),
  };
}

// ---------------------------------------------------------------------------
// "My …" — forums/topics the authenticated user is watching or has posted in.
// Requires a valid session; server returns 401 otherwise.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMyForum(raw: any): MyForum {
  const base = transformForum(raw, {});
  return {
    ...base,
    isFavourite:    Boolean(raw.isFavourite ?? false),
    watchId:        Number(raw.watchId ?? 0),
    emailFrequency: Number(raw.emailFrequency ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformInvitedForum(raw: any, status: 'invited' | 'requested'): InvitedForum {
  return {
    forumId:          Number(raw.forumId ?? 0),
    forumName:        raw.forumName || '',
    forumDescription: raw.forumDescription || raw.forumDesc || '',
    thumbnailUrl:     buildForumAvatarUrl(raw),
    status,
  };
}

/** GET /my-favourite-forums — user's watched forums + pending invites/requests. */
export async function fetchMyFavouriteForums(
  pageNumber = 1,
  pageSize = 20,
): Promise<MyForumsPage> {
  const { data } = await apiClient.get('/my-favourite-forums', {
    params: { pn: pageNumber, ps: pageSize },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawForums: any[] = data?.forums || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawInvited: any[] = data?.invitedForums || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRequested: any[] = data?.requestedForums || [];

  return {
    forums:           rawForums.map(transformMyForum),
    invitedForums:    rawInvited.map(r => transformInvitedForum(r, 'invited')),
    requestedForums:  rawRequested.map(r => transformInvitedForum(r, 'requested')),
    totalRecordCount: Number(data?.totalRecordCount ?? 0),
    totalPages:       Number(data?.totalPages ?? 1),
    pageNumber:       Number(data?.currentPage ?? pageNumber),
    pageSize:         Number(data?.pageSize ?? pageSize),
  };
}

/** GET /my-posts — topics the user has posted in, ordered by last activity. */
export async function fetchMyPosts(
  pageNumber = 1,
  pageSize = 20,
  query = '',
  forumId: number | null = null,
): Promise<MyTopicsPage> {
  const params: Record<string, string | number> = {
    pn: pageNumber,
    ps: pageSize,
  };
  if (query.trim()) params.q = query.trim();
  if (forumId)      params.fid = forumId;

  const { data } = await apiClient.get('/my-posts', { params });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTopics: any[] = data?.topics || [];

  return {
    topics:           rawTopics.map(transformTopic),
    totalRecordCount: Number(data?.totalRecordCount ?? 0),
    totalPages:       Number(data?.totalPages ?? 1),
    pageNumber:       Number(data?.currentPage ?? pageNumber),
    pageSize:         Number(data?.pageSize ?? pageSize),
  };
}

/** GET /my-watched-topics — topics the user has subscribed to. */
export async function fetchMyWatchedTopics(
  pageNumber = 1,
  pageSize = 20,
): Promise<MyTopicsPage> {
  const { data } = await apiClient.get('/my-watched-topics', {
    params: { pn: pageNumber, ps: pageSize, pr: 0 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTopics: any[] = data?.topics || [];

  return {
    topics:           rawTopics.map(transformTopic),
    totalRecordCount: Number(data?.totalRecordCount ?? 0),
    totalPages:       Number(data?.totalPages ?? 1),
    pageNumber:       Number(data?.currentPage ?? pageNumber),
    pageSize:         Number(data?.pageSize ?? pageSize),
  };
}

// ---------------------------------------------------------------------------
// Topic Posts (read-only for Phase 2)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformPost(raw: any): TopicPost {
  let badges: PostBadge[] = [];
  if (raw.badgeJson) {
    try {
      const parsed = JSON.parse(raw.badgeJson);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      badges = (parsed?.json || []).slice(0, 3).map((b: any) => ({
        id:       Number(b.id),
        name:     b.nm || '',
        imageUrl: `https://img.indiaforums.com/badge/200x200/0/${b.lid}.webp${b.uc ? '?uc=' + b.uc : ''}`,
      }));
    } catch { /* malformed */ }
  }

  const rawJoinDate = raw.registerDate ?? raw.joinDate ?? raw.memberSince ?? null;
  const joinYear    = rawJoinDate ? new Date(rawJoinDate).getFullYear() : null;
  const editedWhen  = raw.editedWhen ?? raw.updatedWhen ?? raw.lastEditedWhen ?? null;
  const editCount   = Number(raw.editCount ?? raw.editHistoryCount ?? 0);
  const isEdited    = Boolean(raw.isEdited ?? editedWhen ?? editCount > 0);
  const rawTime     = raw.messageDate ?? raw.postedWhen ?? raw.createdAt ?? new Date().toISOString();

  return {
    id:           Number(raw.threadId ?? raw.postId ?? raw.id ?? 0),
    topicId:      Number(raw.topicId ?? 0),
    authorId:     Number(raw.userId ?? raw.authorId ?? 0),
    author:       raw.userName ?? raw.authorName ?? 'Anonymous',
    realName:     raw.realName || '',
    rank:         raw.name || '',
    message:      raw.message ?? raw.body ?? raw.content ?? '',
    time:         timeAgo(rawTime),
    rawTime,
    likes:        Number(raw.likeCount ?? 0),
    avatarUrl:    raw.avatarUrl ?? null,
    avatarAccent: raw.avatarAccent ?? null,
    countryCode:  raw.countryCode || '',
    badges,
    isOp:         Boolean(raw.isOriginalPoster ?? false),
    isEdited,
    editedWhen,
    editedBy:     raw.editedByUserName ?? raw.editedBy ?? null,
    editCount,
    postCount:    raw.postCount ?? raw.postsCount ?? raw.totalMessages ?? null,
    joinYear,
    reactionJson: raw.reactionJson ?? raw.jsonData ?? null,
    ip:                raw.ip ?? raw.ipAddress ?? raw.posterIp ?? null,
    hasMaturedContent: Boolean(raw.hasMaturedContent ?? raw.isMatured ?? false),
    moderatorNote:     raw.moderatorNote ?? null,
  };
}

export async function fetchTopicPosts(
  topicId: number,
  pageNumber = 1,
  pageSize = 20,
): Promise<TopicPostsPage> {
  const { data } = await apiClient.get(`/forums/topics/${topicId}/posts`, {
    params: { pageNumber, pageSize },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawPosts: any[] = data?.posts || [];
  const rawDetail       = data?.topicDetail || null;
  const rawPollDetail   = data?.pollDetail || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawPollChoices: any[] = data?.pollChoices || [];
  const startAuthorId   = rawDetail?.startAuthorId ?? null;

  const posts = rawPosts.map(r => {
    const post = transformPost(r);
    if (startAuthorId && post.authorId === Number(startAuthorId)) post.isOp = true;
    return post;
  });

  // Poll detail + choices come at the top level of the response, not inside
  // topicDetail. Merge them into the raw detail so transformTopic can pick
  // them up. pollDetail does NOT carry its own pollId — the id lives on
  // topicDetail.pollId and on each pollChoice.pollId, so inject it here.
  const mergedPollId =
    rawDetail?.pollId ?? rawPollChoices[0]?.pollId ?? null;
  const detailWithPoll = rawDetail
    ? {
        ...rawDetail,
        poll: rawPollDetail
          ? { pollId: mergedPollId, ...rawPollDetail, options: rawPollChoices }
          : null,
      }
    : null;

  return {
    posts,
    topicDetail: detailWithPoll ? transformTopic(detailWithPoll) : null,
    pageNumber,
    hasNextPage: Boolean(data?.hasMore ?? false),
  };
}

export interface ReplyResult {
  ok: boolean;
  postId: number | null;
  error?: string;
}

export type ReactionCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const REACTION_STRING: Record<number, string> = {
  0: 'None', 1: 'Like', 2: 'Love', 3: 'Wow', 4: 'Lol', 5: 'Shock', 6: 'Sad', 7: 'Angry',
};

export const REACTION_META: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '👍', label: 'Like'  },
  2: { emoji: '❤️', label: 'Love'  },
  3: { emoji: '😮', label: 'Wow'   },
  4: { emoji: '😂', label: 'Lol'   },
  5: { emoji: '😱', label: 'Shock' },
  6: { emoji: '😢', label: 'Sad'   },
  7: { emoji: '😠', label: 'Angry' },
};

export const REACTION_CODES: ReactionCode[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Parse a post's reactionJson payload and return up to 3 most-used reaction
 * type codes, most-common first. Used for the reaction summary pill.
 */
export function parseTopReactionTypes(reactionJson?: string | null): number[] {
  if (!reactionJson) return [];
  try {
    const parsed = JSON.parse(reactionJson);
    const entries: Array<{ lt?: number | string }> = parsed?.json ?? [];
    const byType: Record<number, number> = {};
    for (const e of entries) {
      if (e?.lt == null) continue;
      const lt = Number(e.lt);
      byType[lt] = (byType[lt] || 0) + 1;
    }
    return Object.keys(byType)
      .map(Number)
      .sort((a, b) => byType[b] - byType[a])
      .slice(0, 3);
  } catch {
    return [];
  }
}

export interface ReactionResult {
  ok: boolean;
  threadLikeId: number | null;
  likeCount: number | null;
  error?: string;
}

/**
 * Send a reaction to a post. Use 0 to remove. Pass threadLikeId when
 * toggling off or switching type — backend requires it to locate the row.
 */
export async function reactToThread(args: {
  threadId: number;
  forumId: number;
  reactionType: ReactionCode;
  threadLikeId?: number | null;
}): Promise<ReactionResult> {
  const { threadId, forumId, reactionType, threadLikeId } = args;
  const body: Record<string, unknown> = {
    threadId,
    forumId,
    reactionType: reactionType === 0 ? 'None' : REACTION_STRING[reactionType],
  };
  if (threadLikeId != null) body.threadLikeId = threadLikeId;

  try {
    const { data } = await apiClient.post('/forums/threads/react', body);
    return {
      ok: true,
      threadLikeId: Number(data?.threadLikeId ?? data?.data?.threadLikeId ?? 0) || null,
      likeCount:    Number(data?.likeCount    ?? data?.data?.likeCount    ?? 0) || 0,
    };
  } catch (err: unknown) {
    const e = err as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    const status = e?.response?.status;
    const msg    = status === 401
      ? 'Please sign in to react.'
      : (e?.response?.data?.message || e?.message || 'Failed to record reaction.');
    console.error('[API] reactToThread failed:', status, e?.response?.data ?? e?.message);
    return { ok: false, threadLikeId: null, likeCount: null, error: msg };
  }
}

/**
 * Reply to a topic. Posts the message as HTML (TextInput input is wrapped in <p>).
 * Backend returns 401 without auth — callers should treat that as a sign-in prompt.
 */
export async function replyToTopic(
  topicId: number,
  forumId: number,
  message: string,
  opts?: {
    membersOnly?:      boolean;
    hasMaturedContent?: boolean;
    showSignature?:    boolean;
    addToWatchList?:   boolean;
    /** Server-returned filePaths from POST /upload/post-image — appended to the message HTML. */
    attachments?:      string[];
  },
): Promise<ReplyResult> {
  const trimmed = message.trim();
  const attachments = opts?.attachments ?? [];
  if (!trimmed && attachments.length === 0) {
    return { ok: false, postId: null, error: 'Please enter a message or attach an image.' };
  }

  const textPart = trimmed
    ? `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`
    : '';
  const imgPart = attachments
    .filter((p) => !!p)
    .map((p) => `<p><img src="${p}" alt="attachment" /></p>`)
    .join('');

  const body = {
    topicId,
    forumId,
    message:           textPart + imgPart,
    showSignature:     opts?.showSignature     ?? true,
    addToWatchList:    opts?.addToWatchList    ?? true,
    hasMaturedContent: opts?.hasMaturedContent ?? false,
    membersOnly:       opts?.membersOnly       ?? false,
    postTypeId:        1,
  };

  try {
    const { data } = await apiClient.post(`/forums/topics/${topicId}/reply`, body);
    const postId = Number(data?.threadId ?? data?.data?.threadId ?? 0) || null;
    return { ok: true, postId };
  } catch (err: unknown) {
    const e = err as {
      response?: { status: number; data?: { message?: string; error?: string } };
      message?: string;
    };
    const status  = e?.response?.status;
    const apiMsg  = e?.response?.data?.message ?? e?.response?.data?.error;
    const message = status === 401
      ? 'Please sign in to reply.'
      : (apiMsg || e?.message || 'Failed to send reply.');
    console.error('[API] replyToTopic failed:', status, apiMsg ?? e?.message);
    return { ok: false, postId: null, error: message };
  }
}

export interface CreateTopicResult {
  ok: boolean;
  topicId: number | null;
  error?: string;
}

export interface PollChoice { choice: string; }
export interface PollData {
  question?:      string;
  multipleVotes?: boolean;
  allowReplies?:  boolean;
  choices:        PollChoice[];
}

export async function createTopic(args: {
  forumId:           number;
  subject:           string;
  message:           string;
  flairId?:          number | null;
  topicTypeId?:      number;
  hasMaturedContent?: boolean;
  showSignature?:    boolean;
  addToWatchList?:   boolean;
  membersOnly?:      boolean;
  pollData?:         PollData | null;
}): Promise<CreateTopicResult> {
  const subject = args.subject.trim();
  const message = args.message.trim();
  if (!subject)  return { ok: false, topicId: null, error: 'Please enter a title.' };
  if (!message)  return { ok: false, topicId: null, error: 'Please enter a message.' };

  const body: Record<string, unknown> = {
    forumId:           args.forumId,
    subject,
    message:           `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    topicTypeId:       args.topicTypeId      ?? 1,
    showSignature:     args.showSignature     ?? true,
    addToWatchList:    args.addToWatchList    ?? true,
    hasMaturedContent: args.hasMaturedContent ?? false,
    membersOnly:       args.membersOnly       ?? false,
    addToMyWall:       false,
  };
  if (args.flairId  != null) body.flairId  = args.flairId;
  if (args.pollData != null) body.pollData = args.pollData;

  try {
    const { data } = await apiClient.post('/forums/topics', body);
    const topicId = Number(data?.topicId ?? data?.data?.topicId ?? 0) || null;
    return { ok: true, topicId };
  } catch (err: unknown) {
    const e = err as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    const status = e?.response?.status;
    const msg    = status === 401
      ? 'Please sign in to post.'
      : (e?.response?.data?.message || e?.message || 'Failed to create topic.');
    console.error('[API] createTopic failed:', status, e?.response?.data ?? e?.message);
    return { ok: false, topicId: null, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Image upload — forum post attachment
// ---------------------------------------------------------------------------

// Mirrors UploadPostImageResponseDto in features/profile/types.ts. Kept
// inlined here so consumers in this file (forum composer flows) don't have
// to reach into the profile feature for a forum response shape.
export interface UploadPostImageResponse {
  success: boolean;
  message: string;
  filePath: string | null;
  mediaId: number | string | null;
  width:   number | string | null;
  height:  number | string | null;
}

// Local image as React Native FormData expects it. `uri` is the file://
// or content:// path returned by expo-image-picker.
export interface PostImageFile {
  uri:  string;
  name: string;
  type: string;
}

/**
 * Upload an image for a forum reply / topic. Server converts to WebP
 * (q=95) and caps dimensions at 800x1200. Use the returned `filePath`
 * (or render via mediaId) when inserting the image into post markup.
 */
export async function uploadPostImage(file: PostImageFile): Promise<UploadPostImageResponse> {
  const fd = new FormData();
  // ASP.NET IFormFile binds by parameter name; "file" is the controller default.
  fd.append('file', file as unknown as Blob);
  const { data } = await apiClient.post<UploadPostImageResponse>(
    '/upload/post-image',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchTopicResult {
  id:         number;
  title:      string;
  description: string;
  poster:     string;
  time:       string;
  replies:    number;
  flairId?:   number | null;
}

export async function searchTopics(args: {
  query:   string;
  forumId: number;
  pageSize?: number;
}): Promise<SearchTopicResult[]> {
  try {
    const { data } = await apiClient.get('/search', {
      params: {
        query:       args.query,
        contentType: 8,
        forumId:     args.forumId,
        pageSize:    args.pageSize ?? 30,
      },
    });
    const raw: unknown[] = data?.results ?? data?.topics ?? [];
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return (raw as Record<string, unknown>[]).map(r => ({
      id:          Number(r.topicId ?? r.id ?? 0),
      title:       String(r.subject ?? r.title ?? ''),
      description: String(r.message ?? r.description ?? r.snippet ?? ''),
      poster:      String(r.startedByUserName ?? r.poster ?? ''),
      time:        String(r.startThreadDate   ?? r.time   ?? ''),
      replies:     Number(r.replyCount        ?? r.replies ?? 0),
      flairId:     r.flairId != null ? Number(r.flairId) : null,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Topic moderation (mod/admin-only)
// ---------------------------------------------------------------------------

export interface ModResult {
  ok: boolean;
  error?: string;
}

export interface TopicActionLog {
  action: number;
  actionText: string;
  userName: string;
  createdWhen: string;
}

function wrapModError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };
  const status = e?.response?.status;
  if (status === 401) return 'Please sign in.';
  if (status === 403) return 'You do not have permission for this action.';
  return e?.response?.data?.message || e?.message || fallback;
}

export interface FollowForumResult {
  ok: boolean;
  /** True when the failure was due to missing/expired auth — caller should prompt sign-in. */
  authRequired?: boolean;
  error?: string;
}

/**
 * Follow ("like") or unfollow ("dislike") a forum.
 * Endpoint: POST /forums/{forumId}/follow?type=like|dislike
 */
export async function setForumFollow(
  forumId: number,
  follow: boolean,
): Promise<FollowForumResult> {
  try {
    await apiClient.post(`/forums/${forumId}/follow`, null, {
      params: { type: follow ? 'like' : 'dislike' },
    });
    return { ok: true };
  } catch (err) {
    const e = err as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    const status = e?.response?.status;
    if (status === 401) {
      return { ok: false, authRequired: true, error: 'Please sign in to follow this forum.' };
    }
    return {
      ok: false,
      error: e?.response?.data?.message || e?.message || 'Failed to update follow.',
    };
  }
}

export async function closeTopic(topicId: number, forumId: number): Promise<ModResult> {
  try {
    await apiClient.post(`/forums/topics/${topicId}/close`, {
      topicId, forumId, isCloseWithPost: false, isAnonymous: false,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to lock topic.') };
  }
}

export async function openTopic(topicId: number, forumId: number): Promise<ModResult> {
  try {
    await apiClient.post(`/forums/topics/${topicId}/open`, {
      topicId, forumId, isOpenWithPost: false, isAnonymous: false,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to unlock topic.') };
  }
}

export async function moveTopic(topicId: number, toForumId: number): Promise<ModResult> {
  try {
    await apiClient.post(`/forums/topics/${topicId}/move`, { topicId, toForumId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to move topic.') };
  }
}

export async function mergeTopic(topicId: number, newTopicId: number): Promise<ModResult> {
  try {
    await apiClient.post(`/forums/topics/${topicId}/merge`, { topicId, newTopicId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to merge topic.') };
  }
}

export async function trashTopic(topicId: number, forumId?: number): Promise<ModResult> {
  try {
    const body: Record<string, unknown> = { topicIds: [topicId] };
    if (forumId) body.forumIds = [forumId];
    await apiClient.post('/forums/topics/trash', body);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to trash topic.') };
  }
}

export async function trashPost(args: { threadId: number; topicId: number }): Promise<ModResult> {
  try {
    await apiClient.post('/forums/threads/trash', { threadIds: [args.threadId], topicId: args.topicId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to trash post.') };
  }
}

export interface EditPostResult {
  ok: boolean;
  error?: string;
}

export async function editPost(args: {
  postId: number;
  topicId: number;
  message: string;
  hasMaturedContent?: boolean;
  moderatorNote?: string;
}): Promise<EditPostResult> {
  const trimmed = args.message.trim();
  if (!trimmed) return { ok: false, error: 'Please enter a message.' };
  const body: Record<string, unknown> = {
    threadId:          args.postId,
    topicId:           args.topicId,
    message:           `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`,
    showSignature:     true,
    hasMaturedContent: args.hasMaturedContent ?? false,
  };
  if (args.moderatorNote) body.moderatorNote = args.moderatorNote;
  try {
    await apiClient.put(`/forums/posts/${args.postId}`, body);
    return { ok: true };
  } catch (err: unknown) {
    const e = err as {
      response?: { status?: number; data?: { message?: string; error?: string } };
      message?: string;
    };
    const status = e?.response?.status;
    const msg = status === 401
      ? 'Please sign in to edit.'
      : (e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to save edit.');
    return { ok: false, error: msg };
  }
}

export interface PostEditHistoryEntry {
  id: number;
  editedWhen: string;
  editor: string;
  message: string;
}

export async function getPostEditHistory(postId: number): Promise<PostEditHistoryEntry[]> {
  try {
    const { data } = await apiClient.get(`/forums/posts/${postId}/history`, {
      params: { pageNumber: 1, pageSize: 20 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] =
      (Array.isArray(data) && data) ||
      data?.history ||
      data?.data?.history ||
      data?.editHistory ||
      data?.items ||
      [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.map((entry: any, i: number) => ({
      id:         Number(entry.id ?? entry.historyId ?? i),
      editedWhen: entry.editedWhen ?? entry.updatedWhen ?? entry.modifiedWhen ?? entry.createdWhen ?? '',
      editor:     entry.editedByUserName ?? entry.editorName ?? entry.userName ?? '',
      message:    entry.message ?? entry.oldMessage ?? entry.content ?? entry.text ?? '',
    }));
  } catch {
    return [];
  }
}

export interface ThreadLiker {
  userId: number;
  userName: string;
  displayName: string;
  likeType: number;
  avatarUrl: string | null;
  avatarAccent: string | null;
  groupName: string;
  userLevel: number | null;
  badges: PostBadge[];
}

export interface ThreadLikesResult {
  ok: boolean;
  likers: ThreadLiker[];
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLikerAvatar(userId: number, avatarType: any, updateChecksum: any): string | null {
  const t = Number(avatarType ?? 0);
  if (!t || !userId) return null;
  const bucket = Math.floor(userId / 10000);
  const qs = updateChecksum ? `?uc=${updateChecksum}` : '';
  return `https://img.indiaforums.com/member/100x100/${bucket}/${userId}.webp${qs}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLikerBadges(liker: any): PostBadge[] {
  try {
    if (!liker.badgeJson) return [];
    const parsed = JSON.parse(liker.badgeJson);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (parsed?.json || []).map((b: any) => ({
      id:       Number(b.id ?? b.lid),
      name:     String(b.nm ?? ''),
      imageUrl: `https://img.indiaforums.com/badge/200x200/0/${b.lid}.webp${b.uc ? '?uc=' + b.uc : ''}`,
    }));
  } catch {
    return [];
  }
}

export async function getThreadLikes(threadId: number): Promise<ThreadLikesResult> {
  try {
    const { data } = await apiClient.get(`/forums/threads/${threadId}/likes`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] =
      (Array.isArray(data?.likes)       && data.likes) ||
      (Array.isArray(data)              && data) ||
      (Array.isArray(data?.data?.likes) && data.data.likes) ||
      (Array.isArray(data?.data)        && data.data) ||
      (Array.isArray(data?.items)       && data.items) ||
      [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const likers: ThreadLiker[] = raw.map((l: any) => ({
      userId:       Number(l.userId ?? 0),
      userName:     String(l.userName ?? ''),
      displayName:  String(l.realName ?? l.userName ?? 'User'),
      likeType:     Number(l.likeType ?? l.reactionType ?? l.lt ?? 1),
      avatarUrl:    buildLikerAvatar(Number(l.userId ?? 0), l.avatarType, l.updateChecksum),
      avatarAccent: l.avatarAccent ?? null,
      groupName:    String(l.groupName ?? l.rank ?? ''),
      userLevel:    l.userLevel ?? l.rankId ?? null,
      badges:       parseLikerBadges(l),
    }));
    return { ok: true, likers };
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
    return { ok: false, likers: [], error: e?.response?.data?.message || e?.message || 'Could not load reactions.' };
  }
}

export interface PollVoteResult {
  ok: boolean;
  error?: string;
}

export async function castPollVote(pollId: number, optionIds: number[]): Promise<PollVoteResult> {
  try {
    await apiClient.post(`/forums/polls/${pollId}/vote`, {
      pollId,
      pollChoiceIds: optionIds.join(','),
    });
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
    const status = e?.response?.status;
    const msg = status === 401
      ? 'Please sign in to vote.'
      : (e?.response?.data?.message || e?.message || 'Failed to record vote.');
    return { ok: false, error: msg };
  }
}

export interface UserMiniProfile {
  userId: number | null;
  displayName: string;
  userName: string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  avatarAccent: string | null;
  lastVisitedDate: string | null;
  badges: PostBadge[];
}

export async function getUserMiniProfile(userId: number): Promise<UserMiniProfile | null> {
  try {
    const { data } = await apiClient.get(`/users/${userId}/profile`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u: any = data?.user || data || {};
    let badges: PostBadge[] = [];
    if (u.badgeJson) {
      try {
        const parsed = JSON.parse(u.badgeJson);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        badges = (parsed?.json || []).map((b: any) => ({
          id:       Number(b.id ?? b.lid),
          name:     String(b.nm ?? ''),
          imageUrl: `https://img.indiaforums.com/badge/200x200/0/${b.lid}.webp${b.uc ? '?uc=' + b.uc : ''}`,
        }));
      } catch { /* ignore */ }
    }
    return {
      userId:          u.userId != null ? Number(u.userId) : null,
      displayName:     String(u.displayName ?? u.userName ?? ''),
      userName:        String(u.userName ?? ''),
      thumbnailUrl:    u.thumbnailUrl ?? null,
      bannerUrl:       u.bannerUrl ?? null,
      avatarAccent:    u.avatarAccent ?? null,
      lastVisitedDate: u.lastVisitedDate ?? null,
      badges,
    };
  } catch {
    return null;
  }
}

export async function updateTopicSubject(topicId: number, subject: string): Promise<ModResult> {
  try {
    await apiClient.put(`/forums/topics/${topicId}/admin`, { topicId, subject });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to update topic.') };
  }
}

export async function getTopicActionHistory(topicId: number): Promise<TopicActionLog[]> {
  try {
    const { data } = await apiClient.get('/forums/topics/history', {
      params: { topicId, actionId: 0, pageNumber: 1, pageSize: 30 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = data?.logs ?? data?.results ?? data?.data ?? data ?? [];
    return Array.isArray(raw) ? raw.map(r => ({
      action:      Number(r.action ?? 0),
      actionText:  r.actionText ?? `Action ${r.action ?? ''}`,
      userName:    r.userName ?? '—',
      createdWhen: r.createdWhen ?? '',
    })) : [];
  } catch {
    return [];
  }
}

export interface TopicAdminSettings {
  priority?: number;
  titleTags?: string;
  locked?: boolean;
  hasMaturedContent?: boolean;
  flairId?: number;
}

export async function updateTopicAdminSettings(
  topicId: number,
  settings: TopicAdminSettings,
): Promise<ModResult> {
  try {
    await apiClient.put(`/forums/topics/${topicId}/admin`, { topicId, ...settings });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to update topic.') };
  }
}

export async function restoreTopic(topicId: number): Promise<ModResult> {
  try {
    await apiClient.post(`/forums/topics/${topicId}/untrash`, {});
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to restore topic.') };
  }
}

// ---------------------------------------------------------------------------
// Reports inbox (mod-only)
// ---------------------------------------------------------------------------

export interface ReportedTopic {
  topicId:     number;
  subject:     string;
  reportedBy:  string;
  reason:      string;
  reportCount: number;
}

export interface ReportedPost {
  reportId: number;
  threadId: number;
  author:   string;
  reason:   string;
  message:  string;
}

export async function getReportedTopics(
  forumId: number,
  opts: { pageNumber?: number; pageSize?: number } = {},
): Promise<ReportedTopic[]> {
  const { pageNumber = 1, pageSize = 20 } = opts;
  try {
    const { data } = await apiClient.get(`/forums/${forumId}/reportedtopics`, {
      params: { pageNumber, pageSize },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = data?.topics ?? data?.items ?? data?.data ?? data ?? [];
    return Array.isArray(raw) ? raw.map(r => ({
      topicId:     Number(r.topicId ?? r.id ?? 0),
      subject:     r.subject ?? r.title ?? `Topic #${r.topicId ?? r.id ?? ''}`,
      reportedBy:  r.reportedBy ?? r.userName ?? r.poster ?? 'Unknown',
      reason:      r.reason ?? r.reportReason ?? r.message ?? '',
      reportCount: Number(r.reportCount ?? r.totalReports ?? (Array.isArray(r.reports) ? r.reports.length : 1)),
    })) : [];
  } catch {
    return [];
  }
}

export async function getReportedPosts(
  topicId: number,
  opts: { threadId?: number; pageNumber?: number; pageSize?: number } = {},
): Promise<ReportedPost[]> {
  const { threadId, pageNumber = 1, pageSize = 20 } = opts;
  const params: Record<string, unknown> = { pageNumber, pageSize };
  if (threadId) params.threadId = threadId;
  try {
    const { data } = await apiClient.get(`/forums/topics/${topicId}/reportedposts`, { params });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = data?.posts ?? data?.items ?? data?.data ?? data ?? [];
    return Array.isArray(raw) ? raw.map(r => ({
      reportId: Number(r.reportId ?? r.id ?? 0),
      threadId: Number(r.threadId ?? r.postId ?? 0),
      author:   r.author ?? r.userName ?? 'Unknown',
      reason:   r.reason ?? r.reportReason ?? r.message ?? '',
      message:  r.postMessage ?? r.body ?? r.content ?? '',
    })) : [];
  } catch {
    return [];
  }
}

export async function closeReports(args: {
  reportIds: number | number[];
  forumId:   number;
}): Promise<ModResult> {
  try {
    await apiClient.post('/forums/reports/close', {
      reportIds: Array.isArray(args.reportIds) ? args.reportIds : [args.reportIds],
      forumId:   args.forumId,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to close report.') };
  }
}

export async function closeReportedTopic(args: {
  topicId:           number;
  forumId:           number;
  threadId?:         number;
  closePost?:        string;
  isCloseWithPost?:  boolean;
  isAnonymous?:      boolean;
}): Promise<ModResult> {
  const body: Record<string, unknown> = {
    topicId:         args.topicId,
    forumId:         args.forumId,
    isCloseWithPost: args.isCloseWithPost ?? false,
    isAnonymous:     args.isAnonymous ?? false,
  };
  if (args.threadId)  body.threadId  = args.threadId;
  if (args.closePost) body.closePost = args.closePost;
  try {
    await apiClient.post(`/forums/topics/${args.topicId}/close-reported`, body);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to close reported topic.') };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Reports (content report-abuse) ─────────────────────────────────────── */

// Matches server's `CONTENT_TYPES` numeric enum. Value 1 is the forum channel.
export const REPORT_CONTENT_TYPE_FORUM = 1;

export interface ReportTypeEntry {
  reason: string;
}

export async function getReportTypes(): Promise<ReportTypeEntry[]> {
  try {
    const { data } = await apiClient.get('/reports/types');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = data?.data ?? data ?? [];
    return (Array.isArray(list) ? list : [])
      .map(r => (typeof r === 'string'
        ? { reason: r }
        : { reason: r.reportType || r.name || r.title || r.reason || '' }))
      .filter(r => !!r.reason);
  } catch {
    // Fallback so the UI still works when the endpoint is unavailable.
    return [
      { reason: 'Spam' },
      { reason: 'Harassment' },
      { reason: 'Hate Speech' },
      { reason: 'Inappropriate Content' },
      { reason: 'Other' },
    ];
  }
}

export async function reportContent(args: {
  contentType: number;
  contentId:   number;
  reason:      string;
  remark?:     string;
  forumId?:    number;
  topicId?:    number;
}): Promise<ModResult> {
  const body: Record<string, unknown> = {
    contentType: args.contentType,
    contentId:   args.contentId,
    reason:      args.reason,
  };
  if (args.remark  !== undefined) body.remark  = args.remark;
  if (args.forumId !== undefined) body.forumId = args.forumId;
  if (args.topicId !== undefined) body.topicId = args.topicId;
  try {
    await apiClient.post('/reports', body);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: wrapModError(err, 'Failed to submit report.') };
  }
}

// ---------------------------------------------------------------------------
// Fan Fictions — types
// ---------------------------------------------------------------------------

export interface FanFictionShowTab { id: string; label: string; pattern: RegExp | null }
export interface FanFictionGenreTab { id: string; label: string }
export interface FanFictionSortTab { id: 'trending' | 'latest' | 'popular'; label: string }

export interface FanFictionReaction {
  id: number;
  icon: string;
  label: string;
  count: number;
}

export interface FanFiction {
  id: string;
  title: string;
  author: string;
  authorId: string | null;
  synopsis: string;
  thumbnail: string | null;
  banner: string | null;
  status: 'Ongoing' | 'Completed';
  statusRaw: number;
  rating: string | null;
  type: string | null;
  featured: boolean;
  genres: string[];
  tags: string[];
  entities: string[];
  chapterCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  followerCount: number;
  views: string;
  likes: string;
  comments: string;
  followers: string;
  lastUpdatedRaw: string | null;
  lastUpdated: string;
  bg: string;
}

export interface FanFictionChapterSummary {
  chapterId: string;
  fanFictionId: string;
  orderNumber: number;
  chapterTitle: string;
  publishedAt: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  membersOnly: boolean;
  mature: boolean;
}

export interface FanFictionDetail extends FanFiction {
  summary: string;
  authorNote: string;
  warning: string;
  graphicsBy: string | null;
  beta: string[];
  topicId: string | null;
  pageUrl: string | null;
  createdAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  chapters: FanFictionChapterSummary[];
}

export interface FanFictionChapter {
  chapterId: string;
  fanFictionId: string;
  orderNumber: number | null;
  title: string;
  body: string;           // HTML string (already sanitized by backend when available)
  isHtml: boolean;
  published: string | null;
  edited: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readingTime: string;
  membersOnly: boolean;
  mature: boolean;
  status: string | null;
  reactions: FanFictionReaction[] | null;
}

export interface FanFictionsPage {
  stories: FanFiction[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ---------------------------------------------------------------------------
// Fan Fictions — constants
// ---------------------------------------------------------------------------

export const FF_SHOW_TABS: FanFictionShowTab[] = [
  { id: 'all',       label: 'All Shows',     pattern: null },
  { id: 'yrkkh',     label: 'YRKKH',         pattern: /yrkkh|yeh\s*rishta/i },
  { id: 'anupamaa',  label: 'Anupamaa',      pattern: /anupamaa|anupama/i },
  { id: 'ghum-hai',  label: 'Ghum Hai',      pattern: /ghum\s*hai|ghkpm/i },
  { id: 'kundali',   label: 'Kundali Bhagya', pattern: /kundali\s*bhagya/i },
  { id: 'imlie',     label: 'Imlie',         pattern: /imlie/i },
  { id: 'bollywood', label: 'Bollywood',     pattern: /bollywood/i },
];

export const FF_GENRE_TABS: FanFictionGenreTab[] = [
  { id: 'all',      label: 'All' },
  { id: 'romance',  label: 'Romance' },
  { id: 'drama',    label: 'Drama' },
  { id: 'comedy',   label: 'Comedy' },
  { id: 'fantasy',  label: 'Fantasy' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'action',   label: 'Action' },
  { id: 'oneshot',  label: 'One-shots' },
];

export const FF_SORT_TABS: FanFictionSortTab[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'latest',   label: 'Latest' },
  { id: 'popular',  label: 'Popular' },
];

// Rating ladder: 1=G, 2=PG, 3=T, 4=M, 5=MA (confirmed against live API).
const FF_RATING_LABELS: Record<number, string> = { 1: 'G', 2: 'PG', 3: 'T', 4: 'M', 5: 'MA' };

// Type map: 0=Fan Fiction, 1=One-shot, 2=Short Story.
const FF_TYPE_LABELS: Record<number, string> = { 0: 'Fan Fiction', 1: 'One-shot', 2: 'Short Story' };

// 8 reaction slots from likeJsonData (keys "1".."8"). Labels best-effort.
const FF_REACTION_LABELS: Record<number, { icon: string; label: string }> = {
  1: { icon: '👍', label: 'Like'   },
  2: { icon: '❤️', label: 'Love'   },
  3: { icon: '😂', label: 'Haha'   },
  4: { icon: '😮', label: 'Wow'    },
  5: { icon: '😢', label: 'Sad'    },
  6: { icon: '😡', label: 'Angry'  },
  7: { icon: '🙏', label: 'Thanks' },
  8: { icon: '🔥', label: 'Fire'   },
};

// Fallback cover colors seeded by story title — matches prototype's gradient set,
// collapsed to the first hex since RN can't render CSS gradients.
const FF_FALLBACK_COLORS = ['#4c1d95', '#991b1b', '#1e40af', '#a16207', '#047857', '#be185d', '#1e1b4b', '#3730a3'];
function ffFallbackColor(seed: string): string {
  const sum = String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FF_FALLBACK_COLORS[sum % FF_FALLBACK_COLORS.length];
}

// ---------------------------------------------------------------------------
// Fan Fictions — helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ffParseJsonList(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.json)) return parsed.json;
    return [];
  } catch {
    return [];
  }
}

function ffNames(raw: unknown): string[] {
  return ffParseJsonList(raw)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => (typeof t === 'string' ? t : (t?.name || t?.title || t?.tag || t?.label)))
    .filter((s: string | undefined): s is string => Boolean(s));
}

function ffStatusLabel(code: unknown): 'Ongoing' | 'Completed' {
  return Number(code) === 1 ? 'Completed' : 'Ongoing';
}

function ffRatingLabel(r: unknown): string | null {
  const n = Number(r);
  return FF_RATING_LABELS[n] || (n ? `R${n}` : null);
}

function ffTypeLabel(t: unknown): string | null {
  return FF_TYPE_LABELS[Number(t)] || null;
}

function ffFormatCount(n: unknown): string {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '0';
  if (num >= 10_000_000) return (num / 10_000_000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (num >= 100_000)    return (num / 100_000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (num >= 1_000)      return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ffAuthorDisplay(raw: any): string {
  return raw?.realName || raw?.userName || (raw?.userId ? `User #${raw.userId}` : 'Anonymous');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ffParseReactions(raw: any): FanFictionReaction[] | null {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object') return null;
  const out: FanFictionReaction[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const count = Number(obj[i] ?? obj[String(i)] ?? 0);
    out.push({
      id: i,
      icon: FF_REACTION_LABELS[i].icon,
      label: FF_REACTION_LABELS[i].label,
      count,
    });
  }
  return out;
}

// Strip HTML and estimate words/min → reading time label.
function ffReadingTime(body: string): string {
  const text = (body || '').replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function ffIsHtml(s: string): boolean {
  return typeof s === 'string' && /<\w+[^>]*>/.test(s);
}

// ---------------------------------------------------------------------------
// Fan Fictions — transforms
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFanFiction(raw: any): FanFiction {
  const tags     = ffNames(raw?.tagsJsonData);
  const genres   = ffNames(raw?.genreJsonData);
  const entities = ffNames(raw?.entityJsonData);

  const title        = raw?.title || 'Untitled';
  const viewCount    = Number(raw?.totalViewCount)   || 0;
  const likeCount    = Number(raw?.totalLikeCount)   || 0;
  const commentCount = Number(raw?.totalCommentCount) || 0;
  const followerCount = Number(raw?.totalFollowers ?? raw?.followCount ?? 0);

  return {
    id:        String(raw?.fanFictionId ?? raw?.id ?? ''),
    title,
    author:    ffAuthorDisplay(raw),
    authorId:  raw?.authorId ? String(raw.authorId) : (raw?.userId ? String(raw.userId) : null),
    synopsis:  raw?.summary || '',
    thumbnail: raw?.ffThumbnail || null,
    banner:    raw?.ffBannerThumbnail || null,
    status:    ffStatusLabel(raw?.statusCode),
    statusRaw: Number(raw?.statusCode) || 0,
    rating:    ffRatingLabel(raw?.rating),
    type:      ffTypeLabel(raw?.fanFictionType),
    featured:  !!raw?.featured,
    genres,
    tags,
    entities,
    chapterCount: Number(raw?.chapterCount) || 0,
    viewCount,
    likeCount,
    commentCount,
    followerCount,
    views:     ffFormatCount(viewCount),
    likes:     ffFormatCount(likeCount),
    comments:  ffFormatCount(commentCount),
    followers: ffFormatCount(followerCount),
    lastUpdatedRaw: raw?.lastUpdatedWhen || null,
    lastUpdated:    raw?.lastUpdatedWhen ? timeAgo(raw.lastUpdatedWhen) : '',
    bg: ffFallbackColor(title),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFanFictionDetail(data: any): FanFictionDetail | null {
  const payload = data?.data ?? data;
  const raw = payload?.fanFiction ?? payload?.story ?? payload;
  if (!raw?.fanFictionId && !raw?.id) return null;

  const base = transformFanFiction(raw);
  const summary    = raw?.summary || '';
  const authorNote = raw?.authorNote || '';
  const warning    = raw?.warning && raw.warning !== 'TBU' ? raw.warning : '';
  const beta       = ffNames(raw?.betaReaderJson);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawChapters: any[] = payload?.chapters ?? raw?.chapters ?? [];
  const chapters: FanFictionChapterSummary[] = rawChapters.map((c, i) => ({
    chapterId:    String(c?.chapterId ?? c?.id ?? i),
    fanFictionId: String(c?.fanFictionId ?? base.id),
    orderNumber:  Number(c?.orderNumber ?? i + 1),
    chapterTitle: c?.chapterTitle || `Chapter ${c?.orderNumber ?? i + 1}`,
    publishedAt:  c?.chapterPublishedWhen || c?.createdWhen || null,
    viewCount:    Number(c?.viewCount)    || 0,
    likeCount:    Number(c?.likeCount)    || 0,
    commentCount: Number(c?.commentCount) || 0,
    membersOnly:  !!c?.chapterMembersOnly,
    mature:       !!c?.chapterHasMaturedContent,
  })).sort((a, b) => a.orderNumber - b.orderNumber);

  return {
    ...base,
    summary,
    authorNote,
    warning,
    graphicsBy: raw?.graphicsBy ? `User #${raw.graphicsBy}` : null,
    beta,
    topicId:    raw?.topicId ? String(raw.topicId) : null,
    pageUrl:    raw?.pageUrl || null,
    createdAt:   raw?.createdWhen || null,
    publishedAt: raw?.publishedWhen || null,
    updatedAt:   raw?.lastUpdatedWhen || null,
    chapters,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFanFictionChapter(data: any): FanFictionChapter | null {
  const raw = data?.data ?? data;
  if (!raw?.chapterId) return null;
  const body = raw?.filteredChapterContent || raw?.chapterContent || '';
  const statusCode = Number(raw?.statusCode);
  const status = statusCode === 1 ? 'Published' : statusCode === 0 ? 'Draft' : null;

  return {
    chapterId:    String(raw.chapterId),
    fanFictionId: String(raw?.fanFictionId ?? ''),
    orderNumber:  raw?.orderNumber != null ? Number(raw.orderNumber) : null,
    title:        raw?.chapterTitle || 'Chapter',
    body,
    isHtml:       ffIsHtml(body),
    published:    raw?.chapterPublishedWhen || raw?.createdWhen || null,
    edited:       raw?.lastEditedWhen || null,
    viewCount:    Number(raw?.viewCount)    || 0,
    likeCount:    Number(raw?.likeCount)    || 0,
    commentCount: Number(raw?.commentCount) || 0,
    readingTime:  ffReadingTime(body),
    membersOnly:  !!raw?.chapterMembersOnly,
    mature:       !!raw?.chapterHasMaturedContent,
    status,
    reactions:    ffParseReactions(raw?.likeJsonData),
  };
}

// ---------------------------------------------------------------------------
// Fan Fictions — fetchers (with mock fallback on network error)
// ---------------------------------------------------------------------------

export async function fetchFanFictions(
  page = 1,
  pageSize = 20,
): Promise<FanFictionsPage> {
  try {
    const { data } = await apiClient.get('/fan-fictions', {
      params: { page, pageSize },
    });
    const payload = data?.data ?? data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawList: any[] = payload?.fanFictions ?? payload?.items ?? [];
    const rawPagination = data?.pagination ?? payload?.pagination;

    const pagination = rawPagination || {
      currentPage:     page,
      pageSize,
      totalPages:      1,
      totalItems:      rawList.length,
      hasNextPage:     false,
      hasPreviousPage: false,
    };

    return {
      stories: rawList.map(transformFanFiction),
      pagination,
    };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchFanFictions failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockFanFictionsPage(page, pageSize);
  }
}

export async function fetchFanFictionDetail(id: string | number): Promise<FanFictionDetail | null> {
  try {
    const { data } = await apiClient.get(`/fan-fictions/${id}`);
    return transformFanFictionDetail(data);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchFanFictionDetail failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockFanFictionDetail(id);
  }
}

export async function fetchFanFictionChapter(chapterId: string | number): Promise<FanFictionChapter | null> {
  try {
    const { data } = await apiClient.get(`/fan-fictions/chapter/${chapterId}`);
    return transformFanFictionChapter(data);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchFanFictionChapter failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockFanFictionChapter(chapterId);
  }
}

// ---------------------------------------------------------------------------
// Fan Fictions — mock fallback
// ---------------------------------------------------------------------------

interface MockSeed {
  id: number;
  title: string;
  author: string;
  authorId: number;
  synopsis: string;
  genres: string[];
  tags: string[];
  entities: string[];
  chapterCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  followerCount: number;
  statusRaw: number;
  rating: number;
  fanFictionType: number;
  featured: boolean;
  lastUpdatedWhen: string;
  thumbnail: string;
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

const FF_MOCK_SEEDS: MockSeed[] = [
  { id: 101, title: 'Tum Hi Ho — An ArShi Slow Burn',        author: 'ArShi_Writer', authorId: 11001, synopsis: 'ArShi find each other across the chaos of their lives — a slow burn spanning continents and misunderstandings.', genres: ['Romance', 'Drama'],     tags: ['YRKKH', 'Slow Burn'],         entities: ['YRKKH'],          chapterCount: 42, viewCount: 128_000, likeCount: 8_900, commentCount: 2_300, followerCount: 5_400, statusRaw: 0, rating: 2, fanFictionType: 0, featured: true,  lastUpdatedWhen: hoursAgo(2),   thumbnail: 'https://picsum.photos/seed/ff-101/600/800' },
  { id: 102, title: 'The Second Chance — An Abhira One-shot', author: 'OneShotQueen', authorId: 11002, synopsis: 'What if Abhira got one more chance to say what was left unsaid? A heartfelt one-shot.',                   genres: ['Romance', 'One-shot'],  tags: ['YRKKH'],                      entities: ['YRKKH'],          chapterCount: 1,  viewCount: 4_200,   likeCount: 567,   commentCount: 89,    followerCount: 120,   statusRaw: 1, rating: 2, fanFictionType: 1, featured: false, lastUpdatedWhen: hoursAgo(4),   thumbnail: 'https://picsum.photos/seed/ff-102/600/800' },
  { id: 103, title: 'Ishq Mein Marjawan — A VR Tale',        author: 'VR_Shipper',   authorId: 11003, synopsis: 'Riddhima enters the VR Mansion with a mission. Danger, secrets, and undeniable chemistry.',                  genres: ['Romance', 'Thriller'],  tags: ['Ghum Hai'],                   entities: ['Ghum Hai'],       chapterCount: 31, viewCount: 72_000,  likeCount: 5_400, commentCount: 1_600, followerCount: 2_100, statusRaw: 0, rating: 3, fanFictionType: 0, featured: false, lastUpdatedWhen: hoursAgo(6),   thumbnail: 'https://picsum.photos/seed/ff-103/600/800' },
  { id: 104, title: 'Mohabbat Ke Rang — An Anupamaa Epic',   author: 'AnuFanatic',   authorId: 11004, synopsis: "Anupama's journey from forgotten wife to unstoppable woman — reimagined with the love she always deserved.", genres: ['Drama', 'Romance'],     tags: ['Anupamaa', 'Milestone'],      entities: ['Anupamaa'],       chapterCount: 100, viewCount: 420_000, likeCount: 31_000, commentCount: 12_400, followerCount: 9_800, statusRaw: 1, rating: 3, fanFictionType: 0, featured: true,  lastUpdatedWhen: hoursAgo(24 * 30), thumbnail: 'https://picsum.photos/seed/ff-104/600/800' },
  { id: 105, title: 'Kundali Se Aage — Preeta aur Karan',    author: 'KundaliFan',   authorId: 11005, synopsis: 'Preeta and Karan must navigate betrayal, new beginnings, and a love that refuses to stay buried.',           genres: ['Romance', 'Drama'],     tags: ['Kundali Bhagya'],             entities: ['Kundali Bhagya'], chapterCount: 19, viewCount: 38_000,  likeCount: 2_900, commentCount: 734,   followerCount: 1_400, statusRaw: 0, rating: 2, fanFictionType: 0, featured: false, lastUpdatedWhen: hoursAgo(12),  thumbnail: 'https://picsum.photos/seed/ff-105/600/800' },
  { id: 106, title: 'Hum Tum aur Woh Office',                author: 'ChillWriter99', authorId: 11006, synopsis: 'Two colleagues who absolutely hate each other are forced to work on the same project. Glorious chaos ensues.', genres: ['Comedy', 'Romance'],    tags: ['Bollywood'],                  entities: ['Bollywood'],      chapterCount: 8,  viewCount: 11_000,  likeCount: 1_800, commentCount: 312,   followerCount: 640,   statusRaw: 0, rating: 2, fanFictionType: 0, featured: false, lastUpdatedWhen: hoursAgo(24),  thumbnail: 'https://picsum.photos/seed/ff-106/600/800' },
  { id: 107, title: 'Phir Se Milenge — An Imlie Reunion',    author: 'ImlieFan2025', authorId: 11007, synopsis: 'Years after their painful separation, Imlie and Atharva cross paths again in a city where neither expected.',   genres: ['Romance', 'Drama'],     tags: ['Imlie'],                      entities: ['Imlie'],          chapterCount: 3,  viewCount: 2_400,   likeCount: 198,   commentCount: 44,    followerCount: 88,    statusRaw: 0, rating: 2, fanFictionType: 0, featured: false, lastUpdatedWhen: hoursAgo(48),  thumbnail: 'https://picsum.photos/seed/ff-107/600/800' },
  { id: 108, title: 'The Desi Avengers — Open Collab',       author: 'IFCommunity',  authorId: 11008, synopsis: 'Your favourite TV characters as superheroes. An open round-robin where every IF member contributes a chapter.',  genres: ['Action', 'Fantasy'],    tags: ['Bollywood', 'Round Robin'],   entities: ['Bollywood'],      chapterCount: 6,  viewCount: 5_700,   likeCount: 876,   commentCount: 203,   followerCount: 410,   statusRaw: 0, rating: 3, fanFictionType: 0, featured: false, lastUpdatedWhen: hoursAgo(3),   thumbnail: 'https://picsum.photos/seed/ff-108/600/800' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seedToRaw(s: MockSeed): any {
  return {
    fanFictionId:        s.id,
    title:               s.title,
    summary:             s.synopsis,
    realName:            s.author,
    userName:            s.author,
    userId:              s.authorId,
    authorId:            s.authorId,
    tagsJsonData:        JSON.stringify({ json: s.tags.map((name, i) => ({ id: i + 1, name })) }),
    genreJsonData:       JSON.stringify({ json: s.genres.map((name, i) => ({ id: i + 1, name })) }),
    entityJsonData:      JSON.stringify({ json: s.entities.map((name, i) => ({ id: i + 1, name })) }),
    chapterCount:        s.chapterCount,
    totalViewCount:      s.viewCount,
    totalLikeCount:      s.likeCount,
    totalCommentCount:   s.commentCount,
    totalFollowers:      s.followerCount,
    followCount:         s.followerCount,
    statusCode:          s.statusRaw,
    rating:              s.rating,
    fanFictionType:      s.fanFictionType,
    featured:            s.featured,
    lastUpdatedWhen:     s.lastUpdatedWhen,
    publishedWhen:       s.lastUpdatedWhen,
    createdWhen:         s.lastUpdatedWhen,
    ffThumbnail:         s.thumbnail,
    ffBannerThumbnail:   s.thumbnail,
  };
}

function getMockFanFictionsPage(page: number, pageSize: number): FanFictionsPage {
  const stories = FF_MOCK_SEEDS.map(seedToRaw).map(transformFanFiction);
  return {
    stories,
    pagination: {
      currentPage:     page,
      pageSize,
      totalPages:      1,
      totalItems:      stories.length,
      hasNextPage:     false,
      hasPreviousPage: false,
    },
  };
}

function getMockFanFictionDetail(id: string | number): FanFictionDetail | null {
  const seed = FF_MOCK_SEEDS.find(s => String(s.id) === String(id)) ?? FF_MOCK_SEEDS[0];
  const detailRaw = {
    ...seedToRaw(seed),
    authorNote:     `A note from ${seed.author}: thank you for reading. Comments keep me writing!`,
    warning:        seed.rating >= 3 ? 'Contains mature themes. Reader discretion advised.' : '',
    betaReaderJson: JSON.stringify({ json: [{ id: 1, name: 'BetaReader01' }, { id: 2, name: 'BetaReader02' }] }),
    topicId:        1000 + seed.id,
    pageUrl:        null,
    chapters: Array.from({ length: Math.min(seed.chapterCount, 8) }).map((_, i) => ({
      chapterId:                 `${seed.id}-c${i + 1}`,
      fanFictionId:              seed.id,
      orderNumber:               i + 1,
      chapterTitle:              i === 0 ? 'Prologue' : `Chapter ${i + 1}`,
      chapterPublishedWhen:      hoursAgo(24 * (seed.chapterCount - i)),
      createdWhen:               hoursAgo(24 * (seed.chapterCount - i)),
      viewCount:                 Math.round(seed.viewCount / Math.max(1, seed.chapterCount) * (1 - i * 0.05)),
      likeCount:                 Math.round(seed.likeCount / Math.max(1, seed.chapterCount) * (1 - i * 0.05)),
      commentCount:              Math.round(seed.commentCount / Math.max(1, seed.chapterCount) * (1 - i * 0.05)),
      chapterMembersOnly:        false,
      chapterHasMaturedContent:  seed.rating >= 4 && i === seed.chapterCount - 1,
    })),
  };
  return transformFanFictionDetail({ fanFiction: detailRaw, chapters: detailRaw.chapters });
}

function getMockFanFictionChapter(chapterId: string | number): FanFictionChapter | null {
  const [seedId] = String(chapterId).split('-c');
  const seed = FF_MOCK_SEEDS.find(s => String(s.id) === seedId) ?? FF_MOCK_SEEDS[0];
  const orderStr = String(chapterId).split('-c')[1] || '1';
  const order = Number(orderStr) || 1;

  const body = `
    <p>The rain had been falling for three days straight when <i>${seed.author}'s</i> story continued. ${seed.synopsis}</p>
    <p>She stood at the edge of the balcony, looking out at the city lights blurred by the downpour, and wondered — not for the first time — whether the distance between them would ever close.</p>
    <p><b>"You came."</b> His voice was softer than she remembered, but still carried that same warmth that had once meant everything.</p>
    <p>She turned slowly, the breath catching in her throat. There were a thousand things she wanted to say, and none of them felt like enough.</p>
    <p>"I told you I would."</p>
    <p>For a long moment, neither of them moved. The rain kept falling, steady and relentless, a rhythm as familiar as a heartbeat. And in the silence between them, every word they had never said stretched out like a bridge — one that neither of them had the courage, yet, to cross.</p>
    <p><i>To be continued in the next chapter…</i></p>
  `.trim();

  return {
    chapterId:    String(chapterId),
    fanFictionId: String(seed.id),
    orderNumber:  order,
    title:        order === 1 ? 'Prologue' : `Chapter ${order}`,
    body,
    isHtml:       true,
    published:    hoursAgo(24 * (seed.chapterCount - order + 1)),
    edited:       null,
    viewCount:    Math.round(seed.viewCount / Math.max(1, seed.chapterCount)),
    likeCount:    Math.round(seed.likeCount / Math.max(1, seed.chapterCount)),
    commentCount: Math.round(seed.commentCount / Math.max(1, seed.chapterCount)),
    readingTime:  ffReadingTime(body),
    membersOnly:  false,
    mature:       seed.rating >= 4,
    status:       'Published',
    reactions: [
      { id: 1, icon: '👍', label: 'Like',   count: 128 },
      { id: 2, icon: '❤️', label: 'Love',   count: 412 },
      { id: 3, icon: '😂', label: 'Haha',   count: 34 },
      { id: 4, icon: '😮', label: 'Wow',    count: 61 },
      { id: 5, icon: '😢', label: 'Sad',    count: 22 },
      { id: 6, icon: '😡', label: 'Angry',  count: 5 },
      { id: 7, icon: '🙏', label: 'Thanks', count: 88 },
      { id: 8, icon: '🔥', label: 'Fire',   count: 209 },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUIZZES — types, helpers, fetchers
// ═══════════════════════════════════════════════════════════════════════════

// ── Visual helpers (categoryId → gradient pair, emoji) ──────────────────────
export const QUIZ_CAT_GRADIENTS: Record<number, readonly [string, string]> = {
  1:  ['#7f1d1d', '#ef4444'], // Movies
  2:  ['#1d4ed8', '#7c3aed'], // TV Shows
  3:  ['#9d174d', '#db2777'], // Music
  4:  ['#7c3aed', '#ec4899'], // Celebrities
  5:  ['#78350f', '#d97706'], // Mythology
  6:  ['#1e3a5f', '#2563eb'], // Books & Literature
  7:  ['#831843', '#f9a8d4'], // Fashion & Style
  8:  ['#14532d', '#16a34a'], // Sports & Fitness
  9:  ['#f59e0b', '#ef4444'], // Fun & Random
  10: ['#1e293b', '#334155'], // Business & Finance
  11: ['#374151', '#6b7280'], // General Knowledge
};

export const QUIZ_CAT_EMOJIS: Record<number, string> = {
  1: '🎬', 2: '📺', 3: '🎵', 4: '⭐', 5: '🔱',
  6: '📚', 7: '👗', 8: '🏏', 9: '🎲', 10: '💼', 11: '🌟',
};

const QUIZ_FALLBACK_GRADIENTS: readonly (readonly [string, string])[] = [
  ['#7c3aed', '#ec4899'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
];

const QUIZ_AVATAR_GRADIENTS: readonly (readonly [string, string])[] = [
  ['#7c3aed', '#a78bfa'],
  ['#0ea5e9', '#38bdf8'],
  ['#ec4899', '#f9a8d4'],
  ['#f59e0b', '#fcd34d'],
  ['#10b981', '#6ee7b7'],
];

export function pickQuizGradient(
  categoryId: number | null | undefined,
  index = 0,
): readonly [string, string] {
  if (categoryId && QUIZ_CAT_GRADIENTS[categoryId]) return QUIZ_CAT_GRADIENTS[categoryId];
  return QUIZ_FALLBACK_GRADIENTS[index % QUIZ_FALLBACK_GRADIENTS.length];
}
export function pickQuizEmoji(categoryId: number | null | undefined): string {
  return (categoryId && QUIZ_CAT_EMOJIS[categoryId]) || '🧠';
}
export function pickQuizAvatarGradient(index: number): readonly [string, string] {
  return QUIZ_AVATAR_GRADIENTS[index % QUIZ_AVATAR_GRADIENTS.length];
}

function formatQuizCount(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getQuizInitials(realName?: string | null, userName?: string | null): string {
  const name = (realName || userName || '').trim();
  if (!name) return '?';
  const words = name.split(/\s+/);
  return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
}

function quizTypeName(quizTypeId: number): 'Trivia' | 'Personality' | 'Range-Based' {
  if (quizTypeId === 4)                     return 'Range-Based';
  if (quizTypeId === 2 || quizTypeId === 3) return 'Personality';
  return 'Trivia';
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface QuizCategory {
  categoryId: number;
  categoryName: string;
  quizCount: number;
}

export interface Quiz {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  categoryLabel: string;
  quizTypeId: number;
  quizTypeName: 'Trivia' | 'Personality' | 'Range-Based';
  questions: number;
  plays: string;
  plays_raw: number;
  views: number;
  thumbnail: string | null;
  pageUrl: string;
  publishedWhen: string;
  publishedFormatted: string | null;
  author: string;
  gradient: readonly [string, string];
  emoji: string;
}

export interface QuizPagination {
  currentPage: number;
  pageSize: number;
  totalPages?: number;
  totalItems?: number;
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
}

export interface QuizzesPage {
  quizzes: Quiz[];
  categories: QuizCategory[];
  pagination: QuizPagination;
}

export interface QuizQuestion {
  questionId: number;
  question: string;
  options: string[];
  optionIds: number[];
  points: number[];
  correct: number;   // -1 for personality (no single correct)
  isTrivia: boolean;
  questionImageUrl: string | null;
  questionImageCredit: string | null;
  revealTitle: string | null;
  revealDescription: string | null;
  revealImageUrl: string | null;
}

export interface QuizResultRange {
  resultId: number;
  title: string;
  description: string;
  lowerRange: number;
  upperRange: number;
}

export interface QuizDetail extends Quiz {
  countdownTimer: number;           // per-question time limit (seconds)
  estimatedTime: number;
  estimatedTimeLabel: string | null;
  directCommentCount: number;
  tags: string[];
  results: QuizResultRange[];
  quiz_questions: QuizQuestion[];
}

export interface QuizPlayer {
  id: number;
  name: string;
  initials: string;
  score: number;
  rank: number;
  avatarGradient: readonly [string, string];
  isPrivate: boolean;
}

export interface QuizCreator {
  id: number;
  name: string;
  initials: string;
  quizCount: number;
  avatarGradient: readonly [string, string];
  thumbnail: string | null;
  isPrivate: boolean;
}

export interface SubmitAnswer {
  questionId: number;
  optionId: number;
}

// ── Transforms ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformQuiz(raw: any, index: number): Quiz {
  const categoryId = raw.categoryId || 0;
  const quizTypeId = raw.quizTypeId || 1;
  return {
    id:            Number(raw.quizId),
    title:         raw.title       || 'Untitled Quiz',
    description:   raw.description || '',
    categoryId,
    categoryLabel: '',   // filled in by caller via category map
    quizTypeId,
    quizTypeName:  quizTypeName(quizTypeId),
    questions:     raw.questionCount || 0,
    plays:         formatQuizCount(raw.responseCount || 0),
    plays_raw:     raw.responseCount || 0,
    views:         raw.viewCount     || 0,
    thumbnail:     raw.thumbnailUrl  || raw.imageUrl || null,
    pageUrl:       raw.pageUrl       || '',
    publishedWhen: raw.publishedWhen || '',
    publishedFormatted: (() => {
      if (!raw.publishedWhen) return null;
      try {
        const d = new Date(raw.publishedWhen);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch { return null; }
    })(),
    author:   raw.realName || raw.userName || raw.uploaderName || 'IndiaForums',
    gradient: pickQuizGradient(categoryId, index),
    emoji:    pickQuizEmoji(categoryId),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQuizQuestions(questions: any[], options: any[]): QuizQuestion[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byQuestion: Record<number, any[]> = {};
  for (const opt of options) {
    (byQuestion[opt.questionId] = byQuestion[opt.questionId] || []).push(opt);
  }
  return questions
    .slice()
    .sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0))
    .map((q) => {
      const opts = byQuestion[q.questionId] || [];
      const correctIdx = opts.findIndex((o) => o.isCorrect === true);
      const imgUrl =
        q.questionImageUrl || q.QuestionImageUrl ||
        q.imageUrl || q.ImageUrl ||
        q.gifUrl || q.GifUrl || null;
      const credits = q.questionImageCredits || q.QuestionImageCredits;
      const creditSource = credits
        ? (credits.provider || credits.uploader || credits.uploaderName || credits.source || null)
        : null;
      return {
        questionId:  Number(q.questionId),
        question:    q.question || '',
        options:     opts.map((o) => o.text || ''),
        optionIds:   opts.map((o) => Number(o.optionId)),
        points:      opts.map((o) => o.points || 0),
        correct:     correctIdx,
        isTrivia:    correctIdx >= 0,
        questionImageUrl:    imgUrl,
        questionImageCredit: creditSource
          ? `via ${String(creditSource).charAt(0).toUpperCase()}${String(creditSource).slice(1)}`
          : null,
        revealTitle:       q.revealTitle       || null,
        revealDescription: q.revealDescription || null,
        revealImageUrl:    q.revealThumbnailUrl || q.revealImageUrl || null,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformQuizDetail(raw: any, index = 0): QuizDetail {
  const base = transformQuiz(raw, index);
  const estimatedSec = raw.estimatedTimeInSeconds || 0;

  let tags: string[] = [];
  if (raw.tagsJsonData) {
    try {
      const parsed = JSON.parse(raw.tagsJsonData);
      const arr = Array.isArray(parsed) ? parsed : parsed?.json;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags = Array.isArray(arr) ? arr.map((t: any) => t?.name || t).filter(Boolean) : [];
    } catch { /* ignore malformed JSON */ }
  }

  return {
    ...base,
    countdownTimer:     raw.estimatedTimeInSeconds || 0,
    estimatedTime:      estimatedSec,
    estimatedTimeLabel: estimatedSec > 0 ? `${Math.ceil(estimatedSec / 60)} min` : null,
    directCommentCount: raw.directCommentCount || 0,
    tags,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results: (raw.results || []).map((r: any) => ({
      resultId:    r.resultId    ?? 0,
      title:       r.title       || '',
      description: r.description || '',
      lowerRange:  r.lowerRange  ?? 0,
      upperRange:  r.upperRange  ?? 0,
    })),
    quiz_questions: buildQuizQuestions(raw.questions || [], raw.options || []),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformQuizPlayer(raw: any, index: number): QuizPlayer {
  const isPrivate = raw.privacy === 1;
  const displayName = isPrivate
    ? 'Anonymous'
    : ((raw.realName || raw.userName || '').trim() || `Player ${index + 1}`);
  return {
    id:       Number(raw.userId) || index,
    name:     displayName,
    initials: isPrivate ? '?' : getQuizInitials(raw.realName, raw.userName),
    score:    raw.totalScore ?? 0,
    rank:     raw.totalRank  ?? index + 1,
    avatarGradient: pickQuizAvatarGradient(index),
    isPrivate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformQuizCreator(raw: any, index: number): QuizCreator {
  const isPrivate = raw.privacy === 1;
  const displayName = isPrivate
    ? 'Anonymous'
    : ((raw.realName || raw.userName || '').trim() || `Creator ${index + 1}`);
  return {
    id:        Number(raw.userId) || index,
    name:      displayName,
    initials:  isPrivate ? '?' : getQuizInitials(raw.realName, raw.userName),
    quizCount: raw.quizCount || 0,
    avatarGradient: pickQuizAvatarGradient(index),
    thumbnail: raw.thumbnailUrl || null,
    isPrivate,
  };
}

// ── Fetchers ────────────────────────────────────────────────────────────────
export async function fetchQuizzes(page = 1, pageSize = 25): Promise<QuizzesPage> {
  try {
    const { data } = await apiClient.get('/quizzes', {
      params: { pageNumber: page, pageSize },
    });
    const payload = data?.data ?? data ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawQuizzes: any[] = payload.quizzes   || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCategories: any[] = payload.categories || [];
    const rawPagination = data?.pagination || payload?.pagination;

    const pagination: QuizPagination = rawPagination
      ? {
          currentPage: rawPagination.currentPage ?? rawPagination.pageNumber ?? page,
          pageSize:    rawPagination.pageSize ?? pageSize,
          totalPages:  rawPagination.totalPages,
          totalItems:  rawPagination.totalItems,
          hasNextPage: rawPagination.hasNextPage ?? false,
          hasPreviousPage: rawPagination.hasPreviousPage ?? false,
        }
      : {
          currentPage: page,
          pageSize,
          totalPages:  1,
          totalItems:  rawQuizzes.length,
          hasNextPage: false,
          hasPreviousPage: false,
        };

    const catMap: Record<number, string> = {};
    for (const c of rawCategories) catMap[c.categoryId] = c.categoryName;

    const quizzes = rawQuizzes.map((q, i) => {
      const quiz = transformQuiz(q, i);
      quiz.categoryLabel = catMap[quiz.categoryId] || '';
      return quiz;
    });
    const categories: QuizCategory[] = rawCategories.map((c) => ({
      categoryId:   Number(c.categoryId),
      categoryName: String(c.categoryName || ''),
      quizCount:    Number(c.quizCount || 0),
    }));

    return { quizzes, categories, pagination };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.warn('[API] fetchQuizzes failed:', e?.response?.status, e?.message);
    throw err;
  }
}

export async function fetchQuizDetails(quizId: number | string): Promise<QuizDetail | null> {
  try {
    const { data } = await apiClient.get(`/quizzes/${quizId}/details`);
    const raw = data?.data ?? data ?? {};
    if (!raw || !raw.quizId) return null;
    return transformQuizDetail(raw);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.warn('[API] fetchQuizDetails failed:', e?.response?.status, e?.message);
    throw err;
  }
}

export async function fetchQuizPlayers(
  quizId: number | string,
  page = 1,
  pageSize = 20,
): Promise<QuizPlayer[]> {
  try {
    const { data } = await apiClient.get(`/quizzes/${quizId}/players`, {
      params: { page, pageSize },
    });
    const raw = Array.isArray(data) ? data : (data?.data || []);
    return raw.map(transformQuizPlayer);
  } catch (err: unknown) {
    const e = err as { response?: { status: number }; message?: string };
    console.warn('[API] fetchQuizPlayers failed:', e?.response?.status, e?.message);
    throw err;
  }
}

export async function fetchQuizCreators(pageSize = 10): Promise<QuizCreator[]> {
  try {
    const { data } = await apiClient.get('/quizzes/creators', {
      params: { page: 1, pageSize },
    });
    const raw = Array.isArray(data) ? data : (data?.data || []);
    return raw.map(transformQuizCreator);
  } catch (err: unknown) {
    const e = err as { response?: { status: number }; message?: string };
    console.warn('[API] fetchQuizCreators failed:', e?.response?.status, e?.message);
    throw err;
  }
}

export async function submitQuizResponse(
  quizId: number | string,
  answers: SubmitAnswer[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  try {
    const { data } = await apiClient.post(`/quizzes/${quizId}/response`, { answers });
    return data?.data ?? data ?? null;
  } catch (err: unknown) {
    // Known backend bug: POST /response always 400s (FinalResultForUser FromSql) —
    // see docs/backend-issues-2026-04-07.md Class D. Caller falls back to local score.
    const e = err as { response?: { status: number }; message?: string };
    console.warn('[API] submitQuizResponse failed (fallback to local score):', e?.response?.status, e?.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LINK oEMBED — rich link previews for URLs shared in forum posts
// ═══════════════════════════════════════════════════════════════════════════

export interface LinkOEmbed {
  linkId: number;
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  image: string | null;
  htmlContent: string | null;
  lastUpdatedWhen: string;
}

/**
 * Fetch Open Graph / oEmbed metadata for a URL — used to render rich link
 * preview cards under forum posts. Backend endpoint:
 *   GET /api/v1/links/oembed?linkId={0|id}&url={url}
 *
 * `linkId` is optional; pass 0 when you don't already have one (the API
 * backfills / inserts a row keyed on the URL and returns its assigned id).
 *
 * Returns null when the request fails or the response body has no `link`
 * payload — callers should fall back to showing a plain link in that case.
 */
export async function fetchLinkOEmbed(
  url: string,
  linkId = 0,
): Promise<LinkOEmbed | null> {
  if (!url) return null;
  try {
    const { data } = await apiClient.get('/links/oembed', {
      params: { linkId, url },
    });
    const link = data?.link;
    if (!link || !link.url) return null;
    return {
      linkId:         Number(link.linkId) || 0,
      url:            String(link.url),
      domain:         String(link.domain || ''),
      title:          link.title         ?? null,
      description:    link.description   ?? null,
      image:          link.image         ?? null,
      htmlContent:    link.htmlContent   ?? null,
      lastUpdatedWhen: String(link.lastUpdatedWhen || ''),
    };
  } catch (err: unknown) {
    const e = err as { response?: { status: number }; message?: string };
    console.warn('[API] fetchLinkOEmbed failed:', e?.response?.status, e?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shorts API
// ---------------------------------------------------------------------------
//
// GET /api/v1/shorts?pageNumber=N&pageSize=20[&parentCategoryId=X]
//   → { data: RawShort[], totalCount: number }
//
// Thumbnail URL is constructed (no thumbnailUrl in response):
//   https://img.indiaforums.com/shorts/720x0/0/{shortId}-{pageUrl}.webp?c={checksum}
//
// Destination URL when tapping the CTA = raw.linkUrl (YouTube / IndiaForums),
// fallback to IndiaForums shorts page when absent. Resolved into a typed
// `target` so the screen can route in-app (article → ArticleDetail, youtube →
// in-app modal) and only fall back to the system browser for unknown shapes.

export type ShortTarget =
  | { kind: 'youtube';  url: string }
  | { kind: 'article';  articleId: string; url: string }
  | { kind: 'gallery';  galleryId: string; url: string }
  | { kind: 'external'; url: string };

export interface Short {
  id: number;
  title: string;
  description: string;
  thumbnail: string | null;
  publishedAt: string;     // formatted en-IN, empty string if unparseable
  credits: string;
  target: ShortTarget;
}

export interface ShortsPage {
  shorts: Short[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    hasNextPage: boolean;
  };
}

interface RawShort {
  shortId: number;
  title?: string;
  description?: string;
  pageUrl?: string;
  shortUpdateChecksum?: string;
  publishedWhen?: string;
  credits?: string;
  linkUrl?: string;
}

function formatShortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildShortThumbnail(raw: RawShort): string | null {
  if (!raw.shortId || !raw.pageUrl) return null;
  const checksum = raw.shortUpdateChecksum ? `?c=${raw.shortUpdateChecksum}` : '';
  return `https://img.indiaforums.com/shorts/720x0/0/${raw.shortId}-${raw.pageUrl}.webp${checksum}`;
}

function buildShortUrl(raw: RawShort): string {
  if (raw.linkUrl) return raw.linkUrl;
  return `https://www.indiaforums.com/shorts/${raw.shortId}/${raw.pageUrl ?? ''}`;
}

// IndiaForums detail URLs embed the numeric content id after the slug,
// joined by an underscore: /{article|gallery}/{slug}_{id}[/?#...]. All
// existing screens key off the numeric id, so we capture just the trailing
// digits and dispatch on the path prefix.
const IF_DETAIL_URL =
  /^https?:\/\/(?:www\.)?indiaforums\.com\/(article|gallery)\/[^/?#]*?_(\d+)(?:[/?#]|$)/i;

export function parseShortTarget(url: string): ShortTarget {
  if (/youtube\.com|youtu\.be/i.test(url)) {
    return { kind: 'youtube', url };
  }
  const m = url.match(IF_DETAIL_URL);
  if (m) {
    const kind = m[1].toLowerCase();
    const id = m[2];
    if (kind === 'article') return { kind: 'article', articleId: id, url };
    if (kind === 'gallery') return { kind: 'gallery', galleryId: id, url };
  }
  return { kind: 'external', url };
}

function transformShort(raw: RawShort): Short {
  const url = buildShortUrl(raw);
  return {
    id: raw.shortId,
    title: raw.title || 'Untitled',
    description: raw.description || '',
    thumbnail: buildShortThumbnail(raw),
    publishedAt: formatShortDate(raw.publishedWhen),
    credits: raw.credits || '',
    target: parseShortTarget(url),
  };
}

export async function fetchShorts(
  page = 1,
  pageSize = 20,
  parentCategoryId: number | null = null,
): Promise<ShortsPage> {
  const params: Record<string, string | number> = {
    pageNumber: page,
    pageSize,
  };
  if (parentCategoryId != null) {
    params.parentCategoryId = parentCategoryId;
  }

  const { data } = await apiClient.get('/shorts', { params });
  const rawList: RawShort[] = Array.isArray(data?.data) ? data.data : [];
  const totalCount: number = Number(data?.totalCount) || 0;

  return {
    shorts: rawList.map(transformShort),
    pagination: {
      currentPage: page,
      pageSize,
      totalCount,
      hasNextPage: page * pageSize < totalCount,
    },
  };
}

// ---------------------------------------------------------------------------
// WebStories API
// ---------------------------------------------------------------------------
//
// Two endpoints — list (sparse) and details (full payload with slides):
//
//   GET /api/v1/webstories?page=N&pageSize=24
//     → { data: RawWebStorySummary[], totalCount: number }
//
//   GET /api/v1/webstories/{storyId}/details
//     → flat object (no envelope), includes top-level author fields and a
//        `slidesJson` STRING that must be JSON.parse'd to get the slides.
//
// Field mapping mirrors indiaforums/src/components/stories/normalize.js.

export type GradientFill = { colors: [string, string]; angle: number };

export interface WebStorySummary {
  id: number;
  title: string;
  slug: string;
  coverImage: string;            // '' when no thumbnail
  coverBg: GradientFill | null;  // gradient fallback when coverImage is ''
  publishedWhen: string | null;
  timeAgo: string;               // relative ("3mo ago"); '' when unparseable
  featured: boolean;
}

export interface WebStoriesPage {
  stories: WebStorySummary[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface WebStoryAuthor {
  userId: number | null;
  userName: string;
  realName: string;
  displayName: string;
  groupName: string;
  initials: string;
  avatarColor: string;           // single accent (e.g. "#3558F0")
  avatarBg: GradientFill;        // gradient version of the accent
}

export type SlideMediaType = 'image' | 'video' | 'text';

export type SlideExtra =
  | { kind: 'list'; items: Array<string | { text?: string; title?: string }> }
  | {
      kind: 'poll' | 'quiz';
      options: Array<string | { text?: string; title?: string; label?: string }>;
    }
  | null;

export interface WebStorySlide {
  id: string;                    // `${storyId}-${order}`
  order: number;
  slideType: string;
  isCover: boolean;
  mediaType: SlideMediaType;
  imageUrl: string;
  videoUrl: string;
  title: string;
  caption: string;
  extra: SlideExtra;
  mediaCredit: string;
  actionUrl: string;
  actionLabel: string;
  slideAuthor: string;
  authorByLine: boolean;
  attribute: string;
  pollId: number | null;
  quizId: number | null;
  durationMs: number;            // default 5000
  bg: GradientFill;              // gradient fallback when no media
}

export interface WebStoryDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  coverBg: GradientFill | null;
  publishedWhen: string | null;
  timeAgo: string;
  author: WebStoryAuthor | null;
  featured: boolean;
  theme: unknown;
  authorByLine: unknown;
}

export interface WebStoryDetails {
  story: WebStoryDetail;
  slides: WebStorySlide[];
}

interface RawWebStorySummary {
  storyId?: number;
  id?: number;
  webStoryId?: number;
  title?: string;
  storyTitle?: string;
  pageUrl?: string;
  slug?: string;
  publishedWhen?: string;
  publishedAt?: string;
  createdWhen?: string;
  createdAt?: string;
  hasThumbnail?: boolean;
  thumbnailUrl?: string | null;
  coverImage?: string | null;
  thumbnail?: string | null;
  featured?: boolean;
}

interface RawSlide {
  slideNumber?: number;
  orderNumber?: number;
  slideType?: string;
  title?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  video?: string;
  videoUrl?: string;
  imageSource?: string;
  imageCredits?: string;
  videoCredits?: string;
  mediaSource?: string;
  cite?: string;
  quote?: string;
  pollId?: number;
  quizId?: number;
  question?: string;
  options?: unknown;
  fact?: string;
  listicle?: string;
  listItems?: unknown;
  animation?: unknown;
  timer?: number | string;
  author?: string;
  authorByLine?: boolean;
  attribute?: string;
  url?: string;
  urlAction?: string;
}

interface RawWebStoryDetails {
  storyId?: number;
  title?: string;
  pageUrl?: string;
  description?: string;
  hasThumbnail?: boolean;
  thumbnailUrl?: string | null;
  publishedWhen?: string;
  createdWhen?: string;
  theme?: unknown;
  featured?: boolean;
  authorByLine?: unknown;
  slidesJson?: string | RawSlide[];
  slides?: RawSlide[];

  // Author block (top-level)
  userId?: number;
  userName?: string;
  realName?: string;
  groupId?: number;
  groupName?: string;
  avatarType?: string;
  avatarAccent?: string;

  // Some APIs may nest under .data or .webStory — handled defensively.
  webStory?: RawWebStoryDetails;
  story?: RawWebStoryDetails;
  data?: RawWebStoryDetails;
}

// Deterministic gradient palette — used when a story or slide has no media
// so the UI never renders a blank black panel.
const WS_GRADIENTS: GradientFill[] = [
  { colors: ['#7c3aed', '#ec4899'], angle: 160 },
  { colors: ['#1e3a8a', '#3b82f6'], angle: 160 },
  { colors: ['#7f1d1d', '#ef4444'], angle: 160 },
  { colors: ['#064e3b', '#10b981'], angle: 160 },
  { colors: ['#78350f', '#f59e0b'], angle: 160 },
  { colors: ['#0f172a', '#0ea5e9'], angle: 160 },
  { colors: ['#831843', '#db2777'], angle: 160 },
  { colors: ['#134e4a', '#14b8a6'], angle: 160 },
];

function wsGradientFor(seed: string | number): GradientFill {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return WS_GRADIENTS[h % WS_GRADIENTS.length];
}

function wsInitialsOf(name: string): string {
  if (!name) return 'IF';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// "2026-04-01T10:00:00Z" → "3d ago" / "2mo ago" / "just now"; '' on parse fail.
export function relativeTimeAgo(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return 'just now';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}

function transformWebStorySummary(raw: RawWebStorySummary): WebStorySummary {
  const id = (raw.storyId ?? raw.id ?? raw.webStoryId ?? 0) as number;
  const title = raw.title ?? raw.storyTitle ?? '';
  const slug = raw.pageUrl ?? raw.slug ?? '';
  const hasThumb =
    raw.hasThumbnail === false
      ? false
      : Boolean(raw.thumbnailUrl ?? raw.coverImage ?? raw.thumbnail);
  const coverImage = hasThumb
    ? (raw.thumbnailUrl ?? raw.coverImage ?? raw.thumbnail ?? '')
    : '';
  const publishedWhen =
    raw.publishedWhen ??
    raw.publishedAt ??
    raw.createdWhen ??
    raw.createdAt ??
    null;

  return {
    id,
    title,
    slug,
    coverImage: coverImage || '',
    coverBg: coverImage ? null : wsGradientFor(id),
    publishedWhen,
    timeAgo: relativeTimeAgo(publishedWhen),
    featured: Boolean(raw.featured),
  };
}

function buildAuthor(raw: RawWebStoryDetails): WebStoryAuthor | null {
  if (!raw) return null;
  const userName = raw.userName || '';
  const realName = raw.realName || '';
  const displayName = realName || userName || 'India Forums';
  const accent = raw.avatarAccent || '#3558F0';
  return {
    userId: raw.userId ?? null,
    userName,
    realName,
    displayName,
    groupName: raw.groupName || '',
    initials: wsInitialsOf(displayName),
    avatarColor: accent,
    // Render as a flat-ish gradient using the single accent the API gives us.
    avatarBg: { colors: [accent, `${accent}cc`], angle: 135 },
  };
}

function transformSlide(
  raw: RawSlide,
  index: number,
  storyId: number,
): WebStorySlide {
  const slideType = (raw.slideType || 'default-slide').toLowerCase();
  const order = raw.slideNumber ?? raw.orderNumber ?? index;
  const image = raw.image ?? raw.imageUrl ?? '';
  const video = raw.video ?? raw.videoUrl ?? '';

  let mediaType: SlideMediaType = 'text';
  if (video) mediaType = 'video';
  else if (image) mediaType = 'image';

  let title = raw.title || '';
  let caption = raw.description || '';
  let extra: SlideExtra = null;

  if (slideType.includes('quote')) {
    title = raw.quote || raw.title || '';
    caption = raw.cite ? `— ${raw.cite}` : raw.description || '';
  } else if (slideType.includes('fact')) {
    title = raw.title || 'Did you know?';
    caption = raw.fact || raw.description || '';
  } else if (slideType.includes('listicle')) {
    title = raw.title || '';
    caption = raw.listicle || raw.description || '';
    extra = {
      kind: 'list',
      items: Array.isArray(raw.listItems)
        ? (raw.listItems as Array<string | { text?: string; title?: string }>)
        : [],
    };
  } else if (slideType.includes('poll') || slideType.includes('quiz')) {
    title = raw.question || raw.title || '';
    caption = raw.description || '';
    extra = {
      kind: slideType.includes('quiz') ? 'quiz' : 'poll',
      options: Array.isArray(raw.options)
        ? (raw.options as Array<string | { text?: string; title?: string; label?: string }>)
        : [],
    };
  }

  const timer = Number(raw.timer);
  const durationMs = Number.isFinite(timer) && timer > 0 ? timer * 1000 : 5000;

  return {
    id: `${storyId}-${order}`,
    order,
    slideType,
    isCover: slideType === 'cover-slide',
    mediaType,
    imageUrl: image,
    videoUrl: video,
    title,
    caption,
    extra,
    mediaCredit:
      raw.mediaSource ||
      raw.imageCredits ||
      raw.videoCredits ||
      raw.imageSource ||
      '',
    actionUrl: raw.url || '',
    actionLabel:
      raw.urlAction === 'readMore' ? 'Read more' : raw.urlAction || '',
    slideAuthor: raw.author || '',
    authorByLine: Boolean(raw.authorByLine),
    attribute: raw.attribute || '',
    pollId: raw.pollId ?? null,
    quizId: raw.quizId ?? null,
    durationMs,
    bg: wsGradientFor(`${storyId}-${order}`),
  };
}

function transformWebStoryDetails(
  raw: RawWebStoryDetails | null | undefined,
  fallbackId: number | string,
): WebStoryDetails {
  const empty: WebStoryDetails = {
    story: {
      id: Number(fallbackId) || 0,
      title: '',
      slug: '',
      description: '',
      coverImage: '',
      coverBg: wsGradientFor(fallbackId),
      publishedWhen: null,
      timeAgo: '',
      author: null,
      featured: false,
      theme: null,
      authorByLine: null,
    },
    slides: [],
  };
  if (!raw) return empty;

  // Defensively unwrap common envelope shapes.
  const root: RawWebStoryDetails =
    raw.webStory ?? raw.story ?? raw.data?.webStory ?? raw.data ?? raw;

  const id = (root.storyId ?? Number(fallbackId)) as number;
  const title = root.title || '';
  const slug = root.pageUrl || '';
  const description = root.description || '';
  const hasThumb =
    root.hasThumbnail === false ? false : Boolean(root.thumbnailUrl);
  const coverImage = hasThumb ? (root.thumbnailUrl || '') : '';
  const publishedWhen = root.publishedWhen || root.createdWhen || null;

  // slidesJson may be a JSON STRING (canonical), a parsed array, or missing.
  let rawSlides: RawSlide[] = [];
  if (typeof root.slidesJson === 'string' && root.slidesJson.trim()) {
    try {
      const parsed = JSON.parse(root.slidesJson);
      if (Array.isArray(parsed)) rawSlides = parsed as RawSlide[];
    } catch (e) {
      console.error('[webstories] Failed to parse slidesJson', e);
    }
  } else if (Array.isArray(root.slidesJson)) {
    rawSlides = root.slidesJson;
  } else if (Array.isArray(root.slides)) {
    rawSlides = root.slides;
  }

  const slides = rawSlides
    .map((s, i) => transformSlide(s, i, id))
    .sort((a, b) => a.order - b.order);

  return {
    story: {
      id,
      title,
      slug,
      description,
      coverImage: coverImage || '',
      coverBg: coverImage ? null : wsGradientFor(id),
      publishedWhen,
      timeAgo: relativeTimeAgo(publishedWhen),
      author: buildAuthor(root),
      featured: Boolean(root.featured),
      theme: root.theme ?? null,
      authorByLine: root.authorByLine ?? null,
    },
    slides,
  };
}

export async function fetchWebStories(
  page = 1,
  pageSize = 24,
): Promise<WebStoriesPage> {
  try {
    const { data } = await apiClient.get('/webstories', {
      params: { page, pageSize },
    });
    const rawList: RawWebStorySummary[] = Array.isArray(data?.data)
      ? data.data
      : [];
    const totalItems: number = Number(data?.totalCount) || 0;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;

    return {
      stories: rawList.map(transformWebStorySummary),
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    console.error(
      '[API] fetchWebStories failed:',
      err?.response?.status,
      err?.response?.data ?? err?.message,
    );
    throw e;
  }
}

export async function fetchWebStoryDetails(
  storyId: number | string,
): Promise<WebStoryDetails> {
  try {
    const { data } = await apiClient.get(`/webstories/${storyId}/details`);
    return transformWebStoryDetails(data as RawWebStoryDetails, storyId);
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    console.error(
      '[API] fetchWebStoryDetails failed:',
      err?.response?.status,
      err?.response?.data ?? err?.message,
    );
    throw e;
  }
}
