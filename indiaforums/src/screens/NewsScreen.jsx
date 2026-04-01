import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import styles from './NewsScreen.module.css';

import CategoryBar from '../components/strips/CategoryBar';
import LanguageBar from '../components/strips/LanguageBar';
import NewsVerticalCard from '../components/cards/NewsVerticalCard';
import NewsHorizontalCard from '../components/cards/NewsHorizontalCard';
import VideoSection from '../components/sections/VideoSection';
import QuizSection from '../components/sections/QuizSection';
import PhotoGallerySection from '../components/sections/PhotoGallerySection';
import VisualStoriesSection from '../components/sections/VisualStoriesSection';

import {
  NEWS_CATS, NS_LANGS, getArticleBatch,
  VIDEOS as FALLBACK_VIDEOS, QUIZZES, PHOTO_GALLERIES, VISUAL_STORIES,
} from '../data/newsData';
import { fetchArticles, fetchVideos } from '../services/api';

const VIDEO_BATCH = 4;

const BATCH_SIZE    = 4;
const SECTION_CYCLE = ['videos', 'quiz', 'photos', 'stories'];

export default function NewsScreen({ onArticlePress, onVideoPress }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeLang,     setActiveLang]     = useState('all');

  // API state
  const [articles,       setArticles]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [page,           setPage]           = useState(1);
  const [hasMore,        setHasMore]        = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);

  // Videos state (for VideoSection in the interleaved feed)
  const [apiVideos,      setApiVideos]      = useState([]);

  // Local data state (for sub-category / language filtering)
  const [chunksLoaded,   setChunksLoaded]   = useState(1);
  const [localLoading,   setLocalLoading]   = useState(false);

  const feedRef     = useRef(null);
  const sentinelRef = useRef(null);
  const loadingRef  = useRef(false);

  // Are we using API data or local data?
  const useApiData = activeLang === 'all';

  const langs = NS_LANGS[activeCategory] || [];

  // ── Fetch articles from API ────────────────────────────────────────────────
  const loadArticles = useCallback(async (pageNum, replace = false) => {
    if (replace) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await fetchArticles(pageNum, 25);
      setArticles(prev => replace ? result.articles : [...prev, ...result.articles]);
      setHasMore(result.pagination.hasNextPage);
    } catch (err) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadArticles(1, true); }, [loadArticles]);

  // Fetch videos for the interleaved VideoSection
  useEffect(() => {
    fetchVideos(1, 20)
      .then(result => setApiVideos(result.videos))
      .catch(() => { /* keep apiVideos empty; renderItem falls back to FALLBACK_VIDEOS */ });
  }, []);

  // ── Filter API articles by category ────────────────────────────────────────
  const apiFiltered = useMemo(() => {
    if (activeCategory === 'all') return articles;
    return articles.filter(a => {
      const newsCat = a.cat.toLowerCase() === 'television' ? 'tv' : a.cat.toLowerCase();
      return newsCat === activeCategory;
    });
  }, [articles, activeCategory]);

  // ── Build local data feed (when a specific language is selected) ───────────
  const localFeedItems = useMemo(() => {
    if (useApiData) return [];

    const items      = [];
    const pageCounts = { videos: 0, quiz: 0, photos: 0, stories: 0 };
    let cycleIdx     = 0;

    for (let chunk = 0; chunk < chunksLoaded; chunk++) {
      const batch = getArticleBatch(activeCategory, activeLang, chunk, BATCH_SIZE);
      if (batch.length === 0) break;

      batch.forEach((a, i) => {
        const isVertical = (chunk === 0 && i === 0) || (chunk > 0 && i === 2);
        items.push({
          type:       'article',
          data:       a,
          isVertical,
          key:        `article-${a.id}`,
        });
      });

      const sType = SECTION_CYCLE[cycleIdx % SECTION_CYCLE.length];
      const pIdx  = pageCounts[sType];
      items.push({ type: sType, pageIdx: pIdx, key: `${sType}-${chunk}` });
      pageCounts[sType]++;
      cycleIdx++;
    }

    return items;
  }, [useApiData, activeCategory, activeLang, chunksLoaded]);

  // ── Build API feed (interleaved) ───────────────────────────────────────────
  const apiFeedItems = useMemo(() => {
    if (!useApiData) return [];

    const items      = [];
    const pageCounts = { videos: 0, quiz: 0, photos: 0, stories: 0 };
    let cycleIdx     = 0;

    for (let i = 0; i < apiFiltered.length; i += BATCH_SIZE) {
      const batch = apiFiltered.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) break;

      const chunkIdx = Math.floor(i / BATCH_SIZE);

      batch.forEach((a, j) => {
        const isVertical = (chunkIdx === 0 && j === 0) || (chunkIdx > 0 && j === 2);
        items.push({
          type:       'article',
          data:       a,
          isVertical,
          key:        `article-${a.id}-${i + j}`,
        });
      });

      const sType = SECTION_CYCLE[cycleIdx % SECTION_CYCLE.length];
      const pIdx  = pageCounts[sType];
      items.push({ type: sType, pageIdx: pIdx, key: `${sType}-${chunkIdx}` });
      pageCounts[sType]++;
      cycleIdx++;
    }

    return items;
  }, [useApiData, apiFiltered]);

  const feedItems    = useApiData ? apiFeedItems : localFeedItems;
  const isLoading    = useApiData ? loading : false;
  const hasArticles  = useApiData ? apiFiltered.length > 0 : localFeedItems.some(i => i.type === 'article');

  // ── Infinite scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          loadingRef.current = true;

          if (useApiData && hasMore) {
            const next = page + 1;
            setPage(next);
            loadArticles(next, false).finally(() => {
              loadingRef.current = false;
            });
          } else if (!useApiData) {
            setLocalLoading(true);
            setTimeout(() => {
              setChunksLoaded(c => c + 1);
              setLocalLoading(false);
              loadingRef.current = false;
            }, 400);
          } else {
            loadingRef.current = false;
          }
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [useApiData, page, hasMore, loadArticles, chunksLoaded]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleCategoryChange(cat) {
    setActiveCategory(cat);
    setActiveLang('all');
    setChunksLoaded(1);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }

  function handleLangChange(lang) {
    setActiveLang(lang);
    setChunksLoaded(1);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }

  function renderItem(item) {
    if (item.type === 'article') {
      const handler = () => onArticlePress && onArticlePress(item.data);
      return item.isVertical
        ? <NewsVerticalCard   key={item.key} {...item.data} onClick={handler} />
        : <NewsHorizontalCard key={item.key} {...item.data} delay={0.04} onClick={handler} />;
    }

    if (item.type === 'videos') {
      const videoPool = apiVideos.length > 0 ? apiVideos : FALLBACK_VIDEOS;
      const start = (item.pageIdx * VIDEO_BATCH) % videoPool.length;
      const batch = videoPool.slice(start, start + VIDEO_BATCH);
      const videos = batch.length === VIDEO_BATCH ? batch : [...batch, ...videoPool].slice(0, VIDEO_BATCH);
      return <VideoSection key={item.key} videos={videos} onVideoPress={onVideoPress} />;
    }

    const pool = {
      quiz:    QUIZZES[item.pageIdx % QUIZZES.length],
      photos:  PHOTO_GALLERIES[item.pageIdx % PHOTO_GALLERIES.length],
      stories: VISUAL_STORIES[item.pageIdx % VISUAL_STORIES.length],
    }[item.type];
    if (item.type === 'quiz')    return <QuizSection          key={item.key} quiz={pool} />;
    if (item.type === 'photos')  return <PhotoGallerySection  key={item.key} galleries={pool} />;
    if (item.type === 'stories') return <VisualStoriesSection key={item.key} stories={pool} />;
    return null;
  }

  return (
    <div className={styles.screen}>
      <div className={styles.tabContainer}>
        <CategoryBar cats={NEWS_CATS} activeId={activeCategory} onSelect={handleCategoryChange} />
        <LanguageBar langs={langs} activeId={activeLang} onSelect={handleLangChange} />
      </div>

      <div className={styles.feed} ref={feedRef}>
        <div className={styles.articles}>
          {/* Loading skeleton — initial API load */}
          {isLoading && articles.length === 0 && (
            <div className={styles.skelWrap}>
              <div className={styles.skelHero} />
              {[1, 2, 3].map(i => (
                <div key={i} className={styles.skelRow}>
                  <div className={styles.skelThumb} />
                  <div className={styles.skelBody}>
                    <div className={styles.skelCat} />
                    <div className={styles.skelTitle} />
                    <div className={styles.skelTitle2} />
                    <div className={styles.skelMeta} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && useApiData && (
            <div className={styles.errorWrap}>
              <div className={styles.errorIcon}>!</div>
              <div className={styles.errorText}>{error}</div>
              <button className={styles.retryBtn} onClick={() => { setPage(1); loadArticles(1, true); }}>Retry</button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && !hasArticles && (
            <div className={styles.empty}>No articles found for this selection.</div>
          )}

          {/* Feed items */}
          {!isLoading && feedItems.map(item => renderItem(item))}

          <div ref={sentinelRef} className={styles.sentinel} />

          {(loadingMore || localLoading) && (
            <div className={styles.loadingRow}>
              <div className={styles.spinner} />
            </div>
          )}

          <div className={styles.spacer} />
        </div>
      </div>
    </div>
  );
}
