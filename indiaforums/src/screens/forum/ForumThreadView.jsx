import { useState, useMemo, useRef, useEffect } from 'react';
import styles from './ForumThreadView.module.css';
import ThreadCard from '../../components/cards/ThreadCard';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import NewTopicComposer from '../../components/forum/NewTopicComposer';
import ForumTopicSettingsSheet from '../../components/forum/ForumTopicSettingsSheet';
import { formatCount } from './forumHelpers';
import { search, CONTENT_TYPE } from '../../services/searchApi';
import { timeAgo } from '../../services/api';

// Map a topic result from GET /search?contentType=8 → ThreadCard-compatible shape
function mapSearchResult(r, forum) {
  return {
    id:          r.topicId ?? r.id ?? Math.random(),
    title:       r.subject ?? r.title ?? '',
    description: r.topicDesc ?? r.description ?? r.snippet ?? '',
    poster:      r.startThreadUserName ?? r.poster ?? r.author ?? '',
    time:        r.startThreadDate ? timeAgo(r.startThreadDate) : (r.time ?? ''),
    replies:     r.replyCount ?? r.replies ?? 0,
    views:       r.viewCount  ?? r.views   ?? 0,
    likes:       r.likeCount  ?? r.likes   ?? 0,
    locked:      r.locked     ?? false,
    pinned:      (r.priority ?? 0) > 0,
    lastBy:      r.lastThreadUserName ?? r.lastBy ?? '',
    lastTime:    r.lastThreadDate ? timeAgo(r.lastThreadDate) : (r.lastTime ?? ''),
    tags:        r.tags ?? [],
    topicImage:  r.topicImage ?? null,
    forumName:   forum?.name ?? '',
    forumBg:     forum?.bg   ?? 'linear-gradient(135deg,#1e3a5e,#2563eb)',
    forumEmoji:  forum?.emoji ?? '💬',
    ago:         r.startThreadDate ? timeAgo(r.startThreadDate) : (r.time ?? ''),
    comments:    r.replyCount ?? r.replies ?? 0,
  };
}

export default function ForumThreadView({
  selectedForum, forumDetail, flairs,
  topics, topicsLoading, topicsLoadingMore,
  topicsError, topicsHasMore,
  loadMoreTopics, refreshTopics,
  onTopicPress,
}) {
  const [activeFlairId, setActiveFlairId] = useState(null);
  const [flairDropdownOpen, setFlairDropdownOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // null  = not searching | []+ = live API results | 'fallback' = use client-side
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const scrollRef = useRef(null);

  const detail = forumDetail || selectedForum;
  const forumId = selectedForum?.id ?? forumDetail?.forumId ?? null;
  const hasModerationRights = detail &&
    (detail.priorityPosts > 0 || detail.editPosts > 0 || detail.deletePosts > 0);

  // ── Live search with 350 ms debounce ──────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults(null); setSearchLoading(false); return; }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await search({
          query:       q,
          contentType: CONTENT_TYPE.TOPIC,
          forumId,
          pageSize:    30,
        });
        const raw = res.data?.results ?? res.data?.topics ?? [];
        setSearchResults(
          Array.isArray(raw) ? raw.map(r => mapSearchResult(r, selectedForum)) : 'fallback'
        );
      } catch {
        // Backend contentType=8 currently 500s — silently fall back to client-side filter
        setSearchResults('fallback');
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, forumId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Topic card list ───────────────────────────────────────────────────────
  const topicCards = useMemo(() => {
    // Live search returned API results — use them directly
    if (Array.isArray(searchResults)) return searchResults;

    // Map base topics
    const mapped = topics.map(t => ({
      ...t,
      forumName:  t.forumName  || selectedForum?.name || '',
      forumBg:    selectedForum?.bg    || 'linear-gradient(135deg,#1e3a5e,#2563eb)',
      forumEmoji: selectedForum?.emoji || '💬',
      ago:        t.time,
      comments:   t.replies,
    }));

    let filtered = activeFlairId == null ? mapped : mapped.filter(t => t.flairId === activeFlairId);

    // Client-side filter: used when search fallback triggered OR as default behaviour
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.poster?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [searchResults, topics, selectedForum, activeFlairId, searchQuery]);

  const activeFlairLabel = useMemo(() => {
    if (activeFlairId == null) return 'All';
    return flairs.find(f => f.id === activeFlairId)?.name || 'All';
  }, [activeFlairId, flairs]);

  return (
    <div className={`${styles.shell} ${styles.slideIn}`}>
    <div className={styles.screen} ref={scrollRef}>

      {/* Forum banner */}
      {detail.bannerUrl && (
        <div className={styles.forumBanner}>
          <img src={detail.bannerUrl} alt="" className={styles.forumBannerImg} decoding="async" />
        </div>
      )}

      {/* Forum identity */}
      <div className={styles.forumIdentity}>
        <div className={styles.forumIdentityAvatar} style={{ background: detail.bg }}>
          {detail.thumbnailUrl
            ? <img src={detail.thumbnailUrl} alt="" className={styles.forumAvatarImg} decoding="async" />
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
        {hasModerationRights && (
          <button
            className={styles.gearBtn}
            onClick={() => setSettingsOpen(true)}
            aria-label="Topic settings"
            title="Topic settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        )}
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

      {/* Search section */}
      <div className={styles.searchSection}>
        <div className={styles.searchWrap}>
          {searchLoading ? (
            <span className={styles.searchSpinner} aria-hidden="true" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5" stroke="var(--text3)" strokeWidth="1.4"/>
              <path d="M10.5 10.5l3 3" stroke="var(--text3)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          )}
          <input
            className={styles.searchInput}
            placeholder="Search topics…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.clearBtn} onClick={() => { setSearchQuery(''); setSearchResults(null); }} aria-label="Clear search">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          )}
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
          {!topicsLoading && !searchLoading && (
            <span className={styles.flairTopicCount}>
              {searchQuery.trim()
                ? `${topicCards.length} result${topicCards.length !== 1 ? 's' : ''}`
                : `${topicCards.length} topic${topicCards.length !== 1 ? 's' : ''}`
              }
            </span>
          )}
          <button className={styles.newTopicBtn} onClick={() => setComposerOpen(true)}>
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
        <ErrorState message={topicsError} onRetry={refreshTopics} />
      )}

      {/* Topics list */}
      {!topicsLoading && !topicsError && (
        <div className={styles.threadList}>
          {topicCards.length === 0 ? (
            <EmptyState
              icon={searchQuery.trim() ? '🔍' : '📭'}
              title={searchQuery.trim() ? 'No results found' : 'No topics yet'}
              subtitle={searchQuery.trim() ? `Nothing matched "${searchQuery.trim()}"` : 'Be the first to start a discussion!'}
            />
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
                delay={Math.min(i * 0.04, 0.28)}
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

      {composerOpen && (
        <NewTopicComposer
          forum={detail}
          flairs={flairs}
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            refreshTopics?.();
          }}
        />
      )}
      {settingsOpen && (
        <ForumTopicSettingsSheet
          forumDetail={detail}
          topics={topicCards}
          selectedForum={selectedForum}
          onClose={() => setSettingsOpen(false)}
          onActionComplete={() => refreshTopics?.()}
        />
      )}
    </div>
  );
}
