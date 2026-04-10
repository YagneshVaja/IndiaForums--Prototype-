import { useState, useMemo } from 'react';
import styles from './AllTopicsView.module.css';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import SocialEmbed, { detectPlatform } from '../../components/ui/SocialEmbed';
import { formatCount } from './forumHelpers';

/** Extract all social-media URLs from text + linkTypeValue */
function extractSocialUrls(topic) {
  const urls = new Set();
  // Primary: linkTypeValue from the API
  if (topic.linkTypeValue && detectPlatform(topic.linkTypeValue)) {
    urls.add(topic.linkTypeValue);
  }
  // Secondary: URLs found in the description text
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const matches = topic.description?.match(urlRegex) || [];
  matches.forEach(u => {
    const cleaned = u.replace(/[.,;:!?]+$/, '');
    if (detectPlatform(cleaned)) urls.add(cleaned);
  });
  return [...urls];
}

function TopicRow({ topic, viewMode, onPress }) {
  const [expanded, setExpanded] = useState(false);
  const isDetailed = viewMode === 'detailed';
  const socialUrls = useMemo(() => extractSocialUrls(topic), [topic]);

  // Strip social URLs from description so they render as embeds instead of raw text
  const cleanDesc = useMemo(() => {
    if (!topic.description) return '';
    const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
    return topic.description.replace(urlRegex, (match) => {
      const cleaned = match.replace(/[.,;:!?]+$/, '');
      return detectPlatform(cleaned) ? '' : match;
    }).replace(/\s{2,}/g, ' ').trim();
  }, [topic.description]);

  const hasDesc = isDetailed && cleanDesc;
  const longDesc = cleanDesc.length > 120;
  const hasEmbeds = socialUrls.length > 0;

  return (
    <div className={styles.topicCard} onClick={() => onPress?.(topic)}>
      <div className={styles.cardContent}>
        {/* Header: avatar + forum name + posted by */}
        <div className={styles.topicHeader}>
          {topic.forumThumbnail ? (
            <img src={topic.forumThumbnail} alt="" className={styles.forumAvatar} loading="lazy" decoding="async" />
          ) : (
            <div className={styles.forumAvatarFallback}>
              {topic.forumName?.charAt(0)?.toUpperCase() || 'F'}
            </div>
          )}
          <div className={styles.headerInfo}>
            <span className={styles.forumName}>{topic.forumName}</span>
          </div>
        </div>

        {/* Title */}
        <div className={styles.topicTitle}>{topic.title}</div>

        {/* Posted by */}
        <div className={styles.postedBy}>
          Posted by: <strong>{topic.poster}</strong> · {topic.time}
        </div>

        {/* Description (detailed view only) */}
        {hasDesc && (
          <div className={styles.topicDescWrap}>
            <div className={`${styles.topicDesc} ${expanded ? styles.topicDescExpanded : ''}`}>
              {cleanDesc}
            </div>
            {longDesc && (
              <button
                className={styles.expandBtn}
                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              >
                {expanded ? 'Collapse' : 'Expand'} <span className={styles.expandArrow}>{expanded ? '\u25B2' : '\u25BC'}</span>
              </button>
            )}
          </div>
        )}

        {/* Social embeds — always visible inline when present */}
        {isDetailed && hasEmbeds && (
          <div className={styles.embedSection}>
            {socialUrls.map(url => (
              <div key={url} className={styles.embedItem} onClick={e => e.stopPropagation()}>
                <SocialEmbed url={url} />
              </div>
            ))}
          </div>
        )}

        {/* Topic image */}
        {isDetailed && topic.topicImage && (
          <div className={styles.topicImageWrap}>
            <img src={topic.topicImage} alt="" className={styles.topicImage} loading="lazy" decoding="async" />
          </div>
        )}

        {/* Bottom stats row */}
        <div className={styles.bottomRow}>
          <div className={styles.statsLeft}>
            {/* Thumbs up */}
            <span className={styles.stat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 22V11l5-9 1.5 1L12 7h8a2 2 0 012 2v2a6 6 0 01-.3 1.8l-2.4 6A2 2 0 0117.4 20H7z"/>
                <path d="M2 11h3v11H2z"/>
              </svg>
              {formatCount(topic.likes)}
            </span>
            {/* Views */}
            <span className={styles.stat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {formatCount(topic.views)}
            </span>
            {/* Comments */}
            <span className={styles.stat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              {formatCount(topic.replies)}
            </span>
            {/* Share */}
            <span className={styles.stat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </span>
          </div>
          {topic.lastBy && (
            <div className={styles.lastReply}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/>
              </svg>
              <span>{topic.lastTime} by {topic.lastBy}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  function handleTopicPress(t) {
    onTopicPress?.({
      ...t,
      forumBg: 'linear-gradient(135deg,#1e3a5e,#2563eb)',
      forumEmoji: '💬',
    });
  }

  return (
    <>
      {/* ── Sort & view bar ──────────────────────────────────────────── */}
      <div className={styles.topicSortBar}>
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

        <div className={styles.topicSortRight}>
          {!allTopicsLoading && (
            <span className={styles.topicSortCount}>{formatCount(allTopicsTotal)} topics</span>
          )}
          <div className={styles.viewToggleGroup}>
            <button
              className={`${styles.viewToggle} ${viewMode === 'detailed' ? styles.viewToggleActive : ''}`}
              onClick={() => setViewMode('detailed')}
              title="Detailed view"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <rect x="1.5" y="1.5" width="13" height="3.5" rx="1"/>
                <rect x="1.5" y="7.5" width="13" height="3.5" rx="1"/>
                <line x1="1.5" y1="14" x2="14.5" y2="14"/>
              </svg>
            </button>
            <button
              className={`${styles.viewToggle} ${viewMode === 'compact' ? styles.viewToggleActive : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact view"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="1.5" y1="3" x2="14.5" y2="3"/>
                <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
                <line x1="1.5" y1="10" x2="14.5" y2="10"/>
                <line x1="1.5" y1="13.5" x2="14.5" y2="13.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {allTopicsLoading && (
        <div className={styles.topicList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonHeader}>
                  <div className={styles.skeletonAvatarSm} />
                  <div className={styles.skeletonHeaderLines}>
                    <div className={styles.skeletonLine} style={{ width: '40%' }} />
                  </div>
                </div>
                <div className={styles.skeletonLine} style={{ width: '90%', height: 13 }} />
                <div className={styles.skeletonLine} style={{ width: '55%' }} />
                <div className={styles.skeletonLine} style={{ width: '70%' }} />
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
        <div className={styles.topicList}>
          {sortedAllTopics.length === 0 ? (
            <EmptyState icon="📭" title="No topics yet" />
          ) : sortedAllTopics.map(t => (
            <TopicRow key={t.id} topic={t} viewMode={viewMode} onPress={handleTopicPress} />
          ))}

          {allTopicsLoadingMore && Array.from({ length: 3 }).map((_, i) => (
            <div key={`atlm-${i}`} className={styles.skeletonCard}>
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonHeader}>
                  <div className={styles.skeletonAvatarSm} />
                  <div className={styles.skeletonHeaderLines}>
                    <div className={styles.skeletonLine} style={{ width: '40%' }} />
                  </div>
                </div>
                <div className={styles.skeletonLine} style={{ width: '80%', height: 13 }} />
                <div className={styles.skeletonLine} style={{ width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {allTopicsHasMore && !allTopicsLoadingMore && !allTopicsLoading && (
        <button className={styles.loadMore} onClick={loadMoreAllTopics}>
          Load More Topics
        </button>
      )}
    </>
  );
}
