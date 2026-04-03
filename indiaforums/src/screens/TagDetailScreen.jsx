import { useState, useMemo, useRef } from 'react';
import styles from './TagDetailScreen.module.css';
import useTagContent from '../hooks/useTagContent';

// Content type labels
const CT_LABELS = {
  3: 'Channel', 4: 'Show', 5: 'Celebrity', 6: 'Media',
  7: 'Article', 8: 'Gallery', 9: 'Forum', 13: 'Topic',
  23: 'Movie', 24: 'Show', 26: 'Video',
};

// Category display names from defaultCategoryId
const CAT_NAMES = {
  5: 'TV · Hindi', 6: 'TV · English', 7: 'Movies · Hindi', 8: 'Movies · English',
  3: 'Digital', 9: 'Digital · Hindi', 10: 'Digital · English',
  4: 'Lifestyle', 11: 'Fashion', 12: 'Health', 13: 'Makeup',
  14: 'Sports', 15: 'Cricket', 16: 'Movies · Tamil',
  17: 'Movies · Telugu', 18: 'Movies · Kannada', 19: 'Digital · Korean',
  20: 'Food', 21: 'Football',
};

const TABS = [
  { id: 'articles', label: 'News',   icon: '📰' },
  { id: 'videos',   label: 'Videos', icon: '🎬' },
  { id: 'galleries', label: 'Photos', icon: '📸' },
];

