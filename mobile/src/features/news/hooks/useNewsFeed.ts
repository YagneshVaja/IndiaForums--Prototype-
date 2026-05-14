import { useEffect, useMemo } from 'react';
import { useNewsArticles, useNewsGalleries, useNewsVideos } from './useNewsData';
import { useTrendingMovies } from './useTrendingMovies';
import { QUIZZES, VISUAL_STORIES } from '../data/newsStaticData';
import {
  assembleNewsFeed,
  BLOCK_SIZE,
  RAIL_SLICE,
  type FeedItem,
} from '../utils/assembleNewsFeed';
import type { Article, Gallery, Movie, Video } from '../../../services/api';

export interface UseNewsFeedResult {
  items: FeedItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

// Five-way rotation means each *rail* kind appears once per 5 media blocks;
// each media block is one per BLOCK_SIZE articles. So each rail-type's
// expected article interval is BLOCK_SIZE × 5 = 20 articles. We trigger that
// pool's next page when consumption is about to exhaust the current page.
const ROTATION_LEN = 5;
const ARTICLES_PER_RAIL_INJECT = BLOCK_SIZE * ROTATION_LEN;

// Prefetch a media-pool page when the next rail injection would empty it.
// One pool page covers ~3 rails (12 items / 4 per slice), so a small lead
// keeps the assembler from ever running dry mid-scroll.
const POOL_LEAD = RAIL_SLICE;

// Orchestrates everything the News tab feed needs: paginated articles for the
// current category + paginated media pools (videos / galleries / movies)
// plus static seed (quizzes, visual stories). The assembler is pure and runs
// once per (articles, pools, category) change.
//
// `category === 'all'` uses /articles/list; any other category uses
// /home/articles?articleType=<category> server-side. Sub-cat filters were
// dropped in the redesign in favour of one continuous feed.
//
// Pagination strategy:
//   • Articles paginate via FlashList's onEndReached → fetchNextPage.
//   • Media pools paginate eagerly from inside this hook: as the article
//     stream grows, this hook computes how many items of each kind the
//     assembler is *about to consume* and pulls the next pool page in
//     advance so the feed never stalls on an empty rail.
//   • Static pools (quizzes, stories) don't paginate — when locally
//     exhausted, that kind simply stops appearing.
export function useNewsFeed(category: string): UseNewsFeedResult {
  const articlesQ  = useNewsArticles(category, false);
  const videosQ    = useNewsVideos();
  const galleriesQ = useNewsGalleries();
  const moviesQ    = useTrendingMovies();

  // Flatten + dedup paginated articles. Mirrors the previous behaviour so the
  // article stream is identical to the pre-redesign feed.
  const articles: Article[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Article[] = [];
    for (const page of articlesQ.data?.pages ?? []) {
      for (const a of page) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          out.push(a);
        }
      }
    }
    return out;
  }, [articlesQ.data]);

  // Flatten + dedup the paginated media pools. Dedup is defensive — the
  // backend occasionally repeats records across page boundaries when the
  // underlying feed re-orders between requests.
  const videos: Video[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Video[] = [];
    for (const page of videosQ.data?.pages ?? []) {
      for (const v of page.videos) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          out.push(v);
        }
      }
    }
    return out;
  }, [videosQ.data]);

  const galleries: Gallery[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Gallery[] = [];
    for (const page of galleriesQ.data?.pages ?? []) {
      for (const g of page.galleries) {
        const key = String(g.id);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(g);
        }
      }
    }
    return out;
  }, [galleriesQ.data]);

  const movies: Movie[] = useMemo(() => {
    const seen = new Set<number>();
    const out: Movie[] = [];
    for (const page of moviesQ.data?.pages ?? []) {
      for (const m of page.movies) {
        if (!seen.has(m.titleId)) {
          seen.add(m.titleId);
          out.push(m);
        }
      }
    }
    return out;
  }, [moviesQ.data]);

  const items = useMemo(
    () =>
      assembleNewsFeed({
        articles,
        pools: {
          videos,
          stories:   VISUAL_STORIES,
          quizzes:   QUIZZES,
          galleries,
          movies,
        },
      }),
    [articles, videos, galleries, movies],
  );

  // ── Pool pagination triggers ─────────────────────────────────────────────
  // For each paginating pool, estimate how many items the assembler will
  // need given the current article count, and pull the next API page when
  // we're within POOL_LEAD items of running out. Static pools (quizzes,
  // stories) don't participate — they just stop appearing once exhausted.
  //
  // Effect deps below pull primitives (hasNextPage, isFetchingNextPage,
  // fetchNextPage) out of the full query object. The query reference itself
  // changes on every render — depending on it ran every effect every render
  // unnecessarily. Primitives are stable until the underlying state actually
  // changes, which is what React's exhaustive-deps lint wants anyway.
  const expectedRails    = Math.floor(articles.length / ARTICLES_PER_RAIL_INJECT) + 1;
  const expectedItemsNeed = expectedRails * RAIL_SLICE + POOL_LEAD;

  const videosHasNext    = videosQ.hasNextPage;
  const videosFetching   = videosQ.isFetchingNextPage;
  const videosFetchNext  = videosQ.fetchNextPage;
  useEffect(() => {
    if (videos.length < expectedItemsNeed && videosHasNext && !videosFetching) {
      videosFetchNext();
    }
  }, [videos.length, expectedItemsNeed, videosHasNext, videosFetching, videosFetchNext]);

  const galleriesHasNext   = galleriesQ.hasNextPage;
  const galleriesFetching  = galleriesQ.isFetchingNextPage;
  const galleriesFetchNext = galleriesQ.fetchNextPage;
  useEffect(() => {
    if (galleries.length < expectedItemsNeed && galleriesHasNext && !galleriesFetching) {
      galleriesFetchNext();
    }
  }, [galleries.length, expectedItemsNeed, galleriesHasNext, galleriesFetching, galleriesFetchNext]);

  const moviesHasNext   = moviesQ.hasNextPage;
  const moviesFetching  = moviesQ.isFetchingNextPage;
  const moviesFetchNext = moviesQ.fetchNextPage;
  useEffect(() => {
    if (movies.length < expectedItemsNeed && moviesHasNext && !moviesFetching) {
      moviesFetchNext();
    }
  }, [movies.length, expectedItemsNeed, moviesHasNext, moviesFetching, moviesFetchNext]);

  // Eagerly prefetch page 2 once page 1 lands so a 30-article buffer is
  // ready before the user hits the bottom. With the /articles/list paging
  // bug fixed, one extra page is plenty — onEndReached handles everything
  // beyond that.
  const ARTICLE_PREFETCH_FLOOR = 30;
  const articlesHasNext   = articlesQ.hasNextPage;
  const articlesFetching  = articlesQ.isFetchingNextPage;
  const articlesFetchNext = articlesQ.fetchNextPage;
  useEffect(() => {
    if (
      articlesHasNext &&
      !articlesFetching &&
      articles.length > 0 &&
      articles.length < ARTICLE_PREFETCH_FLOOR
    ) {
      articlesFetchNext();
    }
  }, [articles.length, articlesHasNext, articlesFetching, articlesFetchNext]);

  return {
    items,
    isLoading: articlesQ.isLoading,
    isError:   articlesQ.isError,
    refetch:   articlesQ.refetch,
    hasNextPage:        articlesQ.hasNextPage ?? false,
    isFetchingNextPage: articlesQ.isFetchingNextPage,
    fetchNextPage:      articlesQ.fetchNextPage,
  };
}
