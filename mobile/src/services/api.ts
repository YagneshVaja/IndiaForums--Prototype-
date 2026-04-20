import axios from 'axios';

// ---------------------------------------------------------------------------
// Base client — real IndiaForums API
// ---------------------------------------------------------------------------

const apiClient = axios.create({
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
}

export interface ArticleItem {
  id: string;
  type: number;
  title?: string;
  contents?: string;
  mediaUrl?: string;
  mediaTitle?: string;
  source?: string;
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
  try {
    const { data } = await apiClient.get('/home/articles', {
      params: { articleType, pageNumber: page, pageSize: limit },
    });
    const articles = data?.articles ?? [];
    return articles.map(transformHomeArticle);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchArticles failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockArticles(category);
  }
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
function transformTopic(raw: any): ForumTopic {
  return {
    id:             Number(raw.topicId),
    forumId:        Number(raw.forumId ?? 0),
    forumName:      raw.forumName || '',
    forumThumbnail: raw.updateChecksum
      ? `https://img.indiaforums.com/forumavatar/200x200/0/${String(raw.forumId).padStart(3, '0')}.webp?uc=${raw.updateChecksum}`
      : null,
    title:       raw.subject || '',
    description: raw.topicDesc || '',
    poster:      raw.startThreadUserName || 'Anonymous',
    lastBy:      raw.lastThreadUserName || '',
    time:        timeAgo(raw.startThreadDate || new Date().toISOString()),
    lastTime:    timeAgo(raw.lastThreadDate || new Date().toISOString()),
    replies:     Number(raw.replyCount ?? 0),
    views:       Number(raw.viewCount ?? 0),
    likes:       Number(raw.likeCount ?? 0),
    locked:      Boolean(raw.locked ?? false),
    pinned:      Number(raw.priority ?? 0) > 0,
    flairId:     Number(raw.flairId ?? 0),
    topicImage:  raw.topicImage || null,
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

  try {
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
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchForumHome failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockForumsHomePage();
  }
}

/** Cross-forum "All Topics" feed. */
export async function fetchAllForumTopics(
  pageNumber = 1,
  pageSize = 20,
): Promise<AllTopicsPage> {
  try {
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
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchAllForumTopics failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockAllTopicsPage(pageNumber, pageSize);
  }
}

/** Topics for a single forum (drill-down view). */
export async function fetchForumTopics(
  forumId: number,
  pageNumber = 1,
  pageSize = 20,
): Promise<ForumTopicsPage> {
  try {
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
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchForumTopics failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockForumTopicsPage(forumId, pageNumber, pageSize);
  }
}

// ---------------------------------------------------------------------------
// Forum mocks — fallback when API is unreachable
// ---------------------------------------------------------------------------

function getMockForumsHomePage(): ForumsHomePage {
  const categories: ForumCategory[] = [
    { id: 1, parentId: 0, name: 'Education',     slug: 'education',     level: 1, forumCount: 42,  color: '#1e40af', bg: FORUM_CAT_GRADIENTS.education,     emoji: '🎓' },
    { id: 2, parentId: 0, name: 'Entertainment', slug: 'entertainment', level: 1, forumCount: 520, color: '#7c2d12', bg: FORUM_CAT_GRADIENTS.entertainment, emoji: '🎭' },
    { id: 3, parentId: 0, name: 'Finance',       slug: 'finance',       level: 1, forumCount: 88,  color: '#065f46', bg: FORUM_CAT_GRADIENTS.finance,       emoji: '💰' },
    { id: 4, parentId: 0, name: 'Sports',        slug: 'sports',        level: 1, forumCount: 210, color: '#14532d', bg: FORUM_CAT_GRADIENTS.sports,        emoji: '🏏' },
    { id: 5, parentId: 0, name: 'Television',    slug: 'television',    level: 1, forumCount: 640, color: '#4a1942', bg: FORUM_CAT_GRADIENTS.television,    emoji: '📺' },
  ];

  const mockForum = (id: number, name: string, description: string, slug: string, topicCount: number, rank: number): Forum => ({
    id,
    name,
    description,
    categoryId:    2,
    slug,
    topicCount,
    postCount:     topicCount * 42,
    followCount:   Math.max(0, 500 - rank * 20),
    rank,
    prevRank:      rank,
    rankDisplay:   '',
    bg:            FORUM_CAT_GRADIENTS[slug] || FORUM_CAT_GRADIENTS.general,
    emoji:         FORUM_CAT_EMOJIS[slug] || '💬',
    bannerUrl:     null,
    thumbnailUrl:  null,
    locked:        false,
    hot:           topicCount > 5000,
    priorityPosts: 0,
    editPosts:     0,
    deletePosts:   0,
  });

  const forums: Forum[] = [
    mockForum(1, 'Itti Si Khushi Sab TV',   'This is the Indian adaptation of Shameless', 'television', 0,      1),
    mockForum(2, 'Sampoorna',               'A tale of love, betrayal, and false accusations', 'television', 0, 2),
    mockForum(3, 'Bollywood',               'Join our Bollywood Forum for the latest Hindi movie discussions…', 'movies', 243800, 3),
    mockForum(4, 'Personified Fun',         'FUN-BANTER Unlimited ??', 'general', 72, 4),
    mockForum(5, 'Yeh Rishta Kya Kehlata Hai', 'Yeh Rishta Kya Kehlata Hai is into its fourth Generation now and is…', 'television', 45400, 5),
    mockForum(6, 'Mannat Har Khushi Paane Ki', 'The story revolves around Mannat, an aspiring young chef…', 'television', 103, 6),
  ];

  return {
    forums,
    categories,
    subCatMap: {},
    totalForumCount: 1658,
    totalPages:      83,
    pageNumber:      1,
  };
}

function getMockAllTopicsPage(pageNumber: number, pageSize: number): AllTopicsPage {
  const topics: ForumTopic[] = Array.from({ length: pageSize }, (_, i) => {
    const n = (pageNumber - 1) * pageSize + i + 1;
    return {
      id:             10000 + n,
      forumId:        3,
      forumName:      'Bollywood',
      forumThumbnail: null,
      title:          `Latest Bollywood discussion thread #${n}`,
      description:    'Join fans from across the country as they discuss recent releases, box office numbers, and industry gossip.',
      poster:         `User${n}`,
      lastBy:         `Fan${n}`,
      time:           `${n} min ago`,
      lastTime:       `${Math.max(1, n - 1)} min ago`,
      replies:        120 + n,
      views:          1200 + n * 10,
      likes:          40 + n,
      locked:         false,
      pinned:         false,
      flairId:        0,
      topicImage:     null,
    };
  });
  return {
    topics,
    totalCount:  12345,
    pageNumber,
    pageSize,
    hasNextPage: true,
  };
}

function getMockForumTopicsPage(forumId: number, pageNumber: number, pageSize: number): ForumTopicsPage {
  const topics: ForumTopic[] = Array.from({ length: pageSize }, (_, i) => {
    const n = (pageNumber - 1) * pageSize + i + 1;
    return {
      id:             20000 + n,
      forumId,
      forumName:      'Bollywood',
      forumThumbnail: null,
      title:          `Topic ${n}: What did you think of the latest episode?`,
      description:    'A lively thread where fans share their takes.',
      poster:         `User${n}`,
      lastBy:         `Fan${n}`,
      time:           `${n} hr ago`,
      lastTime:       `${Math.max(1, n - 1)} hr ago`,
      replies:        15 + n,
      views:          200 + n * 5,
      likes:          8 + n,
      locked:         false,
      pinned:         i < 2,
      flairId:        0,
      topicImage:     null,
    };
  });
  return {
    topics,
    forumDetail: {
      id:            forumId,
      name:          'Bollywood',
      description:   'Join our Bollywood Forum for the latest Hindi movie discussions.',
      categoryId:    2,
      slug:          'movies',
      topicCount:    243800,
      postCount:     5200000,
      followCount:   42000,
      rank:          3,
      prevRank:      3,
      rankDisplay:   '',
      bg:            FORUM_CAT_GRADIENTS.movies,
      emoji:         '🎬',
      bannerUrl:     null,
      thumbnailUrl:  null,
      locked:        false,
      hot:           true,
      priorityPosts: 0,
      editPosts:     0,
      deletePosts:   0,
    },
    flairs:      [],
    pageNumber,
    hasNextPage: true,
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
  };
}

export async function fetchTopicPosts(
  topicId: number,
  pageNumber = 1,
  pageSize = 20,
): Promise<TopicPostsPage> {
  try {
    const { data } = await apiClient.get(`/forums/topics/${topicId}/posts`, {
      params: { pageNumber, pageSize },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPosts: any[] = data?.posts || [];
    const rawDetail       = data?.topicDetail || null;
    const startAuthorId   = rawDetail?.startAuthorId ?? null;

    const posts = rawPosts.map(r => {
      const post = transformPost(r);
      if (startAuthorId && post.authorId === Number(startAuthorId)) post.isOp = true;
      return post;
    });

    return {
      posts,
      topicDetail: rawDetail ? transformTopic(rawDetail) : null,
      pageNumber,
      hasNextPage: Boolean(data?.hasMore ?? false),
    };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchTopicPosts failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockTopicPostsPage(topicId, pageNumber, pageSize);
  }
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
): Promise<ReplyResult> {
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, postId: null, error: 'Please enter a message.' };

  const body = {
    topicId,
    forumId,
    message: `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`,
    showSignature:     true,
    addToWatchList:    true,
    hasMaturedContent: false,
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

export async function createTopic(args: {
  forumId: number;
  subject: string;
  message: string;
  flairId?: number | null;
}): Promise<CreateTopicResult> {
  const subject = args.subject.trim();
  const message = args.message.trim();
  if (!subject)  return { ok: false, topicId: null, error: 'Please enter a title.' };
  if (!message)  return { ok: false, topicId: null, error: 'Please enter a message.' };

  const body: Record<string, unknown> = {
    forumId:           args.forumId,
    subject,
    message:           `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    topicTypeId:       1,
    showSignature:     true,
    addToWatchList:    true,
    hasMaturedContent: false,
    addToMyWall:       false,
  };
  if (args.flairId != null) body.flairId = args.flairId;

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMockTopicPostsPage(topicId: number, pageNumber: number, pageSize: number): TopicPostsPage {
  const posts: TopicPost[] = Array.from({ length: pageSize }, (_, i) => {
    const n = (pageNumber - 1) * pageSize + i + 1;
    return {
      id:           50000 + n,
      topicId,
      authorId:     1000 + n,
      author:       `User${n}`,
      realName:     n % 3 === 0 ? `Real Name ${n}` : '',
      rank:         n % 4 === 0 ? 'Moderator' : (n % 2 === 0 ? 'Senior Member' : 'Member'),
      message:      `<p>This is post <b>#${n}</b>. Just sharing my thoughts on this topic — loved the recent developments. What do you all think?</p>`,
      time:         `${n} hr ago`,
      rawTime:      new Date(Date.now() - n * 3600 * 1000).toISOString(),
      likes:        Math.max(0, 25 - n),
      avatarUrl:    null,
      avatarAccent: ['#3558F0', '#7c2d12', '#065f46', '#4c1d95'][n % 4],
      countryCode:  n % 2 === 0 ? 'IN' : 'US',
      badges:       [],
      isOp:         pageNumber === 1 && i === 0,
      isEdited:     n % 5 === 0,
      editedWhen:   n % 5 === 0 ? new Date(Date.now() - n * 600 * 1000).toISOString() : null,
      editedBy:     null,
      editCount:    n % 5 === 0 ? 1 : 0,
      postCount:    120 + n * 3,
      joinYear:     2015 + (n % 10),
    };
  });
  return {
    posts,
    topicDetail: null,
    pageNumber,
    hasNextPage: pageNumber < 3,
  };
}
