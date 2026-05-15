import { useEffect, useMemo, useState } from 'react';
import { useNewsArticles, useNewsGalleries, useNewsVideos } from './useNewsData';
import { useTrendingMovies } from './useTrendingMovies';
import {
  NEWS_CATEGORY_CONTENT_CAT,
  QUIZZES,
  VISUAL_STORIES,
} from '../data/newsStaticData';
import {
  assembleNewsFeed,
  BLOCK_SIZE,
  RAIL_SLICE,
  interleaveByCat,
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

  // `visibleCategory` is the category whose articles are currently rendered
  // in the feed — which is NOT always the one passed in. When the chip
  // changes, `useNewsArticles` swaps queryKey and serves the previous
  // category's articles via `keepPreviousData` until the new fetch lands.
  // If we drove pool filters off `category` during that window, the rails
  // (videos / photos / movies / quizzes / stories) would swap to the new
  // category while the article rows still show the old one — a visible
  // mid-swap flicker on every chip tap. Holding pool filters on
  // `visibleCategory` until articles actually update keeps the whole feed
  // atomic.
  const [visibleCategory, setVisibleCategory] = useState(category);
  useEffect(() => {
    if (articlesQ.data && !articlesQ.isPlaceholderData) {
      setVisibleCategory(category);
    }
  }, [category, articlesQ.data, articlesQ.isPlaceholderData]);

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

  // ── Category filtering for media pools ─────────────────────────────────
  // Articles already filter server-side (the /home/articles endpoint takes
  // `articleType`). Media pools don't expose a category filter on the API,
  // so we filter client-side against each item's `cat` (videos, galleries)
  // or its static `category` tag (quizzes, stories).
  //
  // Movies have no category metadata on the model — the rail is conceptually
  // "trending movies", which only really makes sense inside ALL or the
  // MOVIES tab. For every other category the movies rail simply doesn't
  // appear in rotation.
  const contentCat = NEWS_CATEGORY_CONTENT_CAT[visibleCategory]; // undefined for 'all'

  // On the ALL tab we round-robin by category before slicing into rails.
  // The IF backend returns content category-clumped — without interleaving,
  // the first videos / photos rail in ALL ends up looking mono-category
  // (e.g. an all-movies rail when the user clicked ALL). Other categories
  // already have category-coherent pools by definition, so no shuffle there.
  const filteredVideos = useMemo(() => {
    if (contentCat) return videos.filter((v) => v.cat === contentCat);
    return interleaveByCat(videos, (v) => v.cat);
  }, [videos, contentCat]);

  const filteredGalleries = useMemo(() => {
    if (contentCat) return galleries.filter((g) => g.cat === contentCat);
    return interleaveByCat(galleries, (g) => g.cat);
  }, [galleries, contentCat]);

  // All three of these gate on `visibleCategory`, NOT `category`. Same reason
  // as videos/galleries above: during the placeholder-data window between a
  // chip tap and the new article fetch landing, articles still show the old
  // category — so the rails must too, or you get a mid-swap flicker where
  // (e.g.) the quizzes rail jumps to MOVIES while article rows still show TV.
  const filteredMovies = useMemo(() => {
    if (visibleCategory === 'all' || visibleCategory === 'movies') return movies;
    return [];
  }, [movies, visibleCategory]);

  // Static pools are stored category-grouped in the file (easier to read).
  // For ALL, interleave so the first quiz/stories blocks aren't all-TV or
  // all-movies. For specific categories we filter to that subset.
  const filteredQuizzes = useMemo(() => {
    if (visibleCategory === 'all') return interleaveByCat(QUIZZES, (q) => q.category);
    return QUIZZES.filter((q) => q.category === visibleCategory);
  }, [visibleCategory]);

  const filteredStories = useMemo(() => {
    if (visibleCategory === 'all') return interleaveByCat(VISUAL_STORIES, (s) => s.category);
    return VISUAL_STORIES.filter((s) => s.category === visibleCategory);
  }, [visibleCategory]);

  const items = useMemo(
    () =>
      assembleNewsFeed({
        articles,
        pools: {
          videos:    filteredVideos,
          stories:   filteredStories,
          quizzes:   filteredQuizzes,
          galleries: filteredGalleries,
          movies:    filteredMovies,
        },
      }),
    [articles, filteredVideos, filteredStories, filteredQuizzes, filteredGalleries, filteredMovies],
  );

  // ── Pool pagination triggers ─────────────────────────────────────────────
  // For each paginating pool, estimate how many items the assembler will
  // need given the current article count, and pull the next API page when
  // the *filtered* pool is running low. Driving off the filtered count
  // (not the raw count) is what lets niche categories like SPORTS keep
  // fetching until enough matching items accumulate — without it, the
  // raw pool fills up quickly with mostly-irrelevant items and pagination
  // stops before the user sees any SPORTS videos.
  //
  // Cap each pool at MAX_POOL_PAGES so a category with truly no API
  // matches (e.g. a brand-new vertical with no content yet) can't loop
  // through the entire archive looking for non-existent items.
  //
  // Effect deps below pull primitives out of the full query object. The
  // query reference changes on every render — depending on it ran every
  // effect every render unnecessarily.
  const expectedRails    = Math.floor(articles.length / ARTICLES_PER_RAIL_INJECT) + 1;
  const expectedItemsNeed = expectedRails * RAIL_SLICE + POOL_LEAD;
  const MAX_POOL_PAGES = 8;

  const videosPages       = videosQ.data?.pages.length ?? 0;
  const videosHasNext     = videosQ.hasNextPage;
  const videosFetching    = videosQ.isFetchingNextPage;
  const videosFetchNext   = videosQ.fetchNextPage;
  useEffect(() => {
    if (
      filteredVideos.length < expectedItemsNeed &&
      videosPages < MAX_POOL_PAGES &&
      videosHasNext &&
      !videosFetching
    ) {
      videosFetchNext();
    }
  }, [filteredVideos.length, expectedItemsNeed, videosPages, videosHasNext, videosFetching, videosFetchNext]);

  const galleriesPages     = galleriesQ.data?.pages.length ?? 0;
  const galleriesHasNext   = galleriesQ.hasNextPage;
  const galleriesFetching  = galleriesQ.isFetchingNextPage;
  const galleriesFetchNext = galleriesQ.fetchNextPage;
  useEffect(() => {
    if (
      filteredGalleries.length < expectedItemsNeed &&
      galleriesPages < MAX_POOL_PAGES &&
      galleriesHasNext &&
      !galleriesFetching
    ) {
      galleriesFetchNext();
    }
  }, [filteredGalleries.length, expectedItemsNeed, galleriesPages, galleriesHasNext, galleriesFetching, galleriesFetchNext]);

  // Movies pool only matters when its rail can actually appear in the
  // current tab (ALL or MOVIES). Skip prefetching when the rail is gated
  // off — no point paging through the API for content that won't render.
  const moviesPages     = moviesQ.data?.pages.length ?? 0;
  const moviesHasNext   = moviesQ.hasNextPage;
  const moviesFetching  = moviesQ.isFetchingNextPage;
  const moviesFetchNext = moviesQ.fetchNextPage;
  const moviesGated     = category !== 'all' && category !== 'movies';
  useEffect(() => {
    if (moviesGated) return;
    if (
      filteredMovies.length < expectedItemsNeed &&
      moviesPages < MAX_POOL_PAGES &&
      moviesHasNext &&
      !moviesFetching
    ) {
      moviesFetchNext();
    }
  }, [filteredMovies.length, expectedItemsNeed, moviesPages, moviesGated, moviesHasNext, moviesFetching, moviesFetchNext]);

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
