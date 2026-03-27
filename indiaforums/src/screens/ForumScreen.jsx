import { useState, useMemo, useRef } from 'react';
import styles from './ForumScreen.module.css';
import ThreadCard from '../components/cards/ThreadCard';
import TopicCard from '../components/cards/TopicCard';
import {
  FORUM_CATS, FORUM_SUB_CATS, ALL_FORUMS, FORUM_THREADS,
  ALL_TOPICS, MY_POSTS, MY_WATCHED,
} from '../data/forumData';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOP_TABS = [
  { id: 'forums',     label: 'Forums' },
  { id: 'all-topics', label: 'All Topics' },
  { id: 'my-posts',   label: 'My Posts' },
  { id: 'my-watched', label: 'My Watched' },
];

const SORT_TABS = [
  { id: 'latest',  label: 'Latest' },
  { id: 'popular', label: 'Popular' },
  { id: 'hot',     label: 'Hot 🔥' },
];

const THREAD_TABS = [
  { id: 'latest',  label: 'Latest' },
  { id: 'popular', label: 'Popular' },
  { id: 'hot',     label: 'Hot 🔥' },
];

const PAGE_SIZE = 12;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForumScreen() {
  // Top-level tab
  const [topTab,   setTopTab]   = useState('forums');

  // Forums tab state
  const [view,           setView]           = useState('list'); // 'list' | 'threads'
  const [selectedForum,  setSelectedForum]  = useState(null);
  const [activeCat,      setActiveCat]      = useState('all');
  const [activeSubCat,   setActiveSubCat]   = useState('all');
  const [search,         setSearch]         = useState('');
  const [visibleCount,   setVisibleCount]   = useState(PAGE_SIZE);
  const [activeThreadTab,setActiveThreadTab]= useState('latest');

  // All Topics / My Posts / My Watched sort
  const [sort, setSort] = useState('latest');

  const scrollRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function scrollTop() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function switchTopTab(id) {
    setTopTab(id);
    setView('list');
    setSelectedForum(null);
    setSort('latest');
    scrollTop();
  }

  function selectCat(id) {
    setActiveCat(id);
    setActiveSubCat('all');
    setVisibleCount(PAGE_SIZE);
    scrollTop();
  }

  function openForum(forum) {
    setSelectedForum(forum);
    setActiveThreadTab('latest');
    setView('threads');
    scrollTop();
  }

  function goBack() {
    setView('list');
    setSelectedForum(null);
    scrollTop();
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const subCats = activeCat !== 'all' ? (FORUM_SUB_CATS[activeCat] || []) : [];

  const filteredForums = useMemo(() => {
    let list = ALL_FORUMS;
    if (activeCat !== 'all')    list = list.filter(f => f.category === activeCat);
    if (activeSubCat !== 'all') list = list.filter(f => f.subcategory === activeSubCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.rank - b.rank);
  }, [activeCat, activeSubCat, search]);

  const visibleForums = filteredForums.slice(0, visibleCount);
  const hasMore       = visibleCount < filteredForums.length;

  const threads = selectedForum
    ? (FORUM_THREADS[selectedForum.id] || FORUM_THREADS._default)
    : [];

  // Sort topics for All Topics feed
  const sortedTopics = useMemo(() => {
    const list = [...ALL_TOPICS];
    if (sort === 'popular') return list.sort((a, b) => b.views   - a.views);
    if (sort === 'hot')     return list.filter(t => t.isHot);
    return list; // latest = default order
  }, [sort]);

  const sortedMyPosts = useMemo(() => {
    const list = [...MY_POSTS];
    if (sort === 'popular') return list.sort((a, b) => b.views - a.views);
    return list;
  }, [sort]);

  const sortedWatched = useMemo(() => {
    const list = [...MY_WATCHED];
    if (sort === 'popular') return list.sort((a, b) => b.views - a.views);
    return list;
  }, [sort]);

  // ── Thread drill-down (hides top tabs for focused reading) ─────────────────
  if (view === 'threads' && selectedForum) {
    return (
      <div className={`${styles.screen} ${styles.slideIn}`} ref={scrollRef}>

        {/* Back header */}
        <div className={styles.threadHeader}>
          <button className={styles.backBtn} onClick={goBack}>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
              <path d="M6.5 1.5L1.5 7l5 5.5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={styles.threadHeaderInfo}>
            <div className={styles.threadHeaderAvatar} style={{ background: selectedForum.bg }}>
              {selectedForum.emoji}
            </div>
            <div className={styles.threadHeaderName}>{selectedForum.name}</div>
          </div>
          <div className={styles.followBtn}>Follow</div>
        </div>

        {/* Forum stats bar */}
        <div className={styles.forumStatBar}>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>{selectedForum.topics}</span>
            <span className={styles.forumStatLabel}>Topics</span>
          </div>
          <div className={styles.statDivider}/>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>{selectedForum.followers}</span>
            <span className={styles.forumStatLabel}>Followers</span>
          </div>
          <div className={styles.statDivider}/>
          <div className={styles.forumStatItem}>
            <span className={styles.forumStatNum}>#{selectedForum.rank}</span>
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

        {/* Threads */}
        <div className={styles.threadList}>
          {threads.map((t, i) => (
            <ThreadCard key={t.id} {...t}
              forumName={selectedForum.name}
              bg={t.bg || selectedForum.bg}
              emoji={t.emoji || selectedForum.emoji}
              delay={i * 0.06}
            />
          ))}
        </div>

        <div className={styles.spacer}/>
      </div>
    );
  }

  // ── Main screen (with top tabs) ────────────────────────────────────────────
  return (
    <div className={styles.screen} ref={scrollRef}>

      {/* ── Top navigation tabs ── */}
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
              <circle cx="6.5" cy="6.5" r="5" stroke="#8B95B0" strokeWidth="1.4"/>
              <path d="M10.5 10.5l3 3" stroke="#8B95B0" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input className={styles.searchInput} placeholder="Search forums..."
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            />
            {search && (
              <button className={styles.clearBtn} onClick={() => setSearch('')}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="#8B95B0" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className={styles.catScroll}>
            {FORUM_CATS.map(({ id, label }) => (
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
                  onClick={() => { setActiveSubCat(id); setVisibleCount(PAGE_SIZE); scrollTop(); }}
                >{label}</div>
              ))}
            </div>
          )}

          {/* Count */}
          <div className={styles.countRow}>
            <span className={styles.countText}>{filteredForums.length} Forum{filteredForums.length !== 1 ? 's' : ''}</span>
            {search.trim() && <span className={styles.searchTag}>for "{search}"</span>}
          </div>

          {/* Forum list */}
          <div className={styles.forumList}>
            {visibleForums.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔍</div>
                <div className={styles.emptyText}>No forums found</div>
                <div className={styles.emptySub}>Try a different search or category</div>
              </div>
            ) : visibleForums.map((forum, i) => (
              <div key={forum.id} className={styles.forumCard}
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => openForum(forum)}
              >
                <div className={styles.forumAvatar} style={{ background: forum.bg }}>{forum.emoji}</div>
                <div className={styles.forumBody}>
                  <div className={styles.forumNameRow}>
                    <span className={styles.forumName}>{forum.name}</span>
                    {forum.hot && <span className={styles.hotBadge}>🔥</span>}
                  </div>
                  <div className={styles.forumDesc}>{forum.description}</div>
                </div>
                <div className={styles.forumStats}>
                  <div className={styles.statCol}>
                    <span className={styles.statRank}>{forum.rankDisplay}</span>
                    <span className={styles.statLabel}>Rank</span>
                  </div>
                  <div className={styles.statDividerV}/>
                  <div className={styles.statCol}>
                    <span className={styles.statNum}>{forum.topics}</span>
                    <span className={styles.statLabel}>Topics</span>
                  </div>
                  <div className={styles.statDividerV}/>
                  <div className={styles.statCol}>
                    <span className={styles.statNum}>{forum.followers}</span>
                    <span className={styles.statLabel}>Flwrs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button className={styles.loadMore} onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
              Load More
            </button>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB: ALL TOPICS
      ════════════════════════════════════════════ */}
      {topTab === 'all-topics' && (
        <>
          <div className={styles.sortBar}>
            <div className={styles.sortLabel}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 2.5h10M3 6.5h7M4.5 10.5h4" stroke="var(--text2)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Sort by
            </div>
            <div className={styles.sortChips}>
              {SORT_TABS.map(({ id, label }) => (
                <div key={id}
                  className={`${styles.sortChip} ${sort === id ? styles.sortChipActive : ''}`}
                  onClick={() => { setSort(id); scrollTop(); }}
                >{label}</div>
              ))}
            </div>
          </div>

          <div className={styles.topicCount}>
            <span className={styles.countText}>{sortedTopics.length} Topics</span>
          </div>

          <div className={styles.topicFeed}>
            {sortedTopics.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔥</div>
                <div className={styles.emptyText}>No hot topics right now</div>
                <div className={styles.emptySub}>Check back soon!</div>
              </div>
            ) : sortedTopics.map((topic, i) => (
              <TopicCard key={topic.id} {...topic} delay={i * 0.04}/>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB: MY POSTS
      ════════════════════════════════════════════ */}
      {topTab === 'my-posts' && (
        <>
          <div className={styles.sortBar}>
            <div className={styles.sortLabel}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 2.5h10M3 6.5h7M4.5 10.5h4" stroke="var(--text2)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Sort by
            </div>
            <div className={styles.sortChips}>
              {SORT_TABS.slice(0,2).map(({ id, label }) => (
                <div key={id}
                  className={`${styles.sortChip} ${sort === id ? styles.sortChipActive : ''}`}
                  onClick={() => setSort(id)}
                >{label}</div>
              ))}
            </div>
          </div>

          <div className={styles.myPostsHeader}>
            <div className={styles.myPostsAvatar}>Y</div>
            <div>
              <div className={styles.myPostsName}>Your Posts</div>
              <div className={styles.myPostsSub}>{MY_POSTS.length} topics posted</div>
            </div>
          </div>

          <div className={styles.topicFeed}>
            {sortedMyPosts.map((topic, i) => (
              <TopicCard key={topic.id} {...topic} delay={i * 0.06}/>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB: MY WATCHED
      ════════════════════════════════════════════ */}
      {topTab === 'my-watched' && (
        <>
          <div className={styles.sortBar}>
            <div className={styles.sortLabel}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 2.5h10M3 6.5h7M4.5 10.5h4" stroke="var(--text2)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Sort by
            </div>
            <div className={styles.sortChips}>
              {SORT_TABS.slice(0,2).map(({ id, label }) => (
                <div key={id}
                  className={`${styles.sortChip} ${sort === id ? styles.sortChipActive : ''}`}
                  onClick={() => setSort(id)}
                >{label}</div>
              ))}
            </div>
          </div>

          <div className={styles.watchedHeader}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C4 2 1 8 1 8s3 6 7 6 7-6 7-6-3-6-7-6z"
                stroke="var(--brand)" strokeWidth="1.4" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2.5" stroke="var(--brand)" strokeWidth="1.4"/>
            </svg>
            <div>
              <div className={styles.watchedTitle}>Watched Topics</div>
              <div className={styles.watchedSub}>{MY_WATCHED.length} topics being watched</div>
            </div>
          </div>

          <div className={styles.topicFeed}>
            {sortedWatched.map((topic, i) => (
              <TopicCard key={topic.id} {...topic} delay={i * 0.06}/>
            ))}
          </div>
        </>
      )}

      <div className={styles.spacer}/>
    </div>
  );
}
