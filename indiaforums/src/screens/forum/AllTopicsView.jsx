import { useState, useMemo } from 'react';
import styles from './AllTopicsView.module.css';
import ThreadCard from '../../components/cards/ThreadCard';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { formatCount } from './forumHelpers';

export default function AllTopicsView({
  allTopics, allTopicsTotal,
  allTopicsLoading, allTopicsLoadingMore,
  allTopicsError, allTopicsHasMore,
  loadMoreAllTopics, refreshAllTopics,
  onTopicPress,
}) {
  const [sortMode, setSortMode] = useState('latest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState('detailed');

  const sortedAllTopics = useMemo(() => {
    if (sortMode === 'popular') {
      return [...allTopics].sort((a, b) => b.views - a.views);
    }
    return allTopics;
  }, [allTopics, sortMode]);

  return (
    <>
      {/* ── Sort & view bar ──────────────────────────────────────────── */}
      <div className={styles.topicSortBar}>
        {/* Left: sort dropdown */}
        <div className={styles.topicSortWrap}>
          <button
            className={`${styles.topicSortTrigger} ${sortDropdownOpen ? styles.topicSortTriggerOpen : ''}`}
            onClick={() => setSortDropdownOpen(o => !o)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{sortMode === 'latest' ? 'Latest' : 'Popular'}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
              className={`${styles.topicSortChevron} ${sortDropdownOpen ? styles.topicSortChevronOpen : ''}`}
            >
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {sortDropdownOpen && (
            <>
              <div className={styles.backdrop} onClick={() => setSortDropdownOpen(false)} />
              <div className={styles.topicSortDropdown}>
                <div
                  className={`${styles.topicSortOption} ${sortMode === 'latest' ? styles.topicSortOptionActive : ''}`}
                  onClick={() => { setSortMode('latest'); setSortDropdownOpen(false); }}
                >
                  <span>Latest</span>
                  {sortMode === 'latest' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                <div
                  className={`${styles.topicSortOption} ${sortMode === 'popular' ? styles.topicSortOptionActive : ''}`}
                  onClick={() => { setSortMode('popular'); setSortDropdownOpen(false); }}
                >
                  <span>Popular</span>
                  {sortMode === 'popular' && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: view toggles + count */}
        <div className={styles.topicSortRight}>
          {!allTopicsLoading && (
            <span className={styles.topicSortCount}>
              {formatCount(allTopicsTotal)}
            </span>
          )}
          <button
            className={`${styles.viewToggle} ${viewMode === 'detailed' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('detailed')}
            title="Detailed view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="1" width="14" height="4" rx="1"/>
              <rect x="1" y="7" width="14" height="4" rx="1"/>
              <line x1="1" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          <button
            className={`${styles.viewToggle} ${viewMode === 'compact' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('compact')}
            title="Compact view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="2.5" x2="15" y2="2.5"/>
              <line x1="1" y1="6.5" x2="15" y2="6.5"/>
              <line x1="1" y1="10.5" x2="15" y2="10.5"/>
              <line x1="1" y1="14.5" x2="15" y2="14.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {allTopicsLoading && (
        <div className={styles.threadList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonThread}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineTiny}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {allTopicsError && !allTopicsLoading && (
        <ErrorState message={allTopicsError} onRetry={refreshAllTopics} />
      )}

      {/* Topic feed */}
      {!allTopicsLoading && !allTopicsError && (
        <div className={styles.threadList}>
          {sortedAllTopics.length === 0 ? (
            <EmptyState icon="📭" title="No topics yet" />
          ) : sortedAllTopics.map((t, i) => (
            <div key={t.id} onClick={() => onTopicPress?.({
              ...t,
              forumBg: 'linear-gradient(135deg,#1e3a5e,#2563eb)',
              forumEmoji: '💬',
            })}>
              {viewMode === 'compact' ? (
                <div className={styles.compactTopic}>
                  <div className={styles.compactBody}>
                    <span className={styles.compactForum}>{t.forumName}</span>
                    <div className={styles.compactTitle}>{t.title}</div>
                    <div className={styles.compactMeta}>
                      <span>{t.poster}</span>
                      <span className={styles.compactDot}/>
                      <span>{t.time}</span>
                      <span className={styles.compactDot}/>
                      <span>{formatCount(t.replies)} replies</span>
                    </div>
                  </div>
                  <div className={styles.compactViews}>{formatCount(t.views)}</div>
                </div>
              ) : (
                <ThreadCard
                  forumName={t.forumName}
                  bg="linear-gradient(135deg,#1e3a5e,#2563eb)"
                  title={t.title}
                  description={t.description}
                  poster={t.poster}
                  ago={t.time}
                  likes={formatCount(t.likes)}
                  comments={formatCount(t.replies)}
                  views={formatCount(t.views)}
                  lastBy={t.lastBy}
                  lastTime={t.lastTime}
                  locked={t.locked}
                  pinned={t.pinned}
                  tags={t.tags}
                  topicImage={t.topicImage}
                  delay={i * 0.03}
                />
              )}
            </div>
          ))}

          {/* Load more skeleton */}
          {allTopicsLoadingMore && Array.from({ length: 3 }).map((_, i) => (
            <div key={`atlm-${i}`} className={styles.skeletonThread}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {allTopicsHasMore && !allTopicsLoadingMore && !allTopicsLoading && (
        <button className={styles.loadMore} onClick={loadMoreAllTopics}>
          Load More Topics
        </button>
      )}
    </>
  );
}