export default function TagDetailScreen({ tag, onBack, onArticlePress, onVideoPress, onGalleryPress }) {
  const [activeTab, setActiveTab] = useState('articles');
  const [following, setFollowing] = useState(false);
  const scrollRef = useRef(null);

  const { articles, videos, galleries, loading, error, loadMoreArticles, hasMoreArticles, loadingMore } =
    useTagContent(tag.ct, tag.id);

  const visibleTabs = useMemo(() => {
    if (loading) return TABS;
    return TABS.filter(t => {
      if (t.id === 'articles')  return articles.length > 0;
      if (t.id === 'videos')    return videos.length > 0;
      if (t.id === 'galleries') return galleries.length > 0;
      return false;
    });
  }, [loading, articles, videos, galleries]);

  // Auto-select first available tab
  useMemo(() => {
    if (!loading && visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [loading, visibleTabs, activeTab]);

  const typeLabel = CT_LABELS[tag.ct] || '';
  const totalCount = articles.length + videos.length + galleries.length;
  const featuredArticle = articles[0];
  const restArticles = articles.slice(1);

  function handleScroll(e) {
    const el = e.target;
    if (activeTab === 'articles' && hasMoreArticles && !loadingMore) {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
        loadMoreArticles();
      }
    }
  }

  function getTabCount(tabId) {
    if (tabId === 'articles') return articles.length;
    if (tabId === 'videos') return videos.length;
    return galleries.length;
  }

  return (
    <div className={styles.screen}>

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <div className={styles.heroIcon}>
              {tag.ct === 4 || tag.ct === 24 ? '📺' :
               tag.ct === 5  ? '👤' :
               tag.ct === 3  ? '📡' :
               tag.ct === 23 ? '🎬' : '🏷️'}
            </div>
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{tag.name}</h1>
            <div className={styles.heroMeta}>
              {typeLabel && <span className={styles.typeBadge}>{typeLabel}</span>}
              {!loading && totalCount > 0 && (
                <span className={styles.contentCount}>{totalCount} items</span>
              )}
            </div>
          </div>
          <button
            className={`${styles.followBtn} ${following ? styles.followBtnActive : ''}`}
            onClick={() => setFollowing(f => !f)}
          >
            {following ? '✓ Following' : '+ Follow'}
          </button>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className={styles.tabBar}>
        {visibleTabs.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab(t.id); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}
          >
            <span className={styles.tabLabel}>{t.label}</span>
            {!loading && (
              <span className={styles.tabBadge}>{getTabCount(t.id)}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <div className={styles.scroll} ref={scrollRef} onScroll={handleScroll}>

        {/* Loading */}
        {loading && (
          <div className={styles.loadState}>
            <div className={styles.spinner} />
            <span className={styles.loadText}>Loading content...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className={styles.loadState}>
            <div className={styles.errorIcon}>!</div>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && totalCount === 0 && (
          <div className={styles.loadState}>
            <div className={styles.emptyIcon}>🔍</div>
            <span className={styles.emptyTitle}>No content yet</span>
            <span className={styles.emptyText}>
              We don't have any articles, videos, or photos for "{tag.name}" yet.
            </span>
          </div>
        )}

        {/* ── ARTICLES TAB ───────────────────────────────────────────────── */}
        {!loading && !error && activeTab === 'articles' && articles.length > 0 && (
          <>
            {/* Featured hero card */}
            {featuredArticle && (
              <div className={styles.featCard} onClick={() => onArticlePress?.(featuredArticle)}>
                <div className={styles.featThumbWrap}>
                  {featuredArticle.thumbnail ? (
                    <img src={featuredArticle.thumbnail} alt="" className={styles.featThumb} loading="lazy" />
                  ) : (
                    <div className={styles.featThumbFallback} style={{ background: featuredArticle.bg }}>
                      <span className={styles.featEmoji}>{featuredArticle.emoji}</span>
                    </div>
                  )}
                  <div className={styles.featOverlay} />
                  <div className={styles.featBadges}>
                    {featuredArticle.breaking && <span className={styles.badgeBreaking}>BREAKING</span>}
                    {featuredArticle.tag && !featuredArticle.breaking && (
                      <span className={styles.badgeTag}>{featuredArticle.tag}</span>
                    )}
                  </div>
                </div>
                <div className={styles.featBody}>
                  <div className={styles.featCat}>
                    {CAT_NAMES[featuredArticle.catId] || featuredArticle.cat}
                  </div>
                  <div className={styles.featTitle}>{featuredArticle.title}</div>
                  <div className={styles.featMeta}>
                    <span>{featuredArticle.source || 'IF News Desk'}</span>
                    <span className={styles.dot}>·</span>
                    <span>{featuredArticle.time}</span>
                    {featuredArticle.commentCount > 0 && (
                      <>
                        <span className={styles.dot}>·</span>
                        <span className={styles.commentBadge}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1.5h10a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H3l-2.5 2.5V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                          </svg>
                          {featuredArticle.commentCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Article list */}
            <div className={styles.articleList}>
              {restArticles.map(a => (
                <div key={a.id} className={styles.articleCard} onClick={() => onArticlePress?.(a)}>
                  <div className={styles.articleThumbWrap}>
                    {a.thumbnail ? (
                      <img src={a.thumbnail} alt="" className={styles.articleThumb} loading="lazy" />
                    ) : (
                      <div className={styles.articleThumbFallback} style={{ background: a.bg }}>
                        <span>{a.emoji}</span>
                      </div>
                    )}
                    {a.tag && (
                      <span className={`${styles.articleBadge} ${a.tag === 'Exclusive' ? styles.badgeExclusive : ''}`}>
                        {a.tag}
                      </span>
                    )}
                  </div>
                  <div className={styles.articleBody}>
                    <div className={styles.articleCat}>{CAT_NAMES[a.catId] || a.cat}</div>
                    <div className={styles.articleTitle}>{a.title}</div>
                    <div className={styles.articleMeta}>
                      <span>{a.time}</span>
                      {a.commentCount > 0 && (
                        <span className={styles.commentBadge}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1.5h10a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H3l-2.5 2.5V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                          </svg>
                          {a.commentCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loadingMore && (
              <div className={styles.moreLoader}><div className={styles.spinnerSmall} /></div>
            )}
            {hasMoreArticles && !loadingMore && (
              <button className={styles.loadMoreBtn} onClick={loadMoreArticles}>Load more articles</button>
            )}
          </>
        )}

        {/* ── VIDEOS TAB ─────────────────────────────────────────────────── */}
        {!loading && !error && activeTab === 'videos' && videos.length > 0 && (
          <div className={styles.videoList}>
            {videos.map(v => (
              <div key={v.id} className={styles.videoCard} onClick={() => onVideoPress?.(v)}>
                <div className={styles.videoThumbWrap}>
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" className={styles.videoThumb} loading="lazy" />
                  ) : (
                    <div className={styles.videoThumbFallback} style={{ background: v.bg }}>
                      <span>{v.emoji}</span>
                    </div>
                  )}
                  <div className={styles.playBtn}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M7 4.5l9 5.5-9 5.5V4.5z" fill="#fff"/>
                    </svg>
                  </div>
                  {v.duration && <span className={styles.duration}>{v.duration}</span>}
                </div>
                <div className={styles.videoBody}>
                  <div className={styles.videoTitle}>{v.title}</div>
                  <div className={styles.videoMeta}>
                    {v.views && <span>{v.views} views</span>}
                    {v.timeAgo && <><span className={styles.dot}>·</span><span>{v.timeAgo}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PHOTOS TAB ─────────────────────────────────────────────────── */}
        {!loading && !error && activeTab === 'galleries' && galleries.length > 0 && (
          <div className={styles.galleryGrid}>
            {galleries.map(g => (
              <div key={g.id} className={styles.galleryCard} onClick={() => onGalleryPress?.(g)}>
                <div className={styles.galleryThumbWrap}>
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt="" className={styles.galleryThumb} loading="lazy" />
                  ) : (
                    <div className={styles.galleryThumbFallback} style={{ background: g.bg }}>
                      <span>{g.emoji}</span>
                    </div>
                  )}
                  <div className={styles.galleryOverlay} />
                  <div className={styles.galleryCount}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="1" width="7" height="7" rx="1" stroke="#fff" strokeWidth="1.2"/>
                      <rect x="4" y="4" width="7" height="7" rx="1" stroke="#fff" strokeWidth="1.2"/>
                    </svg>
                    {g.count}
                  </div>
                </div>
                <div className={styles.galleryInfo}>
                  <div className={styles.galleryTitle}>{g.title}</div>
                  <div className={styles.galleryMeta}>
                    {g.views && <span>{g.views} views · </span>}
                    {g.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.endPad} />
      </div>
    </div>
  );
}
