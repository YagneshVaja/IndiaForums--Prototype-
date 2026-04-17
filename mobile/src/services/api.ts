import axios from 'axios';

// ---------------------------------------------------------------------------
// Base client
// ---------------------------------------------------------------------------

const apiClient = axios.create({
  baseURL: 'https://api.indiaforums.com/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Transform helpers
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

export interface ArticleDetail extends Article {
  body: string;
  authorAvatarUrl: string;
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

export interface Celebrity {
  id: string;
  name: string;
  profileImageUrl: string;
  category: string;
  followersCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformArticle(raw: any): Article {
  return {
    id: String(raw?.id ?? ''),
    slug: raw?.slug ?? '',
    title: raw?.title ?? '',
    summary: raw?.summary ?? raw?.excerpt ?? '',
    thumbnailUrl: raw?.thumbnail_url ?? raw?.thumbnailUrl ?? raw?.image_url ?? '',
    category: raw?.category ?? raw?.category_name ?? '',
    publishedAt: raw?.published_at ?? raw?.publishedAt ?? '',
    timeAgo: raw?.time_ago ?? raw?.timeAgo ?? '',
    authorName: raw?.author_name ?? raw?.authorName ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformBanner(raw: any): Banner {
  return {
    id: String(raw?.id ?? ''),
    title: raw?.title ?? '',
    imageUrl: raw?.image_url ?? raw?.imageUrl ?? '',
    articleId: String(raw?.article_id ?? raw?.articleId ?? ''),
    articleSlug: raw?.article_slug ?? raw?.articleSlug ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformCelebrity(raw: any): Celebrity {
  return {
    id: String(raw?.id ?? ''),
    name: raw?.name ?? '',
    profileImageUrl: raw?.profile_image_url ?? raw?.profileImageUrl ?? '',
    category: raw?.category ?? '',
    followersCount: Number(raw?.followers_count ?? raw?.followersCount ?? 0),
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchBanners(): Promise<Banner[]> {
  try {
    const response = await apiClient.get('/banners/featured');
    const data = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? response.data?.banners ?? []);
    return data.map(transformBanner);
  } catch {
    // Return mock data when API is unavailable (prototype)
    return getMockBanners();
  }
}

export interface FetchArticlesParams {
  category?: string;
  page?: number;
  limit?: number;
}

export async function fetchArticles(params: FetchArticlesParams = {}): Promise<Article[]> {
  const { category, page = 1, limit = 20 } = params;
  try {
    const queryParams: Record<string, string | number> = { page, limit };
    if (category) {
      queryParams.category = category;
    }
    const response = await apiClient.get('/articles', { params: queryParams });
    const data = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? response.data?.articles ?? []);
    return data.map(transformArticle);
  } catch {
    // Return mock data when API is unavailable (prototype)
    return getMockArticles(category);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformArticleDetail(raw: any): ArticleDetail {
  return {
    ...transformArticle(raw),
    body: raw?.body ?? raw?.content ?? raw?.html ?? '',
    authorAvatarUrl: raw?.author_avatar_url ?? raw?.authorAvatarUrl ?? '',
  };
}

export async function fetchArticleDetails(slugOrId: string): Promise<ArticleDetail> {
  try {
    const response = await apiClient.get(`/articles/${slugOrId}`);
    return transformArticleDetail(response.data?.data ?? response.data);
  } catch {
    return getMockArticleDetail(slugOrId);
  }
}

export async function fetchCelebrities(): Promise<Celebrity[]> {
  try {
    const response = await apiClient.get('/celebrities');
    const data = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? response.data?.celebrities ?? []);
    return data.map(transformCelebrity);
  } catch {
    // Return mock data when API is unavailable (prototype)
    return getMockCelebrities();
  }
}

// ---------------------------------------------------------------------------
// Mock data for prototype (API not yet live)
// ---------------------------------------------------------------------------

function getMockBanners(): Banner[] {
  return [
    {
      id: '1',
      title: 'Bollywood\'s Biggest Night: Award Season Begins',
      imageUrl: 'https://picsum.photos/seed/banner1/800/400',
      articleId: '101',
      articleSlug: 'bollywood-award-season-begins',
    },
    {
      id: '2',
      title: 'India vs Australia: T20 Series Preview',
      imageUrl: 'https://picsum.photos/seed/banner2/800/400',
      articleId: '102',
      articleSlug: 'india-vs-australia-t20-preview',
    },
    {
      id: '3',
      title: 'Tech Giants Announce Major India Investments',
      imageUrl: 'https://picsum.photos/seed/banner3/800/400',
      articleId: '103',
      articleSlug: 'tech-giants-india-investments',
    },
  ];
}

function getMockArticles(category?: string): Article[] {
  const articles: Article[] = [
    {
      id: '201',
      slug: 'srk-new-film-announcement',
      title: 'Shah Rukh Khan Announces His Next Big Film Project',
      summary: 'The superstar revealed details about his upcoming venture.',
      thumbnailUrl: 'https://picsum.photos/seed/art1/160/160',
      category: 'Bollywood',
      publishedAt: '2026-04-17T08:00:00Z',
      timeAgo: '2 hours ago',
      authorName: 'Priya Sharma',
    },
    {
      id: '202',
      slug: 'ipl-2026-highlights',
      title: 'IPL 2026: Match Highlights and Top Performances',
      summary: 'Key moments from yesterday\'s thrilling encounter.',
      thumbnailUrl: 'https://picsum.photos/seed/art2/160/160',
      category: 'Cricket',
      publishedAt: '2026-04-17T06:30:00Z',
      timeAgo: '4 hours ago',
      authorName: 'Rahul Mehta',
    },
    {
      id: '203',
      slug: 'politics-budget-session',
      title: 'Parliament Budget Session: Key Decisions Taken',
      summary: 'Finance minister presents revised budget allocation.',
      thumbnailUrl: 'https://picsum.photos/seed/art3/160/160',
      category: 'Politics',
      publishedAt: '2026-04-17T05:00:00Z',
      timeAgo: '6 hours ago',
      authorName: 'Arun Patel',
    },
    {
      id: '204',
      slug: 'deepika-new-project',
      title: 'Deepika Padukone Signs International Production Deal',
      summary: 'The actress partners with a top Hollywood studio.',
      thumbnailUrl: 'https://picsum.photos/seed/art4/160/160',
      category: 'Bollywood',
      publishedAt: '2026-04-16T20:00:00Z',
      timeAgo: '12 hours ago',
      authorName: 'Kavya Nair',
    },
    {
      id: '205',
      slug: 'india-tech-startup-funding',
      title: 'Indian Startup Ecosystem Sees Record Funding in Q1',
      summary: 'Multiple unicorns emerged in the first quarter of 2026.',
      thumbnailUrl: 'https://picsum.photos/seed/art5/160/160',
      category: 'Tech',
      publishedAt: '2026-04-16T14:00:00Z',
      timeAgo: '18 hours ago',
      authorName: 'Sanjay Kumar',
    },
    {
      id: '206',
      slug: 'virat-kohli-retirement-rumours',
      title: 'Virat Kohli Addresses Retirement Rumours',
      summary: 'The batting legend clears the air about his future plans.',
      thumbnailUrl: 'https://picsum.photos/seed/art6/160/160',
      category: 'Cricket',
      publishedAt: '2026-04-16T10:00:00Z',
      timeAgo: '22 hours ago',
      authorName: 'Mohit Singh',
    },
    {
      id: '207',
      slug: 'sports-asian-games-prep',
      title: 'India Prepares for Asian Games with Strong Contingent',
      summary: 'Athletes train intensively ahead of the games.',
      thumbnailUrl: 'https://picsum.photos/seed/art7/160/160',
      category: 'Sports',
      publishedAt: '2026-04-15T18:00:00Z',
      timeAgo: '1 day ago',
      authorName: 'Divya Reddy',
    },
    {
      id: '208',
      slug: 'entertainment-streaming-wars',
      title: 'OTT Platforms Battle for Indian Subscribers',
      summary: 'New content strategies emerge as competition intensifies.',
      thumbnailUrl: 'https://picsum.photos/seed/art8/160/160',
      category: 'Entertainment',
      publishedAt: '2026-04-15T12:00:00Z',
      timeAgo: '1 day ago',
      authorName: 'Neha Gupta',
    },
  ];

  if (!category) return articles;
  return articles.filter(
    (a) => a.category.toLowerCase() === category.toLowerCase(),
  );
}

function getMockCelebrities(): Celebrity[] {
  return [
    {
      id: '1',
      name: 'Shah Rukh Khan',
      profileImageUrl: 'https://picsum.photos/seed/srk/100/100',
      category: 'Bollywood',
      followersCount: 4_500_000,
    },
    {
      id: '2',
      name: 'Virat Kohli',
      profileImageUrl: 'https://picsum.photos/seed/vk18/100/100',
      category: 'Cricket',
      followersCount: 8_200_000,
    },
    {
      id: '3',
      name: 'Deepika Padukone',
      profileImageUrl: 'https://picsum.photos/seed/dp/100/100',
      category: 'Bollywood',
      followersCount: 3_100_000,
    },
  ];
}

function getMockArticleDetail(slugOrId: string): ArticleDetail {
  const mockArticles = getMockArticles();
  const found = mockArticles.find(
    (a) => a.slug === slugOrId || a.id === slugOrId,
  );
  const base = found ?? mockArticles[0];
  return {
    ...base,
    body: `<p>${base.summary}</p><p>This is a detailed article about ${base.title}. The story continues with more in-depth coverage and analysis of the events surrounding this topic.</p><p>Sources close to the matter have confirmed the details mentioned above. More updates are expected in the coming days.</p>`,
    authorAvatarUrl: `https://picsum.photos/seed/${base.authorName}/40/40`,
  };
}
