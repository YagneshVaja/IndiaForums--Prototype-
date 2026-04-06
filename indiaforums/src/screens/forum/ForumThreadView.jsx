import { useState, useMemo, useRef } from 'react';
import styles from './ForumThreadView.module.css';
import ThreadCard from '../../components/cards/ThreadCard';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { formatCount } from './forumHelpers';

export default function ForumThreadView({
  selectedForum, forumDetail, flairs,
  topics, topicsLoading, topicsLoadingMore,
  topicsError, topicsHasMore,
  loadMoreTopics, refreshTopics,
  onTopicPress,
}) {
  const [activeFlairId, setActiveFlairId] = useState(null);
  const [flairDropdownOpen, setFlairDropdownOpen] = useState(false);
  const scrollRef = useRef(null);

  const detail = forumDetail || selectedForum;

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

  const activeFlairLabel = useMemo(() => {
    if (activeFlairId == null) return 'All';
    return flairs.find(f => f.id === activeFlairId)?.name || 'All';
  }, [activeFlairId, flairs]);

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
        <ErrorState message={topicsError} onRetry={refreshTopics} />
      )}

      {/* Topics list */}
      {!topicsLoading && !topicsError && (
        <div className={styles.threadList}>
          {topicCards.length === 0 ? (
            <EmptyState icon="📭" title="No topics yet" subtitle="Be the first to start a discussion!" />
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
