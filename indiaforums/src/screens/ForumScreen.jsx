import { useState, useMemo, useRef, useEffect } from 'react';
import styles from './ForumScreen.module.css';
import ThreadCard from '../components/cards/ThreadCard';
import useForumHome from '../hooks/useForumHome';
import useForumTopics from '../hooks/useForumTopics';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: 'forums',     label: 'Forums' },
  { id: 'all-topics', label: 'All Topics' },
];

const THREAD_TABS = [
  { id: 'latest',  label: 'Latest' },
  { id: 'popular', label: 'Popular' },
  { id: 'hot',     label: 'Hot' },
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
  const [activeThreadTab, setActiveThreadTab] = useState('latest');

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
    topics, forumDetail,
    loading: topicsLoading, loadingMore: topicsLoadingMore,
    error: topicsError, hasMore: topicsHasMore,
    loadMore: loadMoreTopics, refresh: refreshTopics,
  } = useForumTopics(selectedForum?.id || null);

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
    setActiveThreadTab('latest');
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
    return topics.map(t => ({
      ...t,
      forumName:  t.forumName || selectedForum?.name || '',
      forumBg:    selectedForum?.bg || 'linear-gradient(135deg,#1e3a5e,#2563eb)',
      forumEmoji: selectedForum?.emoji || '💬',
      ago:        t.time,
      comments:   t.replies,
    }));
  }, [topics, selectedForum]);

  // ── Thread drill-down ─────────────────────────────────────────────────────
  if (view === 'threads' && selectedForum) {
    const detail = forumDetail || selectedForum;
    return (
      <div className={`${styles.screen} ${styles.slideIn}`} ref={scrollRef}>

        {/* Forum identity */}
        <div className={styles.forumIdentity}>
          <div className={styles.forumIdentityAvatar} style={{ background: detail.bg }}>
            {detail.emoji}
          </div>
          <div className={styles.forumIdentityName}>{detail.name}</div>
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
            <span className={styles.forumStatNum}>{formatCount(detail.followCount ?? 0)}</span>
            <span className={styles.forumStatLabel}>Followers</span>
          </div>
          <div className={styles.statDivider}/>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>#{detail.rank || '–'}</span>
            <span className={styles.forumStatLabel}>Ranked</span>
          </div>
        </div>

        {/* Thread sort tabs */}
        <div className={styles.threadTabs}>
          {THREAD_TABS.map(({ id, label }) => (
            <div key={id}
              className={`${styles.threadTab} ${activeThreadTab === id ? styles.threadTabActive : ''}`}
              onClick={() => setActiveThreadTab(id)}
            >{label}</div>
          ))}
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
                  emoji={detail.emoji}
                  title={t.title}
                  poster={t.poster}
                  ago={t.time}
                  likes={formatCount(t.likes)}
                  comments={formatCount(t.replies)}
                  views={formatCount(t.views)}
                  lastBy={t.lastBy}
                  lastTime={t.lastTime}
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
          TAB: ALL TOPICS (Browse all forums, pick one)
      ════════════════════════════════════════════ */}
      {topTab === 'all-topics' && (
        <>
          <div className={styles.allTopicsIntro}>
            <div className={styles.allTopicsLabel}>Browse Forums</div>
            <div className={styles.allTopicsSub}>Tap a forum to view its topics</div>
          </div>

          {homeLoading && (
            <div className={styles.forumList}>
              {Array.from({ length: 4 }).map((_, i) => (
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

          {!homeLoading && (
            <div className={styles.forumList}>
              {forums
                .filter(f => f.topicCount > 0)
                .sort((a, b) => b.topicCount - a.topicCount)
                .slice(0, 30)
                .map((forum, i) => (
                <div key={forum.id} className={styles.forumCard}
                  style={{ animationDelay: `${i * 0.03}s` }}
                  onClick={() => openForum(forum)}
                  role="button" tabIndex={0}
                >
                  <div className={styles.forumAvatar} style={{ background: forum.bg }}>
                    {forum.emoji}
                  </div>
                  <div className={styles.forumBody}>
                    <div className={styles.forumNameRow}>
                      <span className={styles.forumName}>{forum.name}</span>
                    </div>
                    <div className={styles.forumDesc}>
                      {formatCount(forum.topicCount)} topics · {formatCount(forum.postCount)} posts
                    </div>
                  </div>
                  <div className={styles.forumStats}>
                    <div className={styles.statCol}>
                      <span className={styles.statNum}>{formatCount(forum.topicCount)}</span>
                      <span className={styles.statLabel}>Topics</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className={styles.spacer}/>
    </div>
  );
}
