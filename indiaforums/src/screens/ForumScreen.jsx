import { useState, useMemo, useRef, useEffect } from 'react';
import styles from './ForumScreen.module.css';
import ThreadCard from '../components/cards/ThreadCard';
import useForumHome from '../hooks/useForumHome';
import useForumTopics from '../hooks/useForumTopics';
import useAllForumTopics from '../hooks/useAllForumTopics';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: 'forums',     label: 'Forums' },
  { id: 'all-topics', label: 'All Topics' },
];


function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForumScreen({ onTopicPress, onForumDrill, drilledForum }) {
  const [topTab, setTopTab] = useState('forums');

  // Forums tab state
  const [view, setView]                       = useState('list');
  const [selectedForum, setSelectedForum]     = useState(null);
  const [activeCat, setActiveCat]             = useState('all');
  const [activeSubCat, setActiveSubCat]       = useState('all');
  const [search, setSearch]                   = useState('');
  const [activeFlairId, setActiveFlairId]     = useState(null); // null = "All"
  const [flairDropdownOpen, setFlairDropdownOpen] = useState(false);

  // All Topics tab state
  const [allTopicsSort, setAllTopicsSort]       = useState('latest'); // 'latest' | 'popular'
  const [allTopicsSortOpen, setAllTopicsSortOpen] = useState(false);
  const [allTopicsView, setAllTopicsView]       = useState('detailed'); // 'detailed' | 'compact'

  const scrollRef = useRef(null);

  // Sync back when App-level back button clears drilledForum
  useEffect(() => {
    if (!drilledForum && view === 'threads') {
      setView('list');
      setSelectedForum(null);
      scrollTop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drilledForum]);

  // ── Resolve the categoryId to send to the API ─────────────────────────────
  const apiCategoryId = useMemo(() => {
    if (activeSubCat !== 'all') return Number(activeSubCat);
    if (activeCat !== 'all')    return Number(activeCat);
    return null;
  }, [activeCat, activeSubCat]);

  // ── Live API data (server-filtered by category) ───────────────────────────
  const {
    categories, subCatMap, forums, totalCount,
    loading: homeLoading, loadingMore: forumsLoadingMore,
    error: homeError, hasMore: forumsHasMore,
    loadMore: loadMoreForums, refresh: refreshHome,
  } = useForumHome(apiCategoryId);

  // Forum topics — only fetched when a forum is selected
  const {
    topics, forumDetail, flairs,
    loading: topicsLoading, loadingMore: topicsLoadingMore,
    error: topicsError, hasMore: topicsHasMore,
    loadMore: loadMoreTopics, refresh: refreshTopics,
  } = useForumTopics(selectedForum?.id || null);

  // All Topics feed — cross-forum topic listing
  const {
    topics: allTopics, totalCount: allTopicsTotal,
    loading: allTopicsLoading, loadingMore: allTopicsLoadingMore,
    error: allTopicsError, hasMore: allTopicsHasMore,
    loadMore: loadMoreAllTopics, refresh: refreshAllTopics,
  } = useAllForumTopics();

  // ── Helpers ────────────────────────────────────────────────────────────────
  function scrollTop() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function switchTopTab(id) {
    setTopTab(id);
    setView('list');
    setSelectedForum(null);
    scrollTop();
  }

  function selectCat(id) {
    setActiveCat(id);
    setActiveSubCat('all');
    scrollTop();
  }

  function selectSubCat(id) {
    setActiveSubCat(id);
    scrollTop();
  }

  function openForum(forum) {
    setSelectedForum(forum);
    setActiveFlairId(null);
    setFlairDropdownOpen(false);
    setView('threads');
    onForumDrill?.(forum);
    scrollTop();
  }

  // ── Derived data ───────────────────────────────────────────────────────────
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

  // Client-side search filter (server doesn't support search)
  const displayForums = useMemo(() => {
    if (!search.trim()) return forums;
    const q = search.toLowerCase();
    return forums.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }, [forums, search]);

  const topicCards = useMemo(() => {
    const mapped = topics.map(t => ({
      ...t,
      forumName:  t.forumName || selectedForum?.name || '',
      forumBg:    selectedForum?.bg || 'linear-gradient(135deg,#1e3a5e,#2563eb)',
      forumEmoji: selectedForum?.emoji || '💬',
      ago:        t.time,
      comments:   t.replies,
    }));
    if (activeFlairId == null) return mapped;
    return mapped.filter(t => t.flairId === activeFlairId);
  }, [topics, selectedForum, activeFlairId]);

  // Active flair label for the dropdown trigger
  const activeFlairLabel = useMemo(() => {
    if (activeFlairId == null) return 'All';
    return flairs.find(f => f.id === activeFlairId)?.name || 'All';
  }, [activeFlairId, flairs]);

  // Sorted all-topics list
  const sortedAllTopics = useMemo(() => {
    if (allTopicsSort === 'popular') {
      return [...allTopics].sort((a, b) => b.views - a.views);
    }
    return allTopics; // API default is latest
  }, [allTopics, allTopicsSort]);

  // ── Thread drill-down ─────────────────────────────────────────────────────
  if (view === 'threads' && selectedForum) {
    const detail = forumDetail || selectedForum;
    return (
      <div className={`${styles.screen} ${styles.slideIn}`} ref={scrollRef}>

        {/* Forum banner */}
        {detail.bannerUrl && (
          <div className={styles.forumBanner}>
            <img src={detail.bannerUrl} alt="" className={styles.forumBannerImg} />
          </div>
        )}

        {/* Forum identity */}
        <div className={styles.forumIdentity}>
          <div className={styles.forumIdentityAvatar} style={{ background: detail.bg }}>
            {detail.thumbnailUrl
              ? <img src={detail.thumbnailUrl} alt="" className={styles.forumAvatarImg} />
              : detail.emoji
            }
          </div>
          <div className={styles.forumIdentityInfo}>
            <div className={styles.forumIdentityName}>{detail.name}</div>
            {detail.description && (
              <div className={styles.forumIdentityDesc}>{detail.description}</div>
            )}
          </div>
          <button className={styles.followBtn}>Follow</button>
        </div>

        {/* Forum stats bar */}
        <div className={styles.forumStatBar}>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>{formatCount(detail.topicCount)}</span>
            <span className={styles.forumStatLabel}>Topics</span>
          </div>
          <div className={styles.statDivider}/>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>{formatCount(detail.postCount ?? 0)}</span>
            <span className={styles.forumStatLabel}>Posts</span>
          </div>
          <div className={styles.statDivider}/>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>{formatCount(detail.followCount ?? 0)}</span>
            <span className={styles.forumStatLabel}>Followers</span>
          </div>
          <div className={styles.statDivider}/>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>#{detail.rank || '–'}</span>
            <span className={styles.forumStatLabel}>Ranked</span>
          </div>
        </div>

        {/* Flair filter bar */}
        <div className={styles.flairBar}>
          {/* Left: flair dropdown (only if flairs exist) */}
          {flairs.length > 0 && (
            <div className={styles.flairFilterWrap}>
              <button
                className={`${styles.flairTrigger} ${flairDropdownOpen ? styles.flairTriggerOpen : ''}`}
                onClick={() => setFlairDropdownOpen(o => !o)}
              >
                {activeFlairId != null ? (
                  <span
                    className={styles.flairDot}
                    style={{ background: flairs.find(f => f.id === activeFlairId)?.bgColor }}
                  />
                ) : (
                  <span className={styles.flairAllDot} />
                )}
                <span className={styles.flairTriggerLabel}>{activeFlairLabel}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
                  className={`${styles.flairChevron} ${flairDropdownOpen ? styles.flairChevronOpen : ''}`}
                >
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {flairDropdownOpen && (
                <>
                  <div className={styles.flairBackdrop} onClick={() => setFlairDropdownOpen(false)} />
                  <div className={styles.flairDropdown}>
                    <div
                      className={`${styles.flairOption} ${activeFlairId == null ? styles.flairOptionActive : ''}`}
                      onClick={() => { setActiveFlairId(null); setFlairDropdownOpen(false); }}
                    >
                      <span className={styles.flairAllDot} />
                      <span className={styles.flairOptionName}>All</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.flairCheck}>
                        <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className={styles.flairSeparator} />
                    {flairs.map(f => (
                      <div
                        key={f.id}
                        className={`${styles.flairOption} ${activeFlairId === f.id ? styles.flairOptionActive : ''}`}
                        onClick={() => { setActiveFlairId(f.id); setFlairDropdownOpen(false); }}
                      >
                        <span className={styles.flairDot} style={{ background: f.bgColor }} />
                        <span className={styles.flairOptionName}>{f.name}</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.flairCheck}>
                          <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Right: topic count + new topic */}
          <div className={styles.flairBarRight}>
            {!topicsLoading && (
              <span className={styles.flairTopicCount}>
                {topicCards.length} topic{topicCards.length !== 1 ? 's' : ''}
              </span>
            )}
            <button className={styles.newTopicBtn}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              New
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {topicsLoading && (
          <div className={styles.threadList}>
            {Array.from({ length: 5 }).map((_, i) => (
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
        {topicsError && !topicsLoading && (
          <div className={styles.errorBox}>
            <span className={styles.errorText}>{topicsError}</span>
            <button className={styles.retryBtn} onClick={refreshTopics}>Retry</button>
          </div>
        )}

        {/* Topics list */}
        {!topicsLoading && !topicsError && (
          <div className={styles.threadList}>
            {topicCards.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📭</div>
                <div className={styles.emptyText}>No topics yet</div>
                <div className={styles.emptySub}>Be the first to start a discussion!</div>
              </div>
            ) : topicCards.map((t, i) => (
              <div key={t.id} onClick={() => onTopicPress?.({ ...t, forumBg: detail.bg, forumEmoji: detail.emoji })}>
                <ThreadCard
                  forumName={detail.name}
                  bg={detail.bg}
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
                  delay={i * 0.04}
                />
              </div>
            ))}

            {topicsLoadingMore && Array.from({ length: 3 }).map((_, i) => (
              <div key={`lm-${i}`} className={styles.skeletonThread}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {topicsHasMore && !topicsLoadingMore && !topicsLoading && (
          <button className={styles.loadMore} onClick={loadMoreTopics}>
            Load More Topics
          </button>
        )}

        <div className={styles.spacer}/>
      </div>
    );
  }

  // ── Main screen ────────────────────────────────────────────────────────────
  return (
    <div className={styles.screen} ref={scrollRef}>

      {/* Top navigation tabs */}
      <div className={styles.topTabBar}>
        {TOP_TABS.map(({ id, label }) => (
          <div key={id}
            className={`${styles.topTab} ${topTab === id ? styles.topTabActive : ''}`}
            onClick={() => switchTopTab(id)}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          TAB: FORUMS
      ════════════════════════════════════════════ */}
      {topTab === 'forums' && (
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
            <div className={styles.errorBox}>
              <span className={styles.errorText}>{homeError}</span>
              <button className={styles.retryBtn} onClick={refreshHome}>Retry</button>
            </div>
          )}

          {/* Forum list */}
          {!homeLoading && !homeError && (
            <div className={styles.forumList}>
              {displayForums.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>🔍</div>
                  <div className={styles.emptyText}>No forums found</div>
                  <div className={styles.emptySub}>Try a different search or category</div>
                </div>
              ) : displayForums.map((forum, i) => (
                <div key={forum.id} className={styles.forumCard}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => openForum(forum)}
                  role="button" tabIndex={0}
                >
                  <div className={styles.forumAvatar} style={{ background: forum.bg }}>
                    {forum.thumbnailUrl
                      ? <img src={forum.thumbnailUrl} alt="" className={styles.forumAvatarImg} />
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
      )}

      {/* ════════════════════════════════════════════
          TAB: ALL TOPICS — live cross-forum topic feed
      ════════════════════════════════════════════ */}
      {topTab === 'all-topics' && (
        <>
          {/* ── Sort & view bar ──────────────────────────────────────────── */}
          <div className={styles.topicSortBar}>
            {/* Left: sort dropdown */}
            <div className={styles.topicSortWrap}>
              <button
                className={`${styles.topicSortTrigger} ${allTopicsSortOpen ? styles.topicSortTriggerOpen : ''}`}
                onClick={() => setAllTopicsSortOpen(o => !o)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>{allTopicsSort === 'latest' ? 'Latest' : 'Popular'}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
                  className={`${styles.topicSortChevron} ${allTopicsSortOpen ? styles.topicSortChevronOpen : ''}`}
                >
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {allTopicsSortOpen && (
                <>
                  <div className={styles.flairBackdrop} onClick={() => setAllTopicsSortOpen(false)} />
                  <div className={styles.topicSortDropdown}>
                    <div
                      className={`${styles.topicSortOption} ${allTopicsSort === 'latest' ? styles.topicSortOptionActive : ''}`}
                      onClick={() => { setAllTopicsSort('latest'); setAllTopicsSortOpen(false); }}
                    >
                      <span>Latest</span>
                      {allTopicsSort === 'latest' && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </div>
                    <div
                      className={`${styles.topicSortOption} ${allTopicsSort === 'popular' ? styles.topicSortOptionActive : ''}`}
                      onClick={() => { setAllTopicsSort('popular'); setAllTopicsSortOpen(false); }}
                    >
                      <span>Popular</span>
                      {allTopicsSort === 'popular' && (
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
                className={`${styles.viewToggle} ${allTopicsView === 'detailed' ? styles.viewToggleActive : ''}`}
                onClick={() => setAllTopicsView('detailed')}
                title="Detailed view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1" y="1" width="14" height="4" rx="1"/>
                  <rect x="1" y="7" width="14" height="4" rx="1"/>
                  <line x1="1" y1="14" x2="15" y2="14"/>
                </svg>
              </button>
              <button
                className={`${styles.viewToggle} ${allTopicsView === 'compact' ? styles.viewToggleActive : ''}`}
                onClick={() => setAllTopicsView('compact')}
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
            <div className={styles.errorBox}>
              <span className={styles.errorText}>{allTopicsError}</span>
              <button className={styles.retryBtn} onClick={refreshAllTopics}>Retry</button>
            </div>
          )}

          {/* Topic feed */}
          {!allTopicsLoading && !allTopicsError && (
            <div className={styles.threadList}>
              {sortedAllTopics.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>📭</div>
                  <div className={styles.emptyText}>No topics yet</div>
                </div>
              ) : sortedAllTopics.map((t, i) => (
                <div key={t.id} onClick={() => onTopicPress?.({
                  ...t,
                  forumBg: 'linear-gradient(135deg,#1e3a5e,#2563eb)',
                  forumEmoji: '💬',
                })}>
                  {allTopicsView === 'compact' ? (
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
      )}

      <div className={styles.spacer}/>
    </div>
  );
}
