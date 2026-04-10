import { useState, useMemo } from 'react';
import styles from './ForumListView.module.css';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import useForumHome from '../../hooks/useForumHome';
import { formatCount } from './forumHelpers';

export default function ForumListView({ onForumPress }) {
  const [activeCat, setActiveCat] = useState('all');
  const [activeSubCat, setActiveSubCat] = useState('all');
  const [search, setSearch] = useState('');

  const apiCategoryId = useMemo(() => {
    if (activeSubCat !== 'all') return Number(activeSubCat);
    if (activeCat !== 'all')    return Number(activeCat);
    return null;
  }, [activeCat, activeSubCat]);

  const {
    categories, subCatMap, forums, totalCount,
    loading: homeLoading, loadingMore: forumsLoadingMore,
    error: homeError, hasMore: forumsHasMore,
    loadMore: loadMoreForums, refresh: refreshHome,
  } = useForumHome(apiCategoryId);

  const catTabs = useMemo(() => {
    const tabs = [{ id: 'all', label: 'All' }];
    categories.forEach(c => tabs.push({ id: String(c.id), label: c.name, catObj: c }));
    return tabs;
  }, [categories]);

  const subCats = useMemo(() => {
    if (activeCat === 'all') return [];
    const subs = subCatMap[Number(activeCat)] || [];
    return [{ id: 'all', label: 'All' }, ...subs.map(s => ({ id: String(s.id), label: s.name }))];
  }, [activeCat, subCatMap]);

  const displayForums = useMemo(() => {
    if (!search.trim()) return forums;
    const q = search.toLowerCase();
    return forums.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }, [forums, search]);

  function selectCat(id) {
    setActiveCat(id);
    setActiveSubCat('all');
  }

  function selectSubCat(id) {
    setActiveSubCat(id);
  }

  return (
    <>
      {/* Search */}
      <div className={styles.searchWrap}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="var(--text3)" strokeWidth="1.4"/>
          <path d="M10.5 10.5l3 3" stroke="var(--text3)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input className={styles.searchInput} placeholder="Search forums..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearBtn} onClick={() => setSearch('')}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Category tabs from API */}
      <div className={styles.catScroll}>
        {catTabs.map(({ id, label }) => (
          <div key={id}
            className={`${styles.catTab} ${activeCat === id ? styles.catTabActive : ''}`}
            onClick={() => selectCat(id)}
          >{label}</div>
        ))}
      </div>

      {/* Sub-category chips */}
      {subCats.length > 0 && (
        <div className={styles.subCatScroll}>
          {subCats.map(({ id, label }) => (
            <div key={id}
              className={`${styles.subCat} ${activeSubCat === id ? styles.subCatActive : ''}`}
              onClick={() => selectSubCat(id)}
            >{label}</div>
          ))}
        </div>
      )}

      {/* Count */}
      {!homeLoading && (
        <div className={styles.countRow}>
          <span className={styles.countText}>
            {totalCount} Forum{totalCount !== 1 ? 's' : ''}
            {activeCat !== 'all' && ` in ${catTabs.find(t => t.id === activeCat)?.label || ''}`}
            {activeSubCat !== 'all' && ` > ${subCats.find(s => s.id === activeSubCat)?.label || ''}`}
          </span>
          {search.trim() && <span className={styles.searchTag}>filtered</span>}
        </div>
      )}

      {/* Loading skeleton */}
      {homeLoading && (
        <div className={styles.forumList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonForum}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {homeError && !homeLoading && (
        <ErrorState message={homeError} onRetry={refreshHome} />
      )}

      {/* Forum list */}
      {!homeLoading && !homeError && (
        <div className={styles.forumList}>
          {displayForums.length === 0 ? (
            <EmptyState icon="🔍" title="No forums found" subtitle="Try a different search or category" />
          ) : displayForums.map((forum, i) => (
            <div key={forum.id} className={styles.forumCard}
              style={{ animationDelay: `${Math.min(i * 0.04, 0.28)}s` }}
              onClick={() => onForumPress(forum)}
              role="button" tabIndex={0}
            >
              <div className={styles.forumAvatar} style={{ background: forum.bg }}>
                {forum.thumbnailUrl
                  ? <img src={forum.thumbnailUrl} alt="" className={styles.forumAvatarImg} loading="lazy" decoding="async" />
                  : forum.emoji
                }
              </div>
              <div className={styles.forumBody}>
                <div className={styles.forumNameRow}>
                  <span className={styles.forumName}>{forum.name}</span>
                  {forum.hot && <span className={styles.hotBadge}>🔥</span>}
                </div>
                <div className={styles.forumDesc}>{forum.description}</div>
              </div>
              <div className={styles.forumStats}>
                <div className={styles.statCol}>
                  <span className={styles.statRank}>{forum.rankDisplay || '#' + (forum.rank || '–')}</span>
                  <span className={styles.statLabel}>Rank</span>
                </div>
                <div className={styles.statDividerV}/>
                <div className={styles.statCol}>
                  <span className={styles.statNum}>{formatCount(forum.topicCount)}</span>
                  <span className={styles.statLabel}>Topics</span>
                </div>
                <div className={styles.statDividerV}/>
                <div className={styles.statCol}>
                  <span className={styles.statNum}>{formatCount(forum.followCount)}</span>
                  <span className={styles.statLabel}>Flwrs</span>
                </div>
              </div>
            </div>
          ))}

          {/* Load more skeleton */}
          {forumsLoadingMore && Array.from({ length: 3 }).map((_, i) => (
            <div key={`flm-${i}`} className={styles.skeletonForum}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Forums */}
      {forumsHasMore && !forumsLoadingMore && !homeLoading && !search.trim() && (
        <button className={styles.loadMore} onClick={loadMoreForums}>
          Load More Forums
        </button>
      )}
    </>
  );
}
