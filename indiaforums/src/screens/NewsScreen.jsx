import { useState, useMemo, useEffect, useRef } from 'react';
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
  NEWS_CATS, NS_LANGS, getNewsArticles, getArticleBatch,
  VIDEOS, QUIZZES, PHOTO_GALLERIES, VISUAL_STORIES,
} from '../data/newsData';

const BATCH_SIZE    = 4;
const SECTION_CYCLE = ['videos', 'quiz', 'photos', 'stories'];

export default function NewsScreen({ onArticlePress }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeLang,     setActiveLang]     = useState('all');
  const [chunksLoaded,   setChunksLoaded]   = useState(1);
  const [loading,        setLoading]        = useState(false);

  const feedRef     = useRef(null);
  const sentinelRef = useRef(null);
  const loadingRef  = useRef(false);

  const langs      = NS_LANGS[activeCategory] || [];
  const hasArticles = useMemo(
    () => getNewsArticles(activeCategory, activeLang).length > 0,
    [activeCategory, activeLang]
  );

  // Build interleaved feed: BATCH_SIZE articles → section → repeat (truly unlimited)
  const feedItems = useMemo(() => {
    const items      = [];
    const pageCounts = { videos: 0, quiz: 0, photos: 0, stories: 0 };
    let cycleIdx     = 0;

    for (let chunk = 0; chunk < chunksLoaded; chunk++) {
      const batch = getArticleBatch(activeCategory, activeLang, chunk, BATCH_SIZE);
      if (batch.length === 0) break; // empty category/lang — stop

      batch.forEach((a, i) => {
        // First article of feed → big hero card
        // 3rd article of every subsequent batch → big featured card break
        const isVertical = (chunk === 0 && i === 0) || (chunk > 0 && i === 2);
        items.push({
          type:       'article',
          data:       a,
          isVertical,
          key:        `article-${a.id}`,
        });
      });

      // Inject one section after each batch
      const sType = SECTION_CYCLE[cycleIdx % SECTION_CYCLE.length];
      const pIdx  = pageCounts[sType];
      items.push({ type: sType, pageIdx: pIdx, key: `${sType}-${chunk}` });
      pageCounts[sType]++;
      cycleIdx++;
    }

    return items;
  }, [activeCategory, activeLang, chunksLoaded]);

  // Infinite scroll — re-observe whenever new content is rendered
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          setLoading(true);
          setTimeout(() => {
            setChunksLoaded(c => c + 1);
            setLoading(false);
            loadingRef.current = false;
          }, 400);
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [chunksLoaded]);

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

    const pool = {
      videos:  VIDEOS[item.pageIdx % VIDEOS.length],
      quiz:    QUIZZES[item.pageIdx % QUIZZES.length],
      photos:  PHOTO_GALLERIES[item.pageIdx % PHOTO_GALLERIES.length],
      stories: VISUAL_STORIES[item.pageIdx % VISUAL_STORIES.length],
    }[item.type];

    if (item.type === 'videos')  return <VideoSection         key={item.key} videos={pool} />;
    if (item.type === 'quiz')    return <QuizSection          key={item.key} quiz={pool} />;
    if (item.type === 'photos')  return <PhotoGallerySection  key={item.key} galleries={pool} />;
    if (item.type === 'stories') return <VisualStoriesSection key={item.key} stories={pool} />;
    return null;
  }

  return (
    <div className={styles.screen}>
      <div className={styles.tabContainer}>
        <CategoryBar cats={NEWS_CATS} activeId={activeCategory} onSelect={handleCategoryChange} />
        <LanguageBar langs={langs}    activeId={activeLang}      onSelect={handleLangChange} />
      </div>

      <div className={styles.feed} ref={feedRef}>
        <div className={styles.articles}>
          {!hasArticles ? (
            <div className={styles.empty}>No articles found for this selection.</div>
          ) : (
            feedItems.map(item => renderItem(item))
          )}

          <div ref={sentinelRef} className={styles.sentinel} />

          {loading && (
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
