import { useState, useEffect, useCallback, useRef } from 'react';
import { getHomeBanners, getHomeArticles } from '../services/homeApi';
import { transformHomeArticle, transformBanner } from '../services/api';

// ── Chip ID → API articleType ────────────────────────────────────────────────
// ExploreScreen chips use 'television'; API uses 'tv'. Everything else matches.
const CHIP_TO_API_TYPE = {
  all:        'all',
  television: 'tv',
  movies:     'movies',
  digital:    'digital',
  lifestyle:  'lifestyle',
  sports:     'sports',
};

/**
 * useHomeData — loads home page banners and articles via the proven endpoints:
 *   /home/banners  → banners for the featured carousel (parallel with articles)
 *   /home/articles → paginated articles with articleType filter
 *
 * On mount: fetches both in parallel.
 * On category chip change: re-fetches articles only.
 *
 * Strict-Mode safe: uses prevCategoryRef pattern so the category-change
 * effect is only triggered on genuine value changes, not React's
 * double-invocation during development.
 *
 * @param {string} activeCategory — chip ID, one of CHIP_TO_API_TYPE keys
 */
export default function useHomeData(activeCategory = 'all') {
  const [banners, setBanners]               = useState([]);
  const [articles, setArticles]             = useState([]);
  const [pagination, setPagination]         = useState(null);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [error, setError]                   = useState(null);
  const [page, setPage]                     = useState(1);

  const inFlightRef     = useRef(null);
  // prevCategoryRef: tracks last category we *acted on*.
  // null = no action taken yet — handles Strict Mode double-run safely.
  const prevCategoryRef = useRef(null);

  // ── Phase 1: initial load — banners + articles in parallel ──────────────
  const loadInitial = useCallback(async () => {
    if (inFlightRef.current === 'initial') return; // guard strict-mode double-call
    inFlightRef.current = 'initial';
    setBannersLoading(true);
    setArticlesLoading(true);
    setError(null);

    try {
      // Fetch banners and initial 'all' articles in parallel
      const [bannersRes, articlesRes] = await Promise.all([
        getHomeBanners(),
        getHomeArticles({ articleType: 'all', pageNumber: 1 }),
      ]);

      // HomeBannersResponseDto: { banners: BannerItemDto[], totalCount }
      const rawBanners = bannersRes.data?.banners || [];
      setBanners(rawBanners.map(transformBanner));

      // HomeArticlesResponseDto: { articles: HomeArticleDto[], totalCount, pageNumber, pageSize }
      const rawArticles = articlesRes.data?.articles || [];
      setArticles(rawArticles.map(transformHomeArticle));
      const total   = articlesRes.data?.totalCount || 0;
      const pgSize  = articlesRes.data?.pageSize   || 12;
      setPagination({ hasNextPage: total > pgSize, totalCount: total });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load home content');
    } finally {
      setBannersLoading(false);
      setArticlesLoading(false);
      inFlightRef.current = null;
    }
  }, []); // no deps — always loads 'all' articles on mount

  // ── Filtered articles (category chip changed) ────────────────────────────
  const loadArticles = useCallback(async (pageNum = 1) => {
    const key = `articles-${pageNum}-${activeCategory}`;
    if (inFlightRef.current === key) return;
    inFlightRef.current = key;
    setArticlesLoading(true);
    setError(null);

    try {
      const { data } = await getHomeArticles({
        articleType: CHIP_TO_API_TYPE[activeCategory] ?? 'all',
        pageNumber:  pageNum,
      });

      // HomeArticlesResponseDto: { articles: HomeArticleDto[], totalCount, pageNumber, pageSize }
      const rawArticles = data?.articles || [];
      setArticles(prev =>
        pageNum === 1
          ? rawArticles.map(transformHomeArticle)
          : [...prev, ...rawArticles.map(transformHomeArticle)]
      );
      const total  = data?.totalCount || 0;
      const pgSize = data?.pageSize   || 12;
      const hasNextPage = total > pageNum * pgSize;
      setPagination({ hasNextPage, totalCount: total });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load articles');
    } finally {
      setArticlesLoading(false);
      inFlightRef.current = null;
    }
  }, [activeCategory]);

  // ── Mount: initial full load ─────────────────────────────────────────────
  useEffect(() => {
    loadInitial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Category change: server-side filtered fetch ──────────────────────────
  // prevCategoryRef starts as null.
  // First run (mount): null → set to activeCategory → skip (initial covers it).
  // Strict Mode second run: prevCategoryRef === activeCategory → skip.
  // Genuine category change: prevCategoryRef !== activeCategory → fetch.
  useEffect(() => {
    if (prevCategoryRef.current === null) {
      prevCategoryRef.current = activeCategory;
      return;
    }
    if (prevCategoryRef.current === activeCategory) {
      return; // Strict Mode double-invocation or no real change
    }
    prevCategoryRef.current = activeCategory;
    setPage(1);
    loadArticles(1);
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !articlesLoading) {
      const next = page + 1;
      setPage(next);
      loadArticles(next);
    }
  }, [pagination, articlesLoading, page, loadArticles]);

  const refresh = useCallback(() => {
    setPage(1);
    prevCategoryRef.current = null;
    inFlightRef.current = null;
    loadInitial();
  }, [loadInitial]);

  return {
    banners,
    articles,
    pagination,
    loading:          bannersLoading || articlesLoading,
    bannersLoading,
    articlesLoading,
    error,
    loadMore,
    refresh,
  };
}
