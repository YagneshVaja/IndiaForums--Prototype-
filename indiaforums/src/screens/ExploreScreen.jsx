import { useState, useMemo } from 'react';
import styles from './ExploreScreen.module.css';

import ErrorState from '../components/ui/ErrorState';
import StoriesStrip from '../components/strips/StoriesStrip';
import WebStoriesStrip from '../components/stories/WebStoriesStrip';
import FeaturedCarousel from '../components/strips/FeaturedCarousel';
import ChipsRow from '../components/strips/ChipsRow';
import SectionHeader from '../components/ui/SectionHeader';
import ArticleCard from '../components/cards/ArticleCard';
import ThreadCard from '../components/cards/ThreadCard';
import PhotoGallerySection from '../components/sections/PhotoGallerySection';

import { EXPLORE_CHIPS } from '../data/articles';
import { FORUMS, FORUM_TABS } from '../data/forums';
import { GALLERIES } from '../data/galleryData';
import useHomeData from '../hooks/useHomeData';

const PREVIEW_GALLERIES = GALLERIES.slice(0, 4);

export default function ExploreScreen({ onArticlePress, onGalleryPress, onGalleriesOpen, onStoryPress, onWebStorySelect }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeForumTab, setActiveForumTab] = useState('announcements');

  // Single aggregated call: /home/initial (banners + articles) on mount,
  // /home/articles?articleType=... when category chip changes.
  const { banners, articles, loading, articlesLoading, error, refresh } = useHomeData(activeCategory);

  const threads = useMemo(
    () => FORUMS[activeForumTab] || FORUMS.announcements,
    [activeForumTab]
  );

  return (
    <div className={styles.screen}>
      <StoriesStrip onItemPress={onStoryPress} />

      <SectionHeader title="Trending Now" linkLabel={null} />
      <FeaturedCarousel banners={banners} onArticlePress={onArticlePress} />

      <ChipsRow chips={EXPLORE_CHIPS} activeId={activeCategory} onSelect={setActiveCategory} />

      <div className={styles.articles}>
        {/* Loading skeleton */}
        {loading && articles.length === 0 && (
          <div className={styles.loadingWrap}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skelThumb} />
                <div className={styles.skelBody}>
                  <div className={styles.skelCat} />
                  <div className={styles.skelTitle} />
                  <div className={styles.skelTitle2} />
                  <div className={styles.skelTime} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state — only when no articles to show */}
        {error && articles.length === 0 && <ErrorState message={error} onRetry={refresh} />}

        {/* Articles list */}
        {!articlesLoading && !error && articles.length === 0 && (
          <div className={styles.emptyText}>No articles found in this category</div>
        )}

        {articles.map((a, i) => (
          <ArticleCard key={a.id} {...a} delay={i * 0.06} onClick={() => onArticlePress && onArticlePress(a)} />
        ))}
      </div>

      {/* Galleries strip */}
      <PhotoGallerySection
        galleries={PREVIEW_GALLERIES}
        onSeeAll={onGalleriesOpen}
        onGalleryPress={onGalleryPress}
      />

      {/* Web Stories horizontal strip */}
      <WebStoriesStrip
        onSeeAll={() => onStoryPress && onStoryPress({ label: 'Web Stories' })}
        onWebStorySelect={onWebStorySelect}
      />

      <SectionHeader title="Forums" />
      <div className={styles.forumWrap}>
        <div className={styles.forumTabs}>
          {FORUM_TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`${styles.tab} ${activeForumTab === id ? styles.tabActive : ''}`}
              onClick={() => setActiveForumTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {threads.map((t, i) => (
          <ThreadCard key={t.id} {...t} delay={i * 0.06} />
        ))}
      </div>

      <div className={styles.spacer} />
    </div>
  );
}
