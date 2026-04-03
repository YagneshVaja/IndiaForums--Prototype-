import { useState, useMemo, useEffect } from 'react';
import styles from './ExploreScreen.module.css';

import StoriesStrip from '../components/strips/StoriesStrip';
import FeaturedCarousel from '../components/strips/FeaturedCarousel';
import ChipsRow from '../components/strips/ChipsRow';
import SectionHeader from '../components/ui/SectionHeader';
import ArticleCard from '../components/cards/ArticleCard';
import ThreadCard from '../components/cards/ThreadCard';
import PhotoGallerySection from '../components/sections/PhotoGallerySection';

import { EXPLORE_CHIPS } from '../data/articles';
import { FORUMS, FORUM_TABS } from '../data/forums';
import { GALLERIES } from '../data/galleryData';
import { fetchBanners } from '../services/api';
import useArticles from '../hooks/useArticles';

const PREVIEW_GALLERIES = GALLERIES.slice(0, 4);

export default function ExploreScreen({ onArticlePress, onGalleryPress, onGalleriesOpen, onStoryPress }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeForumTab, setActiveForumTab] = useState('announcements');

  const [banners, setBanners] = useState([]);

  useEffect(() => {
    fetchBanners().then(setBanners).catch(() => {});
  }, []);

  const { articles, loading, error, refresh } = useArticles();

  // Filter articles by category chip
  const filteredArticles = useMemo(() => {
    if (activeCategory === 'all') return articles;
    return articles.filter(
      a => a.cat.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [articles, activeCategory]);

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

        {/* Error state */}
        {error && (
          <div className={styles.errorWrap}>
            <div className={styles.errorIcon}>!</div>
            <div className={styles.errorText}>{error}</div>
            <button className={styles.retryBtn} onClick={refresh}>Retry</button>
          </div>
        )}

        {/* Articles list */}
        {!loading && !error && filteredArticles.length === 0 && (
          <div className={styles.emptyText}>No articles found in this category</div>
        )}

        {filteredArticles.map((a, i) => (
          <ArticleCard key={a.id} {...a} delay={i * 0.06} onClick={() => onArticlePress && onArticlePress(a)} />
        ))}
      </div>

      {/* Galleries strip */}
      <PhotoGallerySection
        galleries={PREVIEW_GALLERIES}
        onSeeAll={onGalleriesOpen}
        onGalleryPress={onGalleryPress}
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
